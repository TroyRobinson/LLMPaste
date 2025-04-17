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
    'modelSlot3AltProvider',
    'modelSlot3AltModel',
    'modelSlot4Provider',
    'modelSlot4Model',
    'modelSlot4AltProvider',
    'modelSlot4AltModel',
    'modelSlot5Provider',
    'modelSlot5Model',
    'modelSlot5AltProvider',
    'modelSlot5AltModel'
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
    
    // Set the system prompt if it exists in storage
    if (data.systemPrompt) {
      systemPromptInput.value = data.systemPrompt;
    }
    
    // Set the insert system prompt if it exists in storage
    if (data.insertSystemPrompt) {
      insertSystemPromptInput.value = data.insertSystemPrompt;
    }
    
    // Set model slots with simplified defaults
    // Default slot 1 to the current provider
    modelSlot1Provider.value = data.modelSlot1Provider || data.llmProvider || 'openrouter';
    modelSlot1Input.value = data.modelSlot1Model || 'anthropic/claude-3-5-sonnet';
    
    // Make sure the model is saved to local storage for the prompt interface to access
    chrome.storage.local.set({
      'activeModelSlot': 1,
      'activeModelAlt': false,
      'activeModelName': data.modelSlot1Model || 'anthropic/claude-3-5-sonnet',
      'activeModelProvider': data.modelSlot1Provider || data.llmProvider || 'openrouter'
    });
    
    // Set other slots with defaults
    modelSlot2Provider.value = data.modelSlot2Provider || 'openrouter';
    modelSlot2Input.value = data.modelSlot2Model || 'anthropic/claude-3-opus-20240229';
    
    // Set alternate slots
    const modelSlot2AltProvider = document.getElementById('modelSlot2AltProvider');
    const modelSlot2AltInput = document.getElementById('modelSlot2Alt');
    if (modelSlot2AltProvider && modelSlot2AltInput) {
      modelSlot2AltProvider.value = data.modelSlot2AltProvider || 'openrouter';
      modelSlot2AltInput.value = data.modelSlot2AltModel || 'anthropic/claude-3-sonnet-20240229';
    }
    
    modelSlot3Provider.value = data.modelSlot3Provider || 'openrouter';
    modelSlot3Input.value = data.modelSlot3Model || 'openai/gpt-4o';
    
    const modelSlot3AltProvider = document.getElementById('modelSlot3AltProvider');
    const modelSlot3AltInput = document.getElementById('modelSlot3Alt');
    if (modelSlot3AltProvider && modelSlot3AltInput) {
      modelSlot3AltProvider.value = data.modelSlot3AltProvider || 'openrouter';
      modelSlot3AltInput.value = data.modelSlot3AltModel || 'openai/gpt-4-turbo';
    }
    
    modelSlot4Provider.value = data.modelSlot4Provider || 'groq';
    modelSlot4Input.value = data.modelSlot4Model || 'llama-3.3-70b-versatile';
    
    const modelSlot4AltProvider = document.getElementById('modelSlot4AltProvider');
    const modelSlot4AltInput = document.getElementById('modelSlot4Alt');
    if (modelSlot4AltProvider && modelSlot4AltInput) {
      modelSlot4AltProvider.value = data.modelSlot4AltProvider || 'groq';
      modelSlot4AltInput.value = data.modelSlot4AltModel || 'gemma-2-27b-it';
    }
    
    modelSlot5Provider.value = data.modelSlot5Provider || 'openrouter';
    modelSlot5Input.value = data.modelSlot5Model || 'meta-llama/llama-3-70b-instruct';
    
    const modelSlot5AltProvider = document.getElementById('modelSlot5AltProvider');
    const modelSlot5AltInput = document.getElementById('modelSlot5Alt');
    if (modelSlot5AltProvider && modelSlot5AltInput) {
      modelSlot5AltProvider.value = data.modelSlot5AltProvider || 'openrouter';
      modelSlot5AltInput.value = data.modelSlot5AltModel || 'anthropic/claude-3-haiku';
    }
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
    
    // No separate model fields anymore, only slots
    
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
    
    // Get alternate model slots values - safely get values to avoid null errors
    function getElementValue(id) {
      const element = document.getElementById(id);
      return element ? element.value : '';
    }
    const slot3AltProvider = getElementValue('modelSlot3AltProvider');
    const slot3AltModel = getElementValue('modelSlot3Alt').trim();
    const slot4AltProvider = getElementValue('modelSlot4AltProvider'); 
    const slot4AltModel = getElementValue('modelSlot4Alt').trim();
    const slot5AltProvider = getElementValue('modelSlot5AltProvider');
    const slot5AltModel = getElementValue('modelSlot5Alt').trim();
    
    console.log('Slot 5 Alt values:', { provider: slot5AltProvider, model: slot5AltModel });
    
    const systemPrompt = systemPromptInput.value.trim();
    const insertSystemPrompt = insertSystemPromptInput.value.trim();
    
    // Validate and provide defaults for empty values
    function ensureValue(value, defaultValue) {
      return value && value.trim() ? value.trim() : defaultValue;
    }
    
    // Ensure slot 5 and slot 5 alt have values
    const validatedSlot5Model = ensureValue(slot5Model, 'meta-llama/llama-3-70b-instruct');
    const validatedSlot5AltModel = ensureValue(slot5AltModel, 'anthropic/claude-3-haiku');
    
    console.log('Validated slot 5 model:', validatedSlot5Model);
    console.log('Validated slot 5 alt model:', validatedSlot5AltModel);
    
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
      // Model slots
      modelSlot1Provider: slot1Provider,
      modelSlot1Model: slot1Model,
      modelSlot2Provider: slot2Provider,
      modelSlot2Model: slot2Model,
      modelSlot3Provider: slot3Provider,
      modelSlot3Model: slot3Model,
      modelSlot3AltProvider: slot3AltProvider,
      modelSlot3AltModel: slot3AltModel,
      modelSlot4Provider: slot4Provider,
      modelSlot4Model: slot4Model,
      modelSlot4AltProvider: slot4AltProvider,
      modelSlot4AltModel: slot4AltModel,
      modelSlot5Provider: slot5Provider,
      modelSlot5Model: validatedSlot5Model,
      modelSlot5AltProvider: slot5AltProvider,
      modelSlot5AltModel: validatedSlot5AltModel,
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