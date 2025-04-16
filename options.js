// NOTE: All LLM API logic must be handled via llm.js. Do not call LLM APIs directly here.
// When the options page has loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get reference to the input fields and save button
  const promptInput = document.getElementById('replacementWord');
  const apiKeyInput = document.getElementById('openrouterApiKey');
  const modelInput = document.getElementById('llmModel');
  const systemPromptInput = document.getElementById('systemPrompt');
  const insertSystemPromptInput = document.getElementById('insertSystemPrompt');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');
  
  // Load current settings
  chrome.storage.sync.get(['replacementWord', 'openrouterApiKey', 'llmModel', 'systemPrompt', 'insertSystemPrompt'], (data) => {
    promptInput.value = data.replacementWord || 'cat';
    apiKeyInput.value = data.openrouterApiKey || '';
    
    // Set the model if it exists in storage
    if (data.llmModel) {
      modelInput.value = data.llmModel;
    } else {
      // Default to Claude 3.5 Sonnet
      modelInput.value = 'anthropic/claude-3-5-sonnet';
    }
    
    // Set the system prompt if it exists in storage
    if (data.systemPrompt) {
      systemPromptInput.value = data.systemPrompt;
    }
    
    // Set the insert system prompt if it exists in storage
    if (data.insertSystemPrompt) {
      insertSystemPromptInput.value = data.insertSystemPrompt;
    }
  });
  
  // Save settings when the button is clicked
  saveBtn.addEventListener('click', () => {
    const newPrompt = promptInput.value.trim() || 'cat';
    const apiKey = apiKeyInput.value.trim();
    const model = modelInput.value.trim() || 'anthropic/claude-3-5-sonnet';
    const systemPrompt = systemPromptInput.value.trim();
    const insertSystemPrompt = insertSystemPromptInput.value.trim();
    
    // Save to Chrome storage
    chrome.storage.sync.set({ 
      replacementWord: newPrompt,
      openrouterApiKey: apiKey,
      llmModel: model,
      systemPrompt: systemPrompt,
      insertSystemPrompt: insertSystemPrompt
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