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
  editorContainer.style.minWidth = '300px';
  
  // Add title
  const title = document.createElement('div');
  title.textContent = lastSelectedText ? 'LLMPaste - Transform Text' : 'LLMPaste - Insert Code';
  title.style.fontWeight = 'bold';
  title.style.fontSize = '14px';
  title.style.marginBottom = '2px';
  editorContainer.appendChild(title);
  
  // Add active model display
  const modelInfoContainer = document.createElement('div');
  modelInfoContainer.style.fontSize = '12px';
  modelInfoContainer.style.color = '#666';
  modelInfoContainer.style.marginBottom = '8px';
  modelInfoContainer.style.display = 'flex';
  modelInfoContainer.style.justifyContent = 'space-between';
  modelInfoContainer.style.padding = '4px 8px';
  modelInfoContainer.style.backgroundColor = '#f5f5f5';
  modelInfoContainer.style.borderRadius = '4px';
  
  // Left side - active model info
  const activeModelInfo = document.createElement('div');
  activeModelInfo.id = 'activeModelInfo';
  activeModelInfo.innerHTML = 'Active: <span id="activeModelName">Default model</span> <span id="activeModelSlot">(slot 1)</span>';
  modelInfoContainer.appendChild(activeModelInfo);
  
  // Middle - Alt mode toggle
  const altModeToggle = document.createElement('div');
  altModeToggle.id = 'altModeToggle';
  altModeToggle.style.marginLeft = '10px';
  altModeToggle.style.padding = '2px 6px';
  altModeToggle.style.borderRadius = '4px';
  altModeToggle.style.backgroundColor = '#e0e0e0';
  altModeToggle.style.color = '#666';
  altModeToggle.style.cursor = 'pointer';
  altModeToggle.style.fontSize = '11px';
  altModeToggle.innerHTML = 'ALT MODEL <span style="font-size:9px">OFF</span>';
  
  // Add alt toggle behavior
  let altModeActive = false;
  altModeToggle.addEventListener('click', () => {
    altModeActive = !altModeActive;
    fnKeyActive = altModeActive; // Update the Fn key simulation
    
    // Update visual appearance
    if (altModeActive) {
      altModeToggle.style.backgroundColor = '#ff5722';
      altModeToggle.style.color = 'white';
      altModeToggle.innerHTML = 'ALT MODEL <span style="font-size:9px">ON</span>';
      
      // Update preview based on current modifier key (if any)
      if (currentKeyModifier) {
        const slotNum = currentKeyModifier === 'shift' ? 2 : 
                      currentKeyModifier === 'ctrl' ? 3 :
                      currentKeyModifier === 'alt' ? 4 : 
                      currentKeyModifier === 'meta' ? 5 : 1;
        updatePreviewDisplay(slotNum, true);
      }
    } else {
      altModeToggle.style.backgroundColor = '#e0e0e0';
      altModeToggle.style.color = '#666';
      altModeToggle.innerHTML = 'ALT MODEL <span style="font-size:9px">OFF</span>';
      
      // Update preview based on current modifier key (if any)
      if (currentKeyModifier) {
        const slotNum = currentKeyModifier === 'shift' ? 2 : 
                      currentKeyModifier === 'ctrl' ? 3 :
                      currentKeyModifier === 'alt' ? 4 : 
                      currentKeyModifier === 'meta' ? 5 : 1;
        updatePreviewDisplay(slotNum, false);
      }
    }
  });
  modelInfoContainer.appendChild(altModeToggle);
  
  // Right side - shortcuts info
  const shortcutsInfo = document.createElement('div');
  shortcutsInfo.style.color = '#4285f4';
  shortcutsInfo.style.cursor = 'pointer';
  shortcutsInfo.textContent = 'Model shortcuts';
  shortcutsInfo.title = 'Shift+Enter: Slot 2, Ctrl+Enter: Slot 3, Option+Enter: Slot 4, Cmd+Enter: Slot 5. Click ALT MODEL for alternate slots (3-5 only).';
  
  // Add tooltip behavior
  shortcutsInfo.addEventListener('click', () => {
    const tooltipContent = `
      <div style="font-size: 11px; line-height: 1.4;">
        <div style="font-weight: bold; margin-bottom: 3px;">Model Selection:</div>
        <div>Enter: Slot 1 (default)</div>
        <div>Shift+Enter: Slot 2</div>
        <div>Ctrl+Enter: Slot 3</div>
        <div>Option+Enter: Slot 4</div>
        <div>Command+Enter: Slot 5</div>
        <div style="margin-top: 5px; margin-bottom: 3px;"><b>Alternate Models (slots 3-5 only):</b></div>
        <div>Specific combinations for alternate slots:</div>
        <div>- Shift+Ctrl+Enter: Slot 3 Alt</div>
        <div>- Shift+Option+Enter: Slot 4 Alt</div>
        <div>- Shift+Command+Enter: Slot 5 Alt</div>
        <div style="margin-top: 3px;"><i>Alternative method:</i></div>
        <div>Click ALT MODEL button, then use Ctrl/Option/Command+Enter</div>
      </div>
    `;
    
    // Check if tooltip already exists and remove it
    const existingTooltip = document.getElementById('model-shortcuts-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
      return;
    }
    
    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'model-shortcuts-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.right = '0';
    tooltip.style.top = '20px';
    tooltip.style.backgroundColor = 'white';
    tooltip.style.padding = '8px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    tooltip.style.zIndex = '9999999';
    tooltip.style.width = '180px';
    tooltip.innerHTML = tooltipContent;
    
    // Add to container
    modelInfoContainer.style.position = 'relative';
    modelInfoContainer.appendChild(tooltip);
    
    // Auto close after 5 seconds
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, 5000);
  });
  
  modelInfoContainer.appendChild(shortcutsInfo);
  editorContainer.appendChild(modelInfoContainer);
  
  // Update active model info from storage - always default to slot 1
  // First try to get slot 1 info directly
  chrome.storage.sync.get(['modelSlot1Provider', 'modelSlot1Model'], (slot1Data) => {
    const defaultProvider = slot1Data.modelSlot1Provider || 'openrouter';
    const defaultModel = slot1Data.modelSlot1Model || 'anthropic/claude-3-5-sonnet';
    
    // Get active model if exists, otherwise use slot 1
    chrome.storage.local.get(['activeModelSlot', 'activeModelName', 'activeModelProvider'], (data) => {
      const modelNameEl = document.getElementById('activeModelName');
      const modelSlotEl = document.getElementById('activeModelSlot');
      
      // If no active model is set or it's not slot 1, always show slot 1 initially
      const useSlot1 = !data.activeModelSlot || data.activeModelSlot === 1;
      
      if (modelNameEl) {
        // Format the display name (show only model part after the slash if present)
        let displayName;
        
        if (useSlot1) {
          displayName = defaultModel;
        } else {
          displayName = data.activeModelName || defaultModel;
        }
        
        if (displayName.includes('/')) {
          displayName = displayName.split('/')[1];
        }
        
        const provider = useSlot1 ? defaultProvider : (data.activeModelProvider || defaultProvider);
        modelNameEl.textContent = `${displayName} (${provider})`;
      }
      
      // Always show slot 1 as the initial active slot
      if (modelSlotEl) {
        modelSlotEl.textContent = `(slot ${useSlot1 ? 1 : data.activeModelSlot})`;
      }
      
      // Always make sure slot 1 is stored in local storage
      // so future requests default to slot 1 until explicitly changed
      if (!data.activeModelSlot) {
        chrome.storage.local.set({
          'activeModelSlot': 1,
          'activeModelAlt': false,
          'activeModelName': defaultModel,
          'activeModelProvider': defaultProvider
        });
        debugLog('Set initial slot to slot 1');
      }
    });
  });
  
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
          // Model slots
          'modelSlot1Provider', 'modelSlot1Model',
          'modelSlot2Provider', 'modelSlot2Model',
          'modelSlot3Provider', 'modelSlot3Model', 'modelSlot3AltProvider', 'modelSlot3AltModel',
          'modelSlot4Provider', 'modelSlot4Model', 'modelSlot4AltProvider', 'modelSlot4AltModel',
          'modelSlot5Provider', 'modelSlot5Model', 'modelSlot5AltProvider', 'modelSlot5AltModel',
          // Prompts
          'systemPrompt', 
          'insertSystemPrompt'
        ], async (data) => {
          if (chrome.runtime.lastError) {
            showNotification('Error accessing Chrome storage: ' + chrome.runtime.lastError.message);
            return;
          }
          try {
            // Check if there's an active model slot selected from the popup
            chrome.storage.local.get(['activeModelSlot', 'activeModelAlt', 'activeModelProvider', 'activeModelName'], async (slotData) => {
              const activeSlot = slotData.activeModelSlot || 1;
              const useAlt = slotData.activeModelAlt || false;
              debugLog('Using model slot:', activeSlot, useAlt ? '(alternate)' : '');
              
              // Get the provider and model from the active slot
              // First check if we have direct provider/model data from popup
              let slotProvider, slotModel;
              const altSuffix = useAlt ? 'Alt' : '';
              
              if (slotData.activeModelProvider && slotData.activeModelName) {
                debugLog('Using directly stored provider and model');
                slotProvider = slotData.activeModelProvider;
                
                // If the model name doesn't have a prefix, we need to reconstruct it
                debugLog(`Processing model name for slot ${activeSlot}${altSuffix}`);
                debugLog(`Active model name: "${slotData.activeModelName}"`);
                
                if (slotData.activeModelName && slotData.activeModelName.includes('/')) {
                  slotModel = slotData.activeModelName;
                  debugLog(`Using fully qualified model name: ${slotModel}`);
                } else {
                  // Check if we have the full model name from storage
                  const storageKey = `modelSlot${activeSlot}${altSuffix}Model`;
                  debugLog(`Looking up model from storage with key: ${storageKey}`);
                  slotModel = data[storageKey];
                  debugLog(`Storage lookup result: ${slotModel || 'not found'}`);
                  
                  // If we can't find the full model, use the name as is
                  if (!slotModel) {
                    slotModel = slotData.activeModelName || '';
                    debugLog(`Falling back to active model name: ${slotModel}`);
                  }
                }
              } else {
                // Fallback to getting from data using slot number
                slotProvider = data[`modelSlot${activeSlot}${altSuffix}Provider`];
                slotModel = data[`modelSlot${activeSlot}${altSuffix}Model`];
              }
              
              debugLog('Active model provider:', slotProvider);
              debugLog('Active model name:', slotModel);
              
              // If we have valid slot data, use it; otherwise fall back to default provider settings
              const provider = slotProvider || data.llmProvider || 'openrouter';
              let apiKey, model;
              
              if (slotModel) {
                // Use the model from the slot
                model = slotModel;
              }
              
              // Get API key based on provider - no more relying on provider-specific model defaults
              switch (provider) {
                case 'cerebras':
                  apiKey = data.cerebrasApiKey;
                  if (!apiKey) {
                    showNotification('Error: Cerebras API key not set. Please set it in options.');
                    return;
                  }
                  break;
                
                case 'groq':
                  apiKey = data.groqApiKey;
                  if (!apiKey) {
                    showNotification('Error: Groq API key not set. Please set it in options.');
                    return;
                  }
                  break;
                
                case 'sambanova':
                  apiKey = data.sambanovaApiKey;
                  if (!apiKey) {
                    showNotification('Error: SambaNova API key not set. Please set it in options.');
                    return;
                  }
                  break;
                
                case 'klusterai':
                  apiKey = data.klusteraiApiKey;
                  if (!apiKey) {
                    showNotification('Error: Kluster.ai API key not set. Please set it in options.');
                    return;
                  }
                  break;
                
                case 'lambdaai':
                  apiKey = data.lambdaaiApiKey;
                  if (!apiKey) {
                    showNotification('Error: Lambda.ai API key not set. Please set it in options.');
                    return;
                  }
                  break;
                
                case 'openrouter':
                default:
                  apiKey = data.openrouterApiKey;
                  if (!apiKey) {
                    showNotification('Error: OpenRouter API key not set. Please set it in options.');
                    return;
                  }
                  break;
              }
              
              // If no model was specified, use default
              if (!model) {
                model = 'anthropic/claude-3-5-sonnet'; // Default if nothing else is specified
              }
              
              debugLog(`Using provider: ${provider}, model: ${model}, slot: ${activeSlot}`);
              
              // Update loading notification to include model name
              if (window.currentLLMPasteLoadingNotification) {
                window.currentLLMPasteLoadingNotification.textContent = `${actionText} with model ${model}...`;
              }
              
              // Do NOT reset the active slot for storage - we just won't use it next time
              // Instead, we'll explicitly store slot 1 as the default for next time
              if (activeSlot > 1 || useAlt) {
                // Get slot 1 provider and model for future use
                const slot1Provider = data.modelSlot1Provider || 'openrouter';
                const slot1Model = data.modelSlot1Model || 'anthropic/claude-3-5-sonnet';
                
                // Store slot 1 as the active slot for next time
                chrome.storage.local.set({
                  'activeModelSlot': 1,
                  'activeModelAlt': false,
                  'activeModelName': slot1Model,
                  'activeModelProvider': slot1Provider
                });
                
                debugLog('Reset to slot 1 for next use:', slot1Provider, slot1Model);
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
            });
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
  
  // Track which modifier key is currently pressed
  let currentKeyModifier = null;
  
  // Update model slot display based on key presses
  function updateModelSlotDisplay(slotNum, useAlt = false) {
    const modelNameEl = document.getElementById('activeModelName');
    const modelSlotEl = document.getElementById('activeModelSlot');
    
    if (!modelNameEl || !modelSlotEl) return;
    
    // First update the slot number visually
    modelSlotEl.textContent = useAlt ? `(slot ${slotNum} alt)` : `(slot ${slotNum})`;
    
    // Then load the model data for that slot
    const altSuffix = useAlt ? 'Alt' : '';
    const providerKey = `modelSlot${slotNum}${altSuffix}Provider`;
    const modelKey = `modelSlot${slotNum}${altSuffix}Model`;
    
    debugLog(`Updating model slot display for slot ${slotNum}${useAlt ? ' alt' : ''}`);
    debugLog(`Looking up storage keys: ${providerKey}, ${modelKey}`);
    
    chrome.storage.sync.get([providerKey, modelKey], (data) => {
      debugLog(`Storage data for slot ${slotNum}${useAlt ? ' alt' : ''}:`, data);
      
      const provider = data[providerKey] || 'openrouter';
      const model = data[modelKey] || 'Default model';
      
      debugLog(`Provider: ${provider}, Model: ${model}`);
      
      // Format display name
      let displayName = model;
      if (displayName.includes('/')) {
        displayName = displayName.split('/')[1];
      }
      
      modelNameEl.textContent = `${displayName} (${provider})`;
      
      // Update storage for content script to use
      const storageData = {
        'activeModelSlot': slotNum,
        'activeModelAlt': useAlt,
        'activeModelName': model,
        'activeModelProvider': provider
      };
      
      debugLog(`Updating local storage with:`, storageData);
      
      chrome.storage.local.set(storageData, () => {
        if (chrome.runtime.lastError) {
          debugLog(`Error setting local storage: ${chrome.runtime.lastError.message}`);
        } else {
          debugLog(`Successfully updated model slot to ${slotNum}${useAlt ? ' alt' : ''}: ${model} (${provider})`);
        }
      });
    });
  }
  
  // Track the Fn key status (since there's no direct event for it)
  let fnKeyActive = false;
  
  // Special helper function to check for the Fn key
  // We'll use a workaround by checking for function keys like F1-F12
  document.addEventListener('keydown', (e) => {
    // If any function key is pressed, we'll assume Fn is active
    if (e.key && e.key.match(/^F[1-9][0-9]?$/)) {
      fnKeyActive = true;
      setTimeout(() => { fnKeyActive = false; }, 1000); // Reset after 1 second
    }
  });
  
  // Handle keydown events for modifier keys and Enter
  textarea.addEventListener('keydown', (e) => {
    // Handle Enter key for submission with modifiers
    if (e.key === 'Enter') {
      // Count active modifier keys for dual-key alt mode detection
      const modifierCount = (e.shiftKey ? 1 : 0) + (e.ctrlKey ? 1 : 0) + 
                           (e.altKey ? 1 : 0) + (e.metaKey ? 1 : 0);
      
      // Specific key combinations for alt slots
      // Only use specific combinations to avoid confusion
      if (modifierCount >= 2) {
        e.preventDefault();
        
        // Only specific combinations work for alt models
        if (e.shiftKey && e.ctrlKey && !e.altKey && !e.metaKey) {
          // Shift+Ctrl+Enter = Slot 3 Alt
          updateModelSlotDisplay(3, true);
          currentKeyModifier = 'shift+ctrl';
          replaceButton.click();
          return;
        } else if (e.shiftKey && e.altKey && !e.ctrlKey && !e.metaKey) {
          // Shift+Option/Alt+Enter = Slot 4 Alt
          updateModelSlotDisplay(4, true);
          currentKeyModifier = 'shift+alt';
          replaceButton.click();
          return;
        } else if (e.shiftKey && e.metaKey && !e.ctrlKey && !e.altKey) {
          // Shift+Command/Meta+Enter = Slot 5 Alt
          updateModelSlotDisplay(5, true);
          currentKeyModifier = 'shift+meta';
          replaceButton.click();
          return;
        }
        
        // Fall through to regular single-modifier handling if not a designated combo
      }
      
      // Use alternate models if ALT mode is active
      // No alt mode for slots 1 and 2 anymore
      // Ctrl+Enter in ALT mode = Slot 3 Alt
      else if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && altModeActive) {
        e.preventDefault();
        updateModelSlotDisplay(3, true);
        currentKeyModifier = 'alt+ctrl';
        replaceButton.click();
      }
      // Alt+Enter in ALT mode = Slot 4 Alt
      else if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey && altModeActive) {
        e.preventDefault();
        updateModelSlotDisplay(4, true);
        currentKeyModifier = 'alt+alt';
        replaceButton.click();
      }
      // Meta/Cmd+Enter in ALT mode = Slot 5 Alt
      else if (e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && altModeActive) {
        e.preventDefault();
        debugLog('Command+Enter in ALT mode - activating Slot 5 Alt');
        updateModelSlotDisplay(5, true);
        currentKeyModifier = 'alt+meta';
        replaceButton.click();
      }
      // With shift modifier = Slot 2
      else if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        updateModelSlotDisplay(2);
        currentKeyModifier = 'shift';
        replaceButton.click();
      }
      // With ctrl modifier = Slot 3
      else if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        updateModelSlotDisplay(3);
        currentKeyModifier = 'ctrl';
        replaceButton.click();
      }
      // With alt modifier = Slot 4
      else if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        e.preventDefault();
        updateModelSlotDisplay(4);
        currentKeyModifier = 'alt';
        replaceButton.click();
      }
      // With meta/cmd modifier = Slot 5
      else if (e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        updateModelSlotDisplay(5);
        currentKeyModifier = 'meta';
        replaceButton.click();
      }
      // No modifiers = default slot 1
      else if (!e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        updateModelSlotDisplay(1);
        replaceButton.click();
      }
    } 
    // Handle Escape key to close
    else if (e.key === 'Escape') {
      editorContainer.remove();
    }
    // For just holding modifier keys (preview without Enter)
    else {
      // Function to update the preview model display
      const updatePreviewDisplay = (slotNum, useAlt = false) => {
        const modelNameEl = document.getElementById('activeModelName');
        const modelSlotEl = document.getElementById('activeModelSlot');
        const altSuffix = useAlt ? 'Alt' : '';
        
        if (modelNameEl) {
          modelNameEl.style.color = useAlt ? '#ff5722' : '#4285f4'; // Orange for alt, blue for regular
        }
        
        if (modelSlotEl) {
          modelSlotEl.textContent = useAlt ? `(slot ${slotNum} alt)` : `(slot ${slotNum})`;
        }
        
        // Debug log to help diagnose issues
        debugLog(`Getting model for slot ${slotNum}${altSuffix}`);
        
        chrome.storage.sync.get([`modelSlot${slotNum}${altSuffix}Provider`, `modelSlot${slotNum}${altSuffix}Model`], (data) => {
          // Debug log data for easier diagnosis
          debugLog(`Model slot ${slotNum}${altSuffix} data:`, data);
          
          if (modelNameEl) {
            // If we have model data, use it; otherwise show a placeholder
            const modelData = data[`modelSlot${slotNum}${altSuffix}Model`];
            const providerData = data[`modelSlot${slotNum}${altSuffix}Provider`];
            
            if (modelData) {
              const displayName = modelData.includes('/') ? modelData.split('/')[1] : modelData;
              modelNameEl.textContent = `${displayName} (${providerData || 'openrouter'})`;
            } else {
              modelNameEl.textContent = `Not configured (slot ${slotNum}${useAlt ? ' alt' : ''})`;
            }
          }
        });
      };
      
      // Check if multiple modifier keys are pressed for alt model previews
      const modifierCount = (e.shiftKey ? 1 : 0) + (e.ctrlKey ? 1 : 0) + 
                           (e.altKey ? 1 : 0) + (e.metaKey ? 1 : 0);
      
      if (modifierCount >= 2) {
        // Only specific combinations work for alt models
        // Use the same logic for preview as for actual execution
        if (e.shiftKey && e.ctrlKey && !e.altKey && !e.metaKey) {
          // Shift+Ctrl = Slot 3 Alt
          if (currentKeyModifier !== 'shift+ctrl') {
            currentKeyModifier = 'shift+ctrl';
            updatePreviewDisplay(3, true);
          }
          return;
        } else if (e.shiftKey && e.altKey && !e.ctrlKey && !e.metaKey) {
          // Shift+Option/Alt = Slot 4 Alt
          if (currentKeyModifier !== 'shift+alt') {
            currentKeyModifier = 'shift+alt';
            updatePreviewDisplay(4, true);
          }
          return;
        } else if (e.shiftKey && e.metaKey && !e.ctrlKey && !e.altKey) {
          // Shift+Command/Meta = Slot 5 Alt
          if (currentKeyModifier !== 'shift+meta') {
            currentKeyModifier = 'shift+meta';
            updatePreviewDisplay(5, true);
          }
          return;
        }
        
        // Not a recognized combo, so don't show alt preview
        return;
      }
      
      // No alt mode preview for slots 1 and 2 anymore
      // In ALT mode with Ctrl = preview Slot 3 Alt
      else if (altModeActive && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && currentKeyModifier !== 'alt+ctrl') {
        currentKeyModifier = 'alt+ctrl';
        updatePreviewDisplay(3, true);
      }
      // In ALT mode with Alt key = preview Slot 4 Alt
      else if (altModeActive && e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey && currentKeyModifier !== 'alt+alt') {
        currentKeyModifier = 'alt+alt';
        updatePreviewDisplay(4, true);
      }
      // In ALT mode with Meta/Cmd = preview Slot 5 Alt
      else if (altModeActive && e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && currentKeyModifier !== 'alt+meta') {
        currentKeyModifier = 'alt+meta';
        updatePreviewDisplay(5, true);
      }
      // Just Shift = preview Slot 2
      else if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && !fnKeyActive && currentKeyModifier !== 'shift') {
        currentKeyModifier = 'shift';
        updatePreviewDisplay(2);
      }
      // Just Ctrl = preview Slot 3
      else if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && !fnKeyActive && currentKeyModifier !== 'ctrl') {
        currentKeyModifier = 'ctrl';
        updatePreviewDisplay(3);
      }
      // Just Alt = preview Slot 4
      else if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey && !fnKeyActive && currentKeyModifier !== 'alt') {
        currentKeyModifier = 'alt';
        updatePreviewDisplay(4);
      }
      // Just Meta/Cmd = preview Slot 5
      else if (e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !fnKeyActive && currentKeyModifier !== 'meta') {
        currentKeyModifier = 'meta';
        debugLog('Meta/Command key pressed - previewing Slot 5');
        updatePreviewDisplay(5);
      }
    }
  });
  
  // Reset when modifier keys are released
  textarea.addEventListener('keyup', (e) => {
    // Skip handling if Enter key (that's for submission)
    if (e.key === 'Enter') return;
    
    // Handle shift key being released specifically (for alt models)
    if (!e.shiftKey && (currentKeyModifier === 'shift+ctrl' || 
                        currentKeyModifier === 'shift+alt' || 
                        currentKeyModifier === 'shift+meta')) {
      // Determine which other key is still pressed
      let slotNum = 1;
      if (e.ctrlKey) slotNum = 3;
      else if (e.altKey) slotNum = 4;
      else if (e.metaKey) slotNum = 5;
      
      // Update to regular slot model
      currentKeyModifier = slotNum === 3 ? 'ctrl' : 
                          slotNum === 4 ? 'alt' : 
                          slotNum === 5 ? 'meta' : null;
      
      if (currentKeyModifier) {
        // Show regular slot
        const modelNameEl = document.getElementById('activeModelName');
        const modelSlotEl = document.getElementById('activeModelSlot');
        
        if (modelNameEl) modelNameEl.style.color = '#4285f4'; // Regular blue color
        if (modelSlotEl) modelSlotEl.textContent = `(slot ${slotNum})`;
        
        // Fetch model info for the regular slot
        chrome.storage.sync.get([`modelSlot${slotNum}Provider`, `modelSlot${slotNum}Model`], (data) => {
          if (modelNameEl && data[`modelSlot${slotNum}Model`]) {
            const displayName = data[`modelSlot${slotNum}Model`].includes('/') ? 
              data[`modelSlot${slotNum}Model`].split('/')[1] : data[`modelSlot${slotNum}Model`];
            modelNameEl.textContent = `${displayName} (${data[`modelSlot${slotNum}Provider`] || 'openrouter'})`;
          }
        });
      } else {
        // Reset if no other keys pressed
        const modelNameEl = document.getElementById('activeModelName');
        const modelSlotEl = document.getElementById('activeModelSlot');
        
        if (modelNameEl) {
          modelNameEl.style.color = ''; // Reset color
          
          // Re-fetch the default model info
          chrome.storage.local.get(['activeModelSlot', 'activeModelName', 'activeModelProvider'], (data) => {
            // If we have previously selected something, show that
            if (data.activeModelName) {
              let displayName = data.activeModelName;
              if (displayName.includes('/')) {
                displayName = displayName.split('/')[1];
              }
              modelNameEl.textContent = `${displayName} (${data.activeModelProvider || 'default'})`;
            } else {
              // Otherwise load slot 1 details
              chrome.storage.sync.get(['modelSlot1Provider', 'modelSlot1Model'], (slotData) => {
                if (slotData.modelSlot1Model) {
                  const displayName = slotData.modelSlot1Model.includes('/') ? 
                    slotData.modelSlot1Model.split('/')[1] : slotData.modelSlot1Model;
                  modelNameEl.textContent = `${displayName} (${slotData.modelSlot1Provider || 'openrouter'})`;
                }
              });
            }
          });
        }
        
        // Reset slot display
        if (modelSlotEl) {
          chrome.storage.local.get('activeModelSlot', (data) => {
            modelSlotEl.textContent = `(slot ${data.activeModelSlot || 1})`;
          });
        }
      }
      return;
    }
    
    // If all modifiers are released, reset display
    if (!e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && currentKeyModifier) {
      currentKeyModifier = null;
      
      const modelNameEl = document.getElementById('activeModelName');
      const modelSlotEl = document.getElementById('activeModelSlot');
      
      if (modelNameEl) {
        modelNameEl.style.color = ''; // Reset color
        
        // Re-fetch the default model info
        chrome.storage.local.get(['activeModelSlot', 'activeModelName', 'activeModelProvider'], (data) => {
          // If we have previously selected something, show that
          if (data.activeModelName) {
            let displayName = data.activeModelName;
            if (displayName.includes('/')) {
              displayName = displayName.split('/')[1];
            }
            modelNameEl.textContent = `${displayName} (${data.activeModelProvider || 'default'})`;
          } else {
            // Otherwise load slot 1 details
            chrome.storage.sync.get(['modelSlot1Provider', 'modelSlot1Model'], (slotData) => {
              if (slotData.modelSlot1Model) {
                const displayName = slotData.modelSlot1Model.includes('/') ? 
                  slotData.modelSlot1Model.split('/')[1] : slotData.modelSlot1Model;
                modelNameEl.textContent = `${displayName} (${slotData.modelSlot1Provider || 'openrouter'})`;
              }
            });
          }
        });
      }
      
      // Reset slot display
      if (modelSlotEl) {
        chrome.storage.local.get('activeModelSlot', (data) => {
          modelSlotEl.textContent = `(slot ${data.activeModelSlot || 1})`;
        });
      }
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