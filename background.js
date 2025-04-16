// NOTE: All LLM API logic must be handled via llm.js. Do not call LLM APIs directly here.
// Listen for keyboard shortcut command
chrome.commands.onCommand.addListener((command) => {
  if (command === 'cut-and-paste') {
    // Send message to content script to perform the cut-paste operation
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'cutAndPaste' });
    });
  }
});

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  // Set default replacement word as "cat"
  chrome.storage.sync.get('replacementWord', (data) => {
    if (!data.replacementWord) {
      chrome.storage.sync.set({ replacementWord: 'cat' });
    }
  });
}); 