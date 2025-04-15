// When the options page has loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get reference to the input field and save button
  const wordInput = document.getElementById('replacementWord');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');
  
  // Load current settings
  chrome.storage.sync.get('replacementWord', (data) => {
    wordInput.value = data.replacementWord || 'cat';
  });
  
  // Save settings when the button is clicked
  saveBtn.addEventListener('click', () => {
    const newWord = wordInput.value.trim() || 'cat';
    
    // Save to Chrome storage
    chrome.storage.sync.set({ replacementWord: newWord }, () => {
      // Show success message
      statusEl.classList.add('success');
      
      // Hide the message after 3 seconds
      setTimeout(() => {
        statusEl.classList.remove('success');
      }, 3000);
    });
  });
}); 