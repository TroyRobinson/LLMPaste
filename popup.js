// NOTE: All LLM API logic must be handled via llm.js. Do not call LLM APIs directly here.
// When the popup HTML has loaded
document.addEventListener('DOMContentLoaded', () => {
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
  
  // Also save when pressing Enter in the textarea
  replacementTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveBtn.click();
    }
  });
  
  // Add event listener for the options button
  const optionsBtn = document.getElementById('optionsBtn');
  optionsBtn.addEventListener('click', () => {
    // Open the options page when the button is clicked
    chrome.runtime.openOptionsPage();
  });
}); 