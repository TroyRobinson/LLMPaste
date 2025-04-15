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

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'cutAndPaste') {
    debugLog('Message received to perform cutAndPaste');
    performCutAndPaste();
  }
});

// Also allow direct keyboard shortcut handling as a backup
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.shiftKey && event.key === 'O') {
    debugLog('Keyboard shortcut detected: Ctrl+Shift+O');
    event.preventDefault();
    performCutAndPaste();
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

// Main function to cut selected text and replace with configured word
async function performCutAndPaste() {
  console.log('CutPaste activated');
  
  const selection = window.getSelection();
  if (!selection || !selection.toString()) {
    console.log('No text selected');
    return;
  }
  
  // Store the selected text
  lastSelectedText = selection.toString();
  debugLog('Selected text:', lastSelectedText);
  
  // Get the active element and detect editor type
  const activeElement = document.activeElement;
  const editorType = detectEditorType(activeElement);
  console.log('Editor type:', editorType);
  
  // Get the replacement word from storage
  chrome.storage.sync.get('replacementWord', async (data) => {
    const replacementWord = data.replacementWord || 'cat';
    debugLog('Replacement word:', replacementWord);
    
    try {
      // Handle based on editor type
      switch (editorType) {
        case 'monaco':
          await handleMonacoEditor(replacementWord);
          break;
        
        case 'input':
          await handleStandardInput(activeElement, selection, replacementWord);
          break;
        
        case 'contenteditable':
          await handleContentEditable(selection, replacementWord);
          break;
        
        default:
          await handleStandardSelection(selection, replacementWord);
      }
      
      console.log('Replaced with:', replacementWord);
    } catch (error) {
      console.error('CutPaste error:', error);
      // Try fallback approach
      debugLog('Attempting fallback approach');
      await attemptFallbackApproach(selection, replacementWord);
    }
  });
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
} 