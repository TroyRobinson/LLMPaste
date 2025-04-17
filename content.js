// Store last selected text
let lastSelectedText = '';

// Set to true to enable verbose debug logging
const DEBUG = true;

// Helper function for conditional logging
function debugLog(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}

// Import callLLM from llm.js (dynamic import for Chrome extension compatibility)
let callLLM;
let llmReady = (async () => {
  const llmModule = await import(chrome.runtime.getURL('llm.js'));
  callLLM = llmModule.callLLM;
})();

// Usage: await callLLM({ promptText, selectedText, apiKey, model, systemPrompt })
// (See below for replacement of all callOpenRouter usages)

// Function to show a temporary notification
function showNotification(message, isLoading = false) {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.padding = '10px 15px';
  notification.style.background = '#4285f4';
  notification.style.color = 'white';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '9999999';
  notification.style.fontSize = '14px';
  notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  notification.style.display = 'flex';
  notification.style.alignItems = 'center';
  notification.style.gap = '10px';
  
  // Add spinner if loading
  if (isLoading) {
    const spinner = document.createElement('div');
    spinner.className = 'llmpaste-spinner';
    spinner.style.width = '16px';
    spinner.style.height = '16px';
    spinner.style.border = '3px solid rgba(255,255,255,0.3)';
    spinner.style.borderRadius = '50%';
    spinner.style.borderTopColor = 'white';
    spinner.style.animation = 'llmpasteSpinner 1s linear infinite';
    notification.appendChild(spinner);
    
    // Add the animation if it doesn't exist yet
    if (!document.getElementById('llmpaste-spinner-style')) {
      const style = document.createElement('style');
      style.id = 'llmpaste-spinner-style';
      style.textContent = `
        @keyframes llmpasteSpinner {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  // Add message
  const messageEl = document.createElement('span');
  messageEl.textContent = message;
  notification.appendChild(messageEl);
  
  // Store reference to remove it later if needed
  if (isLoading) {
    window.currentLLMPasteLoadingNotification = notification;
  }
  
  // Add to document
  document.body.appendChild(notification);
  
  // Remove after delay (only for non-loading notifications)
  if (!isLoading) {
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s';
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }
  
  return notification;
}

// Function to clear loading notification
function clearLoadingNotification() {
  if (window.currentLLMPasteLoadingNotification) {
    window.currentLLMPasteLoadingNotification.remove();
    window.currentLLMPasteLoadingNotification = null;
  }
}

// Floating editor instance reference
let floatingEditorInstance = null;

// Show the floating editor for text replacement
function showFloatingEditor() {
  // Get selection
  const selection = window.getSelection();
  
  // Allow empty selection for inserting code
  if (!selection) {
    showNotification('Cannot determine cursor position');
    return;
  }
  
  // Only update lastSelectedText if we haven't already captured it via clipboard
  if (!lastSelectedText || lastSelectedText.length === 0) {
    lastSelectedText = selection.toString();
  }
  debugLog('Selected text (FULL):', lastSelectedText);
  
  // Store the selection object for later use
  originalSelection = selection;
  
  // Clone the selection ranges to preserve them
  if (selection.rangeCount > 0) {
    const ranges = [];
    for (let i = 0; i < selection.rangeCount; i++) {
      ranges.push(selection.getRangeAt(i).cloneRange());
    }
    
    // Create a new selection object
    originalSelection = {
      toString: () => lastSelectedText,
      rangeCount: ranges.length,
      getRangeAt: (i) => ranges[i],
      removeAllRanges: () => {},
      addRange: () => {}
    };
  }
  
  // Remove any existing floating editor
  if (floatingEditorInstance) {
    floatingEditorInstance.remove();
  }
  
  // Create floating editor container
  const editorContainer = document.createElement('div');
  editorContainer.style.position = 'fixed';
  editorContainer.style.bottom = '20px';
  editorContainer.style.left = '50%';
  editorContainer.style.transform = 'translateX(-50%)';
  editorContainer.style.padding = '15px';
  editorContainer.style.backgroundColor = 'white';
  editorContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  editorContainer.style.borderRadius = '8px';
  editorContainer.style.zIndex = '9999999';
  editorContainer.style.display = 'flex';
  editorContainer.style.flexDirection = 'column';
  editorContainer.style.gap = '10px';
  editorContainer.style.minWidth = '250px';
  
  // Add title
  const title = document.createElement('div');
  title.textContent = lastSelectedText ? 'LLMPaste - Transform Text' : 'LLMPaste - Insert Code';
  title.style.fontWeight = 'bold';
  title.style.fontSize = '14px';
  title.style.marginBottom = '5px';
  editorContainer.appendChild(title);
  
  // Add close button
  const closeButton = document.createElement('div');
  closeButton.textContent = '×';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '10px';
  closeButton.style.right = '15px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.fontSize = '18px';
  closeButton.style.fontWeight = 'bold';
  closeButton.addEventListener('click', () => editorContainer.remove());
  editorContainer.appendChild(closeButton);
  
  // Create input field
  const textarea = document.createElement('textarea');
  textarea.style.width = '100%';
  textarea.style.minHeight = '60px';
  textarea.style.padding = '8px';
  textarea.style.borderRadius = '4px';
  textarea.style.border = '1px solid #ccc';
  textarea.style.fontSize = '14px';
  
  // Default value
  textarea.value = 'cat';
  
  // Try to load from storage - use try/catch to handle potential errors
  try {
    if (chrome && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get('replacementWord', (data) => {
        if (chrome.runtime.lastError) {
          showNotification('Error accessing Chrome storage: ' + chrome.runtime.lastError.message);
          textarea.select();
          return;
        }
        if (data && data.replacementWord) {
          textarea.value = data.replacementWord;
        }
        textarea.select();
      });
    } else {
      console.error('Chrome storage API not available');
      showNotification('Chrome storage API not available');
      textarea.select();
    }
  } catch (error) {
    console.error('Error accessing chrome storage:', error);
    showNotification('Extension context invalidated. Please reload the page or extension.');
    textarea.select();
  }
  
  editorContainer.appendChild(textarea);
  
  // Create buttons container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '10px';
  
  // Create replace/insert button
  const replaceButton = document.createElement('button');
  replaceButton.textContent = lastSelectedText ? 'Replace' : 'Insert';
  replaceButton.style.backgroundColor = '#34a853';
  replaceButton.style.color = 'white';
  replaceButton.style.border = 'none';
  replaceButton.style.borderRadius = '4px';
  replaceButton.style.padding = '8px 12px';
  replaceButton.style.cursor = 'pointer';
  replaceButton.style.fontSize = '14px';
  
  replaceButton.addEventListener('click', () => {
    // Capture the text value before doing anything else
    const promptText = textarea.value.trim() || 'cat';
    
    // Try to save to storage if available
    try {
      if (chrome && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ 'replacementWord': promptText }, () => {
          if (chrome.runtime.lastError) {
            showNotification('Error saving to Chrome storage: ' + chrome.runtime.lastError.message);
            return;
          }
          console.log('Prompt text saved to storage');
        });
      }
    } catch (error) {
      console.error('Error saving to chrome storage:', error);
      showNotification('Extension context invalidated. Please reload the page or extension.');
    }
    
    // Remove the editor first to restore focus
    editorContainer.remove();
    
    // Get the selected text (may be empty for insertion)
    const selectedText = lastSelectedText;
    
    // Show loading spinner while waiting for LLM response
    const actionText = selectedText ? 'Transforming selected text' : 'Creating text for insertion';
    showNotification(`${actionText} with LLM...`, true);
    
    // Get provider, API key, model, and appropriate system prompt from storage
    try {
      if (chrome && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get([
          'llmProvider',
          // API Keys
          'openrouterApiKey', 
          'cerebrasApiKey',
          'groqApiKey',
          'sambanovaApiKey',
          'klusteraiApiKey',
          'lambdaaiApiKey',
          // Models
          'openrouterModel', 
          'cerebrasModel',
          'groqModel',
          'sambanovaModel',
          'klusteraiModel',
          'lambdaaiModel',
          // Prompts
          'systemPrompt', 
          'insertSystemPrompt'
        ], async (data) => {
          if (chrome.runtime.lastError) {
            showNotification('Error accessing Chrome storage: ' + chrome.runtime.lastError.message);
            return;
          }
          try {
            // Determine which provider to use
            const provider = data.llmProvider || 'openrouter';
            
            // Get the appropriate API key and model based on provider
            let apiKey, model;
            
            switch (provider) {
              case 'cerebras':
                apiKey = data.cerebrasApiKey;
                model = data.cerebrasModel || 'llama3.1-8b';
                if (!apiKey) {
                  showNotification('Error: Cerebras API key not set. Please set it in options.');
                  return;
                }
                break;
              
              case 'groq':
                apiKey = data.groqApiKey;
                model = data.groqModel || 'llama-3.3-70b-versatile';
                if (!apiKey) {
                  showNotification('Error: Groq API key not set. Please set it in options.');
                  return;
                }
                break;
              
              case 'sambanova':
                apiKey = data.sambanovaApiKey;
                model = data.sambanovaModel || 'Llama-4-Maverick-17B-128E-Instruct';
                if (!apiKey) {
                  showNotification('Error: SambaNova API key not set. Please set it in options.');
                  return;
                }
                break;
              
              case 'klusterai':
                apiKey = data.klusteraiApiKey;
                model = data.klusteraiModel || 'klusterai/Meta-Llama-3.1-8B-Instruct-Turbo';
                if (!apiKey) {
                  showNotification('Error: Kluster.ai API key not set. Please set it in options.');
                  return;
                }
                break;
              
              case 'lambdaai':
                apiKey = data.lambdaaiApiKey;
                model = data.lambdaaiModel || 'llama-4-maverick-17b-128e-instruct-fp8';
                if (!apiKey) {
                  showNotification('Error: Lambda.ai API key not set. Please set it in options.');
                  return;
                }
                break;
              
              case 'openrouter':
              default:
                apiKey = data.openrouterApiKey;
                model = data.openrouterModel || 'anthropic/claude-3-5-sonnet';
                if (!apiKey) {
                  showNotification('Error: OpenRouter API key not set. Please set it in options.');
                  return;
                }
                break;
            }
            
            // Choose the appropriate system prompt based on whether text is selected
            const systemPrompt = selectedText 
              ? (data.systemPrompt || '') 
              : (data.insertSystemPrompt || '');
            debugLog('Using system prompt for:', selectedText ? 'transformation' : 'insertion');
            
            // Ensure llm.js is loaded before using callLLM
            await llmReady;
            
            // Call LLM API with the system prompt and provider
            const generatedText = await callLLM({ promptText, selectedText, apiKey, model, provider, systemPrompt });
            
            // Clear loading notification before performing replacement
            clearLoadingNotification();
            
            // Perform replacement with the generated text
            performReplacement(generatedText);
          } catch (error) {
            console.error('Error calling LLM API:', error);
            clearLoadingNotification();
            showNotification('Error: ' + (error.message || 'Failed to generate text with LLM'));
          }
        });
      } else {
        clearLoadingNotification();
        showNotification('Chrome storage API not available');
      }
    } catch (error) {
      console.error('Error accessing chrome storage:', error);
      clearLoadingNotification();
      showNotification('Extension context invalidated. Please reload the page or extension.');
    }
  });
  
  buttonContainer.appendChild(replaceButton);
  
  // Create cancel button
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.backgroundColor = '#f1f1f1';
  cancelButton.style.color = '#333';
  cancelButton.style.border = 'none';
  cancelButton.style.borderRadius = '4px';
  cancelButton.style.padding = '8px 12px';
  cancelButton.style.cursor = 'pointer';
  cancelButton.style.fontSize = '14px';
  
  cancelButton.addEventListener('click', () => {
    editorContainer.remove();
  });
  
  buttonContainer.appendChild(cancelButton);
  editorContainer.appendChild(buttonContainer);
  
  // Handle Enter key in textarea
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      replaceButton.click();
    } else if (e.key === 'Escape') {
      editorContainer.remove();
    }
  });
  
  // Add to page
  document.body.appendChild(editorContainer);
  
  // Focus the textarea
  setTimeout(() => textarea.focus(), 0);
  
  // Save reference
  floatingEditorInstance = editorContainer;
}

// Store original selection range to use later
let originalSelection = null;

// Perform text replacement with the provided replacement text
function performReplacement(replacementText) {
  // Try to use stored selection first, otherwise get current selection
  const selection = originalSelection || window.getSelection();
  originalSelection = null; // Clear after use
  
  if (!selection || (selection.rangeCount === 0)) {
    showNotification('Selection was lost - please try again');
    return;
  }
  
  // Use the lastSelectedText that was captured via clipboard rather than requerying selection
  // Get the active element or document.body as fallback
  const activeElement = document.activeElement || document.body;
  const editorType = detectEditorType(activeElement);
  console.log('Editor type:', editorType);
  
  try {
    // Handle based on editor type
    switch (editorType) {
      case 'monaco':
        handleMonacoEditor(replacementText);
        break;
      
      case 'input':
        handleStandardInput(activeElement, selection, replacementText);
        break;
      
      case 'contenteditable':
        handleContentEditable(selection, replacementText);
        break;
      
      default:
        // If no text is selected, just insert at cursor position
        if (selection.toString() === '') {
          handleTextInsertion(selection, replacementText);
        } else {
          handleStandardSelection(selection, replacementText);
        }
    }
    
    console.log('Replaced with LLM-generated text');
    // Show a shorter notification if the replaced text is long
    const displayText = replacementText.length > 30 
      ? replacementText.substring(0, 30) + '...' 
      : replacementText;
    
    // Modify notification text based on whether we're replacing or inserting
    const actionText = selection.toString() ? 'replaced' : 'inserted';
    showNotification(`Text ${actionText} with LLM content: "${displayText}"`);
  } catch (error) {
    console.error('LLMPaste error:', error);
    clearLoadingNotification();
    showNotification('Error applying text: ' + error.message);
    // Try fallback approach
    debugLog('Attempting fallback approach');
    attemptFallbackApproach(selection, replacementText);
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'cutAndPaste') {
    debugLog('Message received to perform cutAndPaste');
    captureSelectionViaClipboard().then(() => {
      showFloatingEditor();
    });
  }
});

// Function to capture selection text via clipboard
async function captureSelectionViaClipboard() {
  try {
    // Check if we have a selection
    const selection = window.getSelection();
    if (!selection) {
      debugLog('No selection available');
      return;
    }
    
    // Detect browser environment
    const isChrome = navigator.userAgent.indexOf('Chrome') > -1;
    const isEdge = navigator.userAgent.indexOf('Edg') > -1;
    
    // Copy the selection to clipboard
    document.execCommand('copy');
    
    // Adaptive delay - less for Chrome/Edge which tend to be faster
    const delay = isChrome || isEdge ? 75 : 150;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Read from clipboard - with timeout to prevent hanging
    const clipboardPromise = navigator.clipboard.readText();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Clipboard read timeout')), 500)
    );
    
    const clipboardText = await Promise.race([clipboardPromise, timeoutPromise]);
    debugLog('Clipboard capture: ' + clipboardText.length + ' characters');
    
    // Store the text for LLM processing
    if (clipboardText && clipboardText.length > 0) {
      lastSelectedText = clipboardText;
    }
  } catch (error) {
    debugLog('Clipboard capture failed: ' + error.message);
  }
}

// Also allow direct keyboard shortcut handling as a backup
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.shiftKey && event.key === 'O') {
    debugLog('Keyboard shortcut detected: Ctrl+Shift+O');
    event.preventDefault();
    captureSelectionViaClipboard().then(() => {
      showFloatingEditor();
    });
  }
  // New shortcut: Ctrl+Shift+I
  if (event.ctrlKey && event.shiftKey && (event.key === 'I' || event.key === 'i')) {
    debugLog('Keyboard shortcut detected: Ctrl+Shift+I');
    event.preventDefault();
    sendCtrlShiftRightArrowMultipleTimes(5);
  }
});

// Detect the type of editor we're dealing with
function detectEditorType(element) {
  if (!element) return 'standard';
  
  debugLog('Detecting editor type for:', element.tagName, element.className);
  
  // Check for Monaco editor (including Utopia)
  const hasMonacoClass = element.classList.contains('monaco-editor');
  const hasMonacoParent = element.closest('.monaco-editor');
  const hasMonacoGlobal = typeof window.monaco !== 'undefined';
  const hasMonacoInDOM = !!document.querySelector('.monaco-editor');
  const hasUtopiaMonaco = !!document.querySelector('.react-monaco-editor-container');
  
  if (hasMonacoClass || hasMonacoParent || hasMonacoGlobal || hasMonacoInDOM || hasUtopiaMonaco) {
    debugLog('Detected Monaco editor, indicators:', { hasMonacoClass, hasMonacoParent, hasMonacoGlobal, hasMonacoInDOM, hasUtopiaMonaco });
    return 'monaco';
  }
  
  // Check for standard inputs
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    debugLog('Detected standard input:', element.tagName);
    return 'input';
  }
  
  // Check for contenteditable
  if (element.getAttribute('contenteditable') === 'true') {
    debugLog('Detected contenteditable element');
    return 'contenteditable';
  }
  
  debugLog('No specific editor detected, using standard handler');
  return 'standard';
}

// Main function to cut selected text and replace with configured word - keeping for compatibility
async function performCutAndPaste() {
  console.log('LLMPaste activated - legacy method');
  showFloatingEditor();
}

// Handle Monaco editor
async function handleMonacoEditor(replacementWord) {
  debugLog('Handling Monaco editor replacement');
  
  try {
    // Cut the selected text
    document.execCommand('cut');
    
    // Create and dispatch a paste event with the replacement word
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', replacementWord);
    
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: clipboardData
    });
    
    // Find the Monaco editor container
    const monacoContainer = document.querySelector('.react-monaco-editor-container') || 
                          document.querySelector('.monaco-editor');
    
    // Target the appropriate element
    const target = monacoContainer ? 
                 monacoContainer.querySelector('[tabindex], textarea') || 
                 document.activeElement || 
                 monacoContainer :
                 document.activeElement;
    
    if (target) {
      target.focus();
      target.dispatchEvent(pasteEvent);
      debugLog('Replacement applied to editor');
    }
  } catch (error) {
    debugLog('Monaco replacement failed: ' + error.message);
    // Simple fallback
    document.execCommand('insertText', false, replacementWord);
  }
}

// Handle standard input elements
async function handleStandardInput(element, selection, replacementWord) {
  debugLog('Handling standard input:', element.tagName);
  
  const start = element.selectionStart;
  const end = element.selectionEnd;
  const currentValue = element.value;
  
  // Replace the selection
  element.value = currentValue.substring(0, start) + replacementWord + currentValue.substring(end);
  
  // Trigger input event for reactive frameworks
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  debugLog('Input/change events dispatched');
}

// Handle contenteditable elements
async function handleContentEditable(selection, replacementWord) {
  debugLog('Handling contenteditable element');
  
  const range = selection.getRangeAt(0);
  
  // Replace the selection
  range.deleteContents();
  const textNode = document.createTextNode(replacementWord);
  range.insertNode(textNode);
  
  // Update selection
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);
}

// Handle standard selection in normal web pages
async function handleStandardSelection(selection, replacementWord) {
  debugLog('Handling standard selection');
  
  const range = selection.getRangeAt(0);
  
  // Delete and replace
  range.deleteContents();
  const textNode = document.createTextNode(replacementWord);
  range.insertNode(textNode);
  
  // Update selection
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);
}

// Function to handle text insertion at cursor position
async function handleTextInsertion(selection, textToInsert) {
  debugLog('Handling text insertion at cursor position');
  
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    
    // Simply insert the text at cursor position
    const textNode = document.createTextNode(textToInsert);
    range.insertNode(textNode);
    
    // Update selection to be after the inserted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    debugLog('No valid range found for insertion');
  }
}

// Send Ctrl+Shift+RightArrow multiple times in quick succession
function sendCtrlShiftRightArrowMultipleTimes(times) {
  const activeElement = document.activeElement;
  if (!activeElement) return;

  let count = 0;
  function sendKey() {
    const keydown = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      code: 'ArrowRight',
      keyCode: 39,
      which: 39,
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true
    });
    const keyup = new KeyboardEvent('keyup', {
      key: 'ArrowRight',
      code: 'ArrowRight',
      keyCode: 39,
      which: 39,
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true
    });
    activeElement.dispatchEvent(keydown);
    activeElement.dispatchEvent(keyup);
    count++;
    if (count < times) {
      setTimeout(sendKey, 30); // 30ms between events for quick succession
    }
  }
  sendKey();
}

// Fallback approach when primary methods fail
async function attemptFallbackApproach(selection, replacementWord) {
  debugLog('Using fallback approach');
  
  try {
    // Try using execCommand
    if (document.execCommand) {
      debugLog('Trying execCommand fallback');
      
      // If selection is empty, just insert; otherwise cut and paste
      if (selection.toString() === '') {
        document.execCommand('insertText', false, replacementWord);
      } else {
        document.execCommand('cut');
        document.execCommand('insertText', false, replacementWord);
      }
    } else if (selection.rangeCount > 0) {
      // Last resort DOM manipulation
      debugLog('Trying direct DOM manipulation');
      const range = selection.getRangeAt(0);
      
      // If selection is empty, don't delete anything
      if (selection.toString() !== '') {
        range.deleteContents();
      }
      
      range.insertNode(document.createTextNode(replacementWord));
    }
    
    // Clear any loading notification that might still be showing
    clearLoadingNotification();
    showNotification(`Text replaced with: "${replacementWord}"`);
  } catch (error) {
    console.error('Fallback approach failed:', error);
    clearLoadingNotification();
    showNotification('All replacement methods failed. Please try again.');
  }
} 