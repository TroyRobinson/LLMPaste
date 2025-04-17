// NOTE: All LLM API logic must be handled via llm.js. Do not call LLM APIs directly here.
// When the popup HTML has loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM loaded');
  
  // Get DOM elements
  const replacementTextarea = document.getElementById('replacementText');
  
  // Get the current replacement word from storage
  chrome.storage.sync.get('replacementWord', (data) => {
    // Update the textarea with the current word
    replacementTextarea.value = data.replacementWord || 'cat';
  });
  
  // Add event listener for the save button
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.addEventListener('click', () => {
    // Save the new replacement text
    chrome.storage.sync.set({ 'replacementWord': replacementTextarea.value }, () => {
      // Show saved confirmation
      saveBtn.textContent = 'Saved!'; 
      setTimeout(() => {
        saveBtn.textContent = 'Save';
      }, 1000);
    });
  });
  
  // Simple Enter key handler - just save, no slot selection in popup
  replacementTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveBtn.click();
    }
  });
  
  // Add event listener for the options button
  const optionsBtn = document.getElementById('optionsBtn');
  
  if (optionsBtn) {
    optionsBtn.addEventListener('click', () => {
      console.log('Options button clicked!');
      
      try {
        chrome.runtime.openOptionsPage((err) => {
          if (err) console.error('Could not open options:', err);
          console.log('Options page opened');
        });
      } catch (error) {
        console.error('Error opening options page:', error);
        // Fallback method
        try {
          chrome.tabs.create({ url: 'options.html' });
        } catch (err) {
          console.error('Fallback also failed:', err);
        }
      }
    });
  }
});