// NOTE: All LLM API logic must be handled via llm.js. Do not call LLM APIs directly here.
// When the options page has loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get reference to the input fields and save button
  const promptInput = document.getElementById('replacementWord');
  const providerSelect = document.getElementById('llmProvider');
  
  // API key inputs
  const openrouterApiKeyInput = document.getElementById('openrouterApiKey');
  const cerebrasApiKeyInput = document.getElementById('cerebrasApiKey');
  const groqApiKeyInput = document.getElementById('groqApiKey');
  const sambanovaApiKeyInput = document.getElementById('sambanovaApiKey');
  const klusteraiApiKeyInput = document.getElementById('klusteraiApiKey');
  const lambdaaiApiKeyInput = document.getElementById('lambdaaiApiKey');
  
  // Model inputs
  const openrouterModelInput = document.getElementById('openrouterModel');
  const cerebrasModelInput = document.getElementById('cerebrasModel');
  const groqModelInput = document.getElementById('groqModel');
  const sambanovaModelInput = document.getElementById('sambanovaModel');
  const klusteraiModelInput = document.getElementById('klusteraiModel');
  const lambdaaiModelInput = document.getElementById('lambdaaiModel');
  
  // Model slot inputs
  const modelSlot1Provider = document.getElementById('modelSlot1Provider');
  const modelSlot2Provider = document.getElementById('modelSlot2Provider');
  const modelSlot3Provider = document.getElementById('modelSlot3Provider');
  const modelSlot4Provider = document.getElementById('modelSlot4Provider');
  const modelSlot5Provider = document.getElementById('modelSlot5Provider');
  const modelSlot1Input = document.getElementById('modelSlot1');
  const modelSlot2Input = document.getElementById('modelSlot2');
  const modelSlot3Input = document.getElementById('modelSlot3');
  const modelSlot4Input = document.getElementById('modelSlot4');
  const modelSlot5Input = document.getElementById('modelSlot5');
  
  const systemPromptInput = document.getElementById('systemPrompt');
  const insertSystemPromptInput = document.getElementById('insertSystemPrompt');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');
  const providerFields = document.querySelectorAll('.provider-field');
  
  // Function to toggle provider-specific fields
  function toggleProviderFields(provider) {
    providerFields.forEach(field => {
      if (field.dataset.provider === provider) {
        field.style.display = 'block';
      } else {
        field.style.display = 'none';
      }
    });
  }
  
  // Handle provider selection change
  providerSelect.addEventListener('change', () => {
    toggleProviderFields(providerSelect.value);
  });
  
  // Load current settings
  chrome.storage.sync.get([
    'replacementWord', 
    'llmProvider',
    // API keys
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
    'insertSystemPrompt',
    // Model slots
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
    promptInput.value = data.replacementWord || 'cat';
    
    // Set provider if it exists, default to OpenRouter
    providerSelect.value = data.llmProvider || 'openrouter';
    toggleProviderFields(providerSelect.value);
    
    // Set API keys
    openrouterApiKeyInput.value = data.openrouterApiKey || '';
    cerebrasApiKeyInput.value = data.cerebrasApiKey || '';
    groqApiKeyInput.value = data.groqApiKey || '';
    sambanovaApiKeyInput.value = data.sambanovaApiKey || '';
    klusteraiApiKeyInput.value = data.klusteraiApiKey || '';
    lambdaaiApiKeyInput.value = data.lambdaaiApiKey || '';
    
    // Set models with defaults
    openrouterModelInput.value = data.openrouterModel || 'anthropic/claude-3-5-sonnet';
    cerebrasModelInput.value = data.cerebrasModel || 'llama3.1-8b';
    groqModelInput.value = data.groqModel || 'llama-3.3-70b-versatile';
    sambanovaModelInput.value = data.sambanovaModel || 'Llama-4-Maverick-17B-128E-Instruct';
    klusteraiModelInput.value = data.klusteraiModel || 'klusterai/Meta-Llama-3.1-8B-Instruct-Turbo';
    lambdaaiModelInput.value = data.lambdaaiModel || 'llama-4-maverick-17b-128e-instruct-fp8';
    
    // Set the system prompt if it exists in storage
    if (data.systemPrompt) {
      systemPromptInput.value = data.systemPrompt;
    }
    
    // Set the insert system prompt if it exists in storage
    if (data.insertSystemPrompt) {
      insertSystemPromptInput.value = data.insertSystemPrompt;
    }
    
    // Set model slots
    // Default slot 1 to the current provider and model
    modelSlot1Provider.value = data.modelSlot1Provider || data.llmProvider || 'openrouter';
    modelSlot1Input.value = data.modelSlot1Model || (
      modelSlot1Provider.value === 'openrouter' ? (data.openrouterModel || 'anthropic/claude-3-5-sonnet') :
      modelSlot1Provider.value === 'cerebras' ? (data.cerebrasModel || 'llama3.1-8b') :
      modelSlot1Provider.value === 'groq' ? (data.groqModel || 'llama-3.3-70b-versatile') :
      modelSlot1Provider.value === 'sambanova' ? (data.sambanovaModel || 'Llama-4-Maverick-17B-128E-Instruct') :
      modelSlot1Provider.value === 'klusterai' ? (data.klusteraiModel || 'klusterai/Meta-Llama-3.1-8B-Instruct-Turbo') :
      data.lambdaaiModel || 'llama-4-maverick-17b-128e-instruct-fp8'
    );
    
    // Set other slots with defaults
    modelSlot2Provider.value = data.modelSlot2Provider || 'openrouter';
    modelSlot2Input.value = data.modelSlot2Model || 'anthropic/claude-3-opus-20240229';
    
    modelSlot3Provider.value = data.modelSlot3Provider || 'openrouter';
    modelSlot3Input.value = data.modelSlot3Model || 'openai/gpt-4o';
    
    modelSlot4Provider.value = data.modelSlot4Provider || 'groq';
    modelSlot4Input.value = data.modelSlot4Model || 'llama-3.3-70b-versatile';
    
    modelSlot5Provider.value = data.modelSlot5Provider || 'openrouter';
    modelSlot5Input.value = data.modelSlot5Model || 'meta-llama/llama-3-70b-instruct';
  });
  
  // Save settings when the button is clicked
  saveBtn.addEventListener('click', () => {
    const newPrompt = promptInput.value.trim() || 'cat';
    const provider = providerSelect.value;
    
    // Get API keys
    const openrouterApiKey = openrouterApiKeyInput.value.trim();
    const cerebrasApiKey = cerebrasApiKeyInput.value.trim();
    const groqApiKey = groqApiKeyInput.value.trim();
    const sambanovaApiKey = sambanovaApiKeyInput.value.trim();
    const klusteraiApiKey = klusteraiApiKeyInput.value.trim();
    const lambdaaiApiKey = lambdaaiApiKeyInput.value.trim();
    
    // Get models with defaults
    const openrouterModel = openrouterModelInput.value.trim() || 'anthropic/claude-3-5-sonnet';
    const cerebrasModel = cerebrasModelInput.value.trim() || 'llama3.1-8b';
    const groqModel = groqModelInput.value.trim() || 'llama-3.3-70b-versatile';
    const sambanovaModel = sambanovaModelInput.value.trim() || 'Llama-4-Maverick-17B-128E-Instruct';
    const klusteraiModel = klusteraiModelInput.value.trim() || 'klusterai/Meta-Llama-3.1-8B-Instruct-Turbo';
    const lambdaaiModel = lambdaaiModelInput.value.trim() || 'llama-4-maverick-17b-128e-instruct-fp8';
    
    // Get model slots values
    const slot1Provider = modelSlot1Provider.value;
    const slot1Model = modelSlot1Input.value.trim();
    const slot2Provider = modelSlot2Provider.value;
    const slot2Model = modelSlot2Input.value.trim();
    const slot3Provider = modelSlot3Provider.value;
    const slot3Model = modelSlot3Input.value.trim();
    const slot4Provider = modelSlot4Provider.value;
    const slot4Model = modelSlot4Input.value.trim();
    const slot5Provider = modelSlot5Provider.value;
    const slot5Model = modelSlot5Input.value.trim();
    
    const systemPrompt = systemPromptInput.value.trim();
    const insertSystemPrompt = insertSystemPromptInput.value.trim();
    
    // Save to Chrome storage
    chrome.storage.sync.set({ 
      replacementWord: newPrompt,
      llmProvider: provider,
      // API keys
      openrouterApiKey,
      cerebrasApiKey,
      groqApiKey,
      sambanovaApiKey,
      klusteraiApiKey,
      lambdaaiApiKey,
      // Models
      openrouterModel,
      cerebrasModel,
      groqModel,
      sambanovaModel,
      klusteraiModel,
      lambdaaiModel,
      // Model slots
      modelSlot1Provider: slot1Provider,
      modelSlot1Model: slot1Model,
      modelSlot2Provider: slot2Provider,
      modelSlot2Model: slot2Model,
      modelSlot3Provider: slot3Provider,
      modelSlot3Model: slot3Model,
      modelSlot4Provider: slot4Provider,
      modelSlot4Model: slot4Model,
      modelSlot5Provider: slot5Provider,
      modelSlot5Model: slot5Model,
      // Prompts
      systemPrompt,
      insertSystemPrompt
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