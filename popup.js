// When the popup HTML has loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get the current replacement word from storage
  chrome.storage.sync.get('replacementWord', (data) => {
    // Update the UI with the current word
    const currentWordElement = document.getElementById('currentWord');
    currentWordElement.textContent = data.replacementWord || 'cat';
  });
  
  // Add event listener for the options button
  const optionsBtn = document.getElementById('optionsBtn');
  optionsBtn.addEventListener('click', () => {
    // Open the options page when the button is clicked
    chrome.runtime.openOptionsPage();
  });
}); 