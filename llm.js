/**
 * llm.js
 *
 * This module is the SINGLE SOURCE OF TRUTH for all LLM API calls in the LLMPaste extension.
 * Any logic for interacting with LLM providers (OpenRouter or others) must be implemented here.
 * Do NOT call LLM APIs directly from content scripts, background scripts, popups, or options.
 *
 * Usage: import { callLLM } from './llm.js';
 */
// llm.js - Abstraction for LLM API interactions (OpenRouter, future providers)

/**
 * Call an LLM provider (currently OpenRouter) to generate text.
 * @param {Object} options
 * @param {string} options.promptText - The user prompt.
 * @param {string} [options.selectedText] - The selected text to transform (optional).
 * @param {string} options.apiKey - The API key for OpenRouter.
 * @param {string} options.model - The LLM model to use.
 * @param {string} [options.systemPrompt] - Optional system prompt.
 * @returns {Promise<string>} The generated text from the LLM.
 */
export async function callLLM({ promptText, selectedText, apiKey, model, systemPrompt }) {
  // Compose messages array as required by OpenRouter API
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
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (data.choices && data.choices.length > 0 && data.choices[0].message) {
    return data.choices[0].message.content.trim();
  } else {
    throw new Error('Invalid response format from OpenRouter API');
  }
}
