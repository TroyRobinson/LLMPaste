// When the options page has loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get reference to the input fields and save button
  const promptInput = document.getElementById('replacementWord');
  const apiKeyInput = document.getElementById('openrouterApiKey');
  const modelSelect = document.getElementById('llmModel');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');
  
  // Load current settings
  chrome.storage.sync.get(['replacementWord', 'openrouterApiKey', 'llmModel'], (data) => {
    promptInput.value = data.replacementWord || 'cat';
    apiKeyInput.value = data.openrouterApiKey || '';
    
    // Set the model dropdown if it exists in storage
    if (data.llmModel) {
      modelSelect.value = data.llmModel;
    } else {
      // Default to Claude 3.5 Sonnet
      modelSelect.value = 'anthropic/claude-3-5-sonnet';
    }
  });
  
  // Save settings when the button is clicked
  saveBtn.addEventListener('click', () => {
    const newPrompt = promptInput.value.trim() || 'cat';
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;
    
    // Save to Chrome storage
    chrome.storage.sync.set({ 
      replacementWord: newPrompt,
      openrouterApiKey: apiKey,
      llmModel: model
    }, () => {
      // Show success message
      statusEl.classList.add('success');
      
      // Hide the message after 3 seconds
      setTimeout(() => {
        statusEl.classList.remove('success');
      }, 3000);
    });
  });
}); 