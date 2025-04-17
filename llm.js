/**
 * llm.js
 *
 * This module is the SINGLE SOURCE OF TRUTH for all LLM API calls in the LLMPaste extension.
 * Any logic for interacting with LLM providers (OpenRouter, Cerebras, Groq, etc.) must be implemented here.
 * Do NOT call LLM APIs directly from content scripts, background scripts, popups, or options.
 *
 * Usage: import { callLLM } from './llm.js';
 */

/**
 * Call an LLM provider to generate text.
 * @param {Object} options
 * @param {string} options.promptText - The user prompt.
 * @param {string} [options.selectedText] - The selected text to transform (optional).
 * @param {string} options.apiKey - The API key for the provider.
 * @param {string} options.model - The LLM model to use.
 * @param {string} options.provider - The LLM provider to use (openrouter, cerebras, groq, sambanova, klusterai, lambdaai).
 * @param {string} [options.systemPrompt] - Optional system prompt.
 * @returns {Promise<string>} The generated text from the LLM.
 */
export async function callLLM({ promptText, selectedText, apiKey, model, provider, systemPrompt }) {
  // Compose messages array as required by API
  let messages = [];

  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt
    });
  }

  if (selectedText) {
    messages.push({
      role: 'user',
      content: `${promptText}\n\n${selectedText}`
    });
  } else {
    messages.push({
      role: 'user',
      content: promptText
    });
  }

  let apiEndpoint, headers, requestBody;

  switch (provider) {
    case 'cerebras':
      apiEndpoint = 'https://api.cerebras.ai/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        model: model,
        messages: messages,
        stream: false,
        temperature: 0.7,
        max_completion_tokens: 10000,
        top_p: 1
      };
      break;
    
    case 'groq':
      apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 10000
      };
      break;
    
    case 'sambanova':
      apiEndpoint = 'https://api.sambanova.ai/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        model: model,
        messages: messages,
        stream: false
      };
      break;
    
    case 'klusterai':
      apiEndpoint = 'https://api.kluster.ai/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        model: model,
        messages: messages
      };
      break;
    
    case 'lambdaai':
      apiEndpoint = 'https://api.lambda.ai/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        model: model,
        messages: messages
      };
      break;
    
    case 'openrouter':
    default:
      apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/llmpaste',
        'X-Title': 'LLMPaste'
      };
      requestBody = {
        model: model,
        messages: messages,
        max_tokens: 10000
      };
      break;
  }

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (data.choices && data.choices.length > 0 && data.choices[0].message) {
    return data.choices[0].message.content.trim();
  } else {
    throw new Error(`Invalid response format from ${provider} API`);
  }
}
