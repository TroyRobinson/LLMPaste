// NOTE: All LLM API logic must be handled via llm.js. Do not call LLM APIs directly here.
// When the popup HTML has loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM loaded');
  
  // Get DOM elements
  const replacementTextarea = document.getElementById('replacementText');
  const modelNameDisplay = document.getElementById('modelName');
  const activeModelContainer = document.getElementById('activeModel');
  const showShortcutsLink = document.getElementById('showShortcuts');
  const shortcutsInfo = document.getElementById('shortcutsInfo');
  
  // Debug element references
  console.log('Model name display element:', modelNameDisplay);
  console.log('Active model container:', activeModelContainer);
  
  // Current active slot (1-5)
  let activeSlot = 1;
  
  // Load model data immediately - pre-load before waiting for functions
  chrome.storage.sync.get([
    'modelSlot1Provider', 'modelSlot1Model',
  ], (data) => {
    console.log('Initial model data load:', data);
    
    if (modelNameDisplay && data.modelSlot1Provider && data.modelSlot1Model) {
      const displayName = data.modelSlot1Model.includes('/') ? 
        data.modelSlot1Model.split('/')[1] : data.modelSlot1Model;
      
      modelNameDisplay.textContent = `${displayName} (${data.modelSlot1Provider})`;
      console.log('Set initial model display text:', modelNameDisplay.textContent);
    } else {
      console.log('Could not set initial model display, using placeholder');
      if (modelNameDisplay) {
        modelNameDisplay.textContent = 'Default model';
      }
    }
  });
  
  // Load active model info
  function loadActiveModelInfo() {
    // First check if we have a locally stored active slot
    chrome.storage.local.get(['activeModelSlot', 'activeModelProvider', 'activeModelName'], (localData) => {
      // If we have local data, use that slot
      if (localData.activeModelSlot) {
        activeSlot = localData.activeModelSlot;
        console.log(`Found active slot in local storage: ${activeSlot}`);
      }
      
      // Now load all model slot data
      chrome.storage.sync.get([
        'modelSlot1Provider',
        'modelSlot1Model',
        'modelSlot2Provider',
        'modelSlot2Model',
        'modelSlot3Provider',
        'modelSlot3Model',
        'modelSlot4Provider',
        'modelSlot4Model',
        'modelSlot5Provider',
        'modelSlot5Model'
      ], (data) => {
        // Update the model name based on the active slot
        console.log(`Updating display for slot: ${activeSlot}`);
        updateModelDisplay(data, activeSlot);
      });
    });
  }
  
  // Update the model display with the appropriate slot info
  function updateModelDisplay(data, slotNum) {
    console.log(`updateModelDisplay called with slotNum: ${slotNum}`, data);
    
    // When loading full data set vs specific slot data
    let provider, model;
    
    if (data[`modelSlot${slotNum}Provider`]) {
      // Full data set from initial load
      provider = data[`modelSlot${slotNum}Provider`];
      model = data[`modelSlot${slotNum}Model`];
    } else {
      // Data from specific slot query
      provider = data.modelSlot1Provider || data.modelSlot2Provider || 
                 data.modelSlot3Provider || data.modelSlot4Provider || 
                 data.modelSlot5Provider || 'openrouter';
      model = data.modelSlot1Model || data.modelSlot2Model || 
              data.modelSlot3Model || data.modelSlot4Model || 
              data.modelSlot5Model || 'anthropic/claude-3-5-sonnet';
    }
    
    // Default values if still not set
    if (!provider) provider = 'openrouter';
    if (!model) model = 'anthropic/claude-3-5-sonnet';
    
    // Format the display name (show only model part after the slash if present)
    const displayName = model.includes('/') ? model.split('/')[1] : model;
    
    // Update the UI - each element separately to avoid issues
    try {
      // Set model name separately
      if (modelNameDisplay) {
        modelNameDisplay.textContent = `${displayName} (${provider})`;
        console.log('Updated model name display:', modelNameDisplay.textContent);
      } else {
        console.error('modelNameDisplay element not found');
      }
      
      // Update slot number separately
      const slotNumberDisplay = document.getElementById('slotNumber');
      if (slotNumberDisplay) {
        slotNumberDisplay.textContent = `(slot ${slotNum})`;
        console.log('Updated slot number display:', slotNumberDisplay.textContent);
      }
    } catch (error) {
      console.error('Error updating UI:', error);
    }
    
    // Store the active slot for content script to use
    chrome.storage.local.set({ 
      'activeModelSlot': slotNum,
      'activeModelName': model, // Store full model name
      'activeModelProvider': provider
    });
    
    console.log(`Updated model display: Slot ${slotNum}, Model: ${model}, Provider: ${provider}`);
  }
  
  // Get the current replacement word from storage
  chrome.storage.sync.get('replacementWord', (data) => {
    // Update the textarea with the current word
    replacementTextarea.value = data.replacementWord || 'cat';
  });
  
  // Load the active model info when popup opens
  loadActiveModelInfo();
  
  // Toggle shortcuts info visibility
  showShortcutsLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (shortcutsInfo.style.display === 'none') {
      shortcutsInfo.style.display = 'block';
      showShortcutsLink.textContent = 'Hide shortcuts';
    } else {
      shortcutsInfo.style.display = 'none';
      showShortcutsLink.textContent = 'Show shortcuts';
    }
  });
  
  // Add event listener for the save button
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.addEventListener('click', () => {
    // Save the new replacement text
    chrome.storage.sync.set({ 'replacementWord': replacementTextarea.value }, () => {
      // Show saved confirmation
      saveBtn.textContent = 'Saved!'; 
      setTimeout(() => {
        saveBtn.textContent = 'Save';
      }, 1000);
    });
  });
  
  // Handle key modifiers for model slot selection
  replacementTextarea.addEventListener('keydown', (e) => {
    // Update the active slot based on key modifiers
    if (e.key === 'Enter') {
      if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Shift+Enter = Slot 2
        activeSlot = 2;
        e.preventDefault();
        
        // Store the active slot for content script to use
        chrome.storage.local.set({ 'activeModelSlot': 2 });
        
        // Update UI to show active slot
        chrome.storage.sync.get([
          'modelSlot2Provider',
          'modelSlot2Model'
        ], (data) => {
          updateModelDisplay(data, 2);
          saveBtn.click();
        });
      } else if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        // Ctrl+Enter = Slot 3
        activeSlot = 3;
        e.preventDefault();
        
        // Store the active slot for content script to use
        chrome.storage.local.set({ 'activeModelSlot': 3 });
        
        chrome.storage.sync.get([
          'modelSlot3Provider',
          'modelSlot3Model'
        ], (data) => {
          updateModelDisplay(data, 3);
          saveBtn.click();
        });
      } else if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        // Alt/Option+Enter = Slot 4
        activeSlot = 4;
        e.preventDefault();
        
        // Store the active slot for content script to use
        chrome.storage.local.set({ 'activeModelSlot': 4 });
        
        chrome.storage.sync.get([
          'modelSlot4Provider',
          'modelSlot4Model'
        ], (data) => {
          updateModelDisplay(data, 4);
          saveBtn.click();
        });
      } else if (e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        // Command/Meta+Enter = Slot 5
        activeSlot = 5;
        e.preventDefault();
        
        // Store the active slot for content script to use
        chrome.storage.local.set({ 'activeModelSlot': 5 });
        
        chrome.storage.sync.get([
          'modelSlot5Provider',
          'modelSlot5Model'
        ], (data) => {
          updateModelDisplay(data, 5);
          saveBtn.click();
        });
      } else if (!e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Regular Enter = Slot 1 (default)
        activeSlot = 1;
        e.preventDefault();
        
        // Ensure we're using slot 1 (default)
        chrome.storage.local.set({ 'activeModelSlot': 1 });
        
        saveBtn.click();
      }
    }
  });
  
  // Add event listener for the options button
  const optionsBtn = document.getElementById('optionsBtn');
  optionsBtn.addEventListener('click', () => {
    // Open the options page when the button is clicked
    chrome.runtime.openOptionsPage();
  });
  
  // Store the active slot for content script to use
  function storeActiveSlot(slot) {
    chrome.storage.local.set({ 'activeModelSlot': slot });
  }
  
  // Define currentKeyModifier to track which key is being pressed
  let currentKeyModifier = null;
  
  // Add dedicated key down event listener to document for modifier keys
  document.addEventListener('keydown', (e) => {
    // Skip if textarea isn't in focus
    if (document.activeElement !== replacementTextarea) return;
    
    // Don't handle Enter key here (handled separately)
    if (e.key === 'Enter') return;
    
    // Handle shift key
    if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && currentKeyModifier !== 'shift') {
      currentKeyModifier = 'shift';
      console.log('Shift key pressed - previewing Slot 2');
      
      // Visual cue that slot is changing
      const slotNumberEl = document.getElementById('slotNumber');
      if (slotNumberEl) slotNumberEl.textContent = "(slot 2)";
      
      // Highlight that we're examining this slot
      if (modelNameDisplay) {
        // Save original style
        const originalStyle = modelNameDisplay.style.color;
        modelNameDisplay.style.color = '#4285f4'; // Blue
        
        chrome.storage.sync.get([
          'modelSlot2Provider', 'modelSlot2Model'
        ], (data) => {
          if (data.modelSlot2Model && data.modelSlot2Provider) {
            const displayName = data.modelSlot2Model.includes('/') ? 
              data.modelSlot2Model.split('/')[1] : data.modelSlot2Model;
            
            modelNameDisplay.textContent = `${displayName} (${data.modelSlot2Provider})`;
          } else {
            modelNameDisplay.textContent = "Shift: No model set";
          }
        });
      }
    } 
    // Handle ctrl key
    else if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && currentKeyModifier !== 'ctrl') {
      currentKeyModifier = 'ctrl';
      console.log('Ctrl key pressed - previewing Slot 3');
      
      const slotNumberEl = document.getElementById('slotNumber');
      if (slotNumberEl) slotNumberEl.textContent = "(slot 3)";
      
      if (modelNameDisplay) {
        modelNameDisplay.style.color = '#4285f4';
        
        chrome.storage.sync.get([
          'modelSlot3Provider', 'modelSlot3Model'
        ], (data) => {
          if (data.modelSlot3Model && data.modelSlot3Provider) {
            const displayName = data.modelSlot3Model.includes('/') ? 
              data.modelSlot3Model.split('/')[1] : data.modelSlot3Model;
            
            modelNameDisplay.textContent = `${displayName} (${data.modelSlot3Provider})`;
          } else {
            modelNameDisplay.textContent = "Ctrl: No model set";
          }
        });
      }
    } 
    // Handle alt key
    else if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey && currentKeyModifier !== 'alt') {
      currentKeyModifier = 'alt';
      console.log('Alt key pressed - previewing Slot 4');
      
      const slotNumberEl = document.getElementById('slotNumber');
      if (slotNumberEl) slotNumberEl.textContent = "(slot 4)";
      
      if (modelNameDisplay) {
        modelNameDisplay.style.color = '#4285f4';
        
        chrome.storage.sync.get([
          'modelSlot4Provider', 'modelSlot4Model'
        ], (data) => {
          if (data.modelSlot4Model && data.modelSlot4Provider) {
            const displayName = data.modelSlot4Model.includes('/') ? 
              data.modelSlot4Model.split('/')[1] : data.modelSlot4Model;
            
            modelNameDisplay.textContent = `${displayName} (${data.modelSlot4Provider})`;
          } else {
            modelNameDisplay.textContent = "Alt: No model set";
          }
        });
      }
    } 
    // Handle meta/command key
    else if (e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && currentKeyModifier !== 'meta') {
      currentKeyModifier = 'meta';
      console.log('Meta key pressed - previewing Slot 5');
      
      const slotNumberEl = document.getElementById('slotNumber');
      if (slotNumberEl) slotNumberEl.textContent = "(slot 5)";
      
      if (modelNameDisplay) {
        modelNameDisplay.style.color = '#4285f4';
        
        chrome.storage.sync.get([
          'modelSlot5Provider', 'modelSlot5Model'
        ], (data) => {
          if (data.modelSlot5Model && data.modelSlot5Provider) {
            const displayName = data.modelSlot5Model.includes('/') ? 
              data.modelSlot5Model.split('/')[1] : data.modelSlot5Model;
            
            modelNameDisplay.textContent = `${displayName} (${data.modelSlot5Provider})`;
          } else {
            modelNameDisplay.textContent = "Cmd: No model set";
          }
        });
      }
    }
  });
  
  // Reset to slot 1 display when key is released without pressing Enter
  document.addEventListener('keyup', (e) => {
    // Don't handle Enter key here (handled separately)
    if (e.key === 'Enter') return;
    
    // If all modifiers are released and no selection is made, reset to slot 1
    if (!e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      console.log('All modifier keys released - reverting to Slot 1');
      
      // Only reset if we were previewing but haven't committed
      if (currentKeyModifier !== null && activeSlot === 1) {
        currentKeyModifier = null;
        
        // Restore the original styling
        if (modelNameDisplay) {
          modelNameDisplay.style.color = ''; // Reset to default
        }
        
        // Update the slot display
        const slotNumberEl = document.getElementById('slotNumber');
        if (slotNumberEl) slotNumberEl.textContent = "(slot 1)";
        
        // Load the correct model for slot 1
        chrome.storage.sync.get([
          'modelSlot1Provider', 'modelSlot1Model'
        ], (data) => {
          if (data.modelSlot1Model && data.modelSlot1Provider) {
            const displayName = data.modelSlot1Model.includes('/') ? 
              data.modelSlot1Model.split('/')[1] : data.modelSlot1Model;
            
            if (modelNameDisplay) {
              modelNameDisplay.textContent = `${displayName} (${data.modelSlot1Provider})`;
            }
          }
        });
      }
    }
  });
}); 