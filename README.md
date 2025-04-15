# LLMPaste Chrome Extension

A Chrome extension that transforms selected text using AI via OpenRouter. 
- Works in Utopia IDE (React Editor/Designer) [VScode/Monaco based] and may work in other editors although not tested, probably needs adjustments.

## Features

- Sends selected text to an LLM via OpenRouter API based on your prompt
- Transforms text using models like Claude 3.5 Sonnet, GPT-4o, etc.
- Works across all websites, including complex editors like Monaco
- Activated with Ctrl+Shift+O keyboard shortcut
- Configurable user prompt and system prompt
- Special handling for different editor types

## Installation

### Development Mode

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now appear in your browser toolbar

## Usage

1. Select any text on a webpage
2. Press Ctrl+Shift+O
3. Enter your prompt in the popup window and click "Replace"
4. The extension will send your prompt + the selected text to the configured LLM
5. After processing, the selected text will be replaced with the AI-generated content

## Configuration

1. Click on the extension icon in the toolbar to set your default prompt
2. Click "More Settings" to open the options page where you can configure:
   - Default prompt: Instructions to give the AI along with selected text
   - OpenRouter API key: Required to access LLM models
   - LLM Model: Choose which model to use on OpenRouter
   - System prompt: Set specific instructions for how the AI should respond (formatting, tone, etc.)

## Technical Overview

### Challenges and Solutions

We encountered several challenges during development:

1. **Different Editor Types**: Web pages use various editor implementations (standard inputs, contenteditable elements, complex editors like Monaco). Each required a specialized approach.

2. **Monaco Editor Complexity**: The most significant challenge was working with Monaco-based editors, especially in applications like Utopia React IDE -- although Utopia is actually using the full VSCode inside, not just Monaco. These editors have complex internal state management that doesn't respond to standard DOM manipulation.

3. **Cut vs. Paste Operations**: While cutting text worked reliably with standard approaches, pasting the replacement text required editor-specific handling.

### How It Works

The extension uses a multi-layered approach:

1. **Editor Detection**: The code identifies the type of editor being used by analyzing the active element and DOM structure.

2. **Context-Specific Handling**: Different handlers are applied based on the editor type:
   - Standard inputs: Direct value manipulation
   - Contenteditable elements: DOM range manipulation
   - Monaco editors: Clipboard event simulation

3. **Monaco-Specific Solution**: For Monaco editors, we:
   - Cut the selected text using `document.execCommand('cut')`
   - Create a synthetic ClipboardEvent containing the replacement text
   - Focus the appropriate editor element
   - Dispatch the paste event to simulate a user paste operation

This approach ensures compatibility across different platforms and editor types, even in complex web applications.

## Debugging

The extension includes a debug mode that can be enabled by setting `DEBUG = true` in the content script.

To view debug information:

1. Right-click on a page where you're using the extension
2. Select "Inspect" or "Inspect Element"
3. Navigate to the "Console" tab
4. Look for messages prefixed with "LLMPaste"

Debug logs include details about API calls, response data, and text replacement operations.

## Permissions

- `storage`: Required to save your settings (prompts, API key, model choice)
- `clipboardRead`, `clipboardWrite`: Required for clipboard operations
- `activeTab`: Required to interact with the current tab
- `scripting`: Required for DOM manipulation
- `contextMenus`: Used for possible future context menu integration
- `https://openrouter.ai/*`: Required to make API calls to OpenRouter

## Privacy & Security

- Your OpenRouter API key is stored locally in Chrome's sync storage
- Text selections are sent to OpenRouter's API for processing
- No data is stored on our servers
- System prompts can be customized to control what data is shared with the API 