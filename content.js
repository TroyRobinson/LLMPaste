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

// Function to call OpenRouter API
async function callOpenRouter(promptText, selectedText, apiKey, model, systemPrompt) {
  debugLog('Calling OpenRouter with model:', model);
  
  try {
    let messages = [];
    
    // Add system message if a system prompt was provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    // Add the user message with prompt and selected text
    messages.push({
      role: 'user',
      content: `${promptText}\n\n${selectedText}`
    });
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/llmpaste',
        'X-Title': 'LLMPaste'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      debugLog('OpenRouter API error:', response.status, errorText);
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    debugLog('OpenRouter response:', data);
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content.trim();
    } else {
      throw new Error('Invalid response format from OpenRouter API');
    }
  } catch (error) {
    debugLog('Error in callOpenRouter:', error);
    throw error;
  }
}

// Function to show a temporary notification
function showNotification(message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.textContent = message;
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
  
  // Add to document
  document.body.appendChild(notification);
  
  // Remove after delay
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// Floating editor instance reference
let floatingEditorInstance = null;

// Show the floating editor for text replacement
function showFloatingEditor() {
  // Get selection
  const selection = window.getSelection();
  if (!selection || !selection.toString()) {
    showNotification('Select text first before using CutPaste');
    return;
  }
  
  // Store selected text and selection object for later use
  lastSelectedText = selection.toString();
  debugLog('Selected text:', lastSelectedText);
  
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
  title.textContent = 'LLMPaste';
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
        if (data && data.replacementWord) {
          textarea.value = data.replacementWord;
        }
        textarea.select();
      });
    } else {
      console.error('Chrome storage API not available');
      textarea.select();
    }
  } catch (error) {
    console.error('Error accessing chrome storage:', error);
    textarea.select();
  }
  
  editorContainer.appendChild(textarea);
  
  // Create buttons container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '10px';
  
  // Create replace button
  const replaceButton = document.createElement('button');
  replaceButton.textContent = 'Replace';
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
          console.log('Prompt text saved to storage');
        });
      }
    } catch (error) {
      console.error('Error saving to chrome storage:', error);
    }
    
    // Remove the editor first to restore focus
    editorContainer.remove();
    
    // Show a loading notification
    showNotification('Generating text with LLM...');
    
    // Get the selected text
    const selectedText = lastSelectedText;
    
    // Get API key, model, and system prompt from storage
    chrome.storage.sync.get(['openrouterApiKey', 'llmModel', 'systemPrompt'], async (data) => {
      try {
        const apiKey = data.openrouterApiKey;
        const model = data.llmModel || 'anthropic/claude-3-5-sonnet';
        const systemPrompt = data.systemPrompt || '';
        
        if (!apiKey) {
          showNotification('Error: OpenRouter API key not set. Please set it in options.');
          return;
        }
        
        // Call OpenRouter API with the system prompt
        const generatedText = await callOpenRouter(promptText, selectedText, apiKey, model, systemPrompt);
        
        // Perform replacement with the generated text
        performReplacement(generatedText);
      } catch (error) {
        console.error('Error calling OpenRouter:', error);
        showNotification('Error: ' + (error.message || 'Failed to generate text with LLM'));
      }
    });
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
  
  debugLog('Selection for replacement:', selection.toString());
  
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
        handleStandardSelection(selection, replacementText);
    }
    
    console.log('Replaced with LLM-generated text');
    // Show a shorter notification if the replaced text is long
    const displayText = replacementText.length > 30 
      ? replacementText.substring(0, 30) + '...' 
      : replacementText;
    showNotification(`Text replaced with LLM content: "${displayText}"`);
  } catch (error) {
    console.error('LLMPaste error:', error);
    // Try fallback approach
    debugLog('Attempting fallback approach');
    attemptFallbackApproach(selection, replacementText);
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'cutAndPaste') {
    debugLog('Message received to perform cutAndPaste');
    showFloatingEditor();
  }
});

// Also allow direct keyboard shortcut handling as a backup
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.shiftKey && event.key === 'O') {
    debugLog('Keyboard shortcut detected: Ctrl+Shift+O');
    event.preventDefault();
    showFloatingEditor();
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
  console.log('CutPaste activated - legacy method');
  showFloatingEditor();
}

// Handle Monaco editor (optimized for Utopia)
async function handleMonacoEditor(replacementWord) {
  debugLog('Handling Monaco editor');
  
  // 1. Cut the selected text - this works reliably
  document.execCommand('cut');
  debugLog('Cut executed via execCommand');
  
  // 2. Create and dispatch a paste event with the replacement word
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
  
  debugLog('Monaco container found:', !!monacoContainer);
  
  if (monacoContainer) {
    // Find the most likely target for paste events
    const target = monacoContainer.querySelector('[tabindex], textarea') || 
                   document.activeElement || 
                   monacoContainer;
    
    debugLog('Paste target:', target);
    
    // Focus and dispatch
    target.focus();
    const result = target.dispatchEvent(pasteEvent);
    debugLog('Paste event result:', result);
  } else if (document.activeElement) {
    // Fallback to active element
    debugLog('Using active element as paste target:', document.activeElement);
    document.activeElement.dispatchEvent(pasteEvent);
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

// Fallback approach when primary methods fail
async function attemptFallbackApproach(selection, replacementWord) {
  debugLog('Using fallback approach');
  
  // Try using execCommand
  if (document.execCommand) {
    debugLog('Trying execCommand fallback');
    document.execCommand('cut');
    document.execCommand('insertText', false, replacementWord);
  } else if (selection.rangeCount > 0) {
    // Last resort DOM manipulation
    debugLog('Trying direct DOM manipulation');
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(replacementWord));
  }
  
  showNotification(`Text replaced with: "${replacementWord}"`);
} 