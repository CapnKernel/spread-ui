// Simple spreadsheet cell editing functionality
document.addEventListener('DOMContentLoaded', function() {
  const dataCells = document.querySelectorAll('.data-cell');

  dataCells.forEach(cell => {
    // Make cell editable on click
    cell.addEventListener('click', function() {
      makeCellEditable(this);
    });

    // Handle Enter key to make cell editable
    cell.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        makeCellEditable(this);
      }
    });
  });

  function makeCellEditable(cell) {
    // Don't make already editing cells editable again
    if (cell.querySelector('input')) return;

    const originalContent = cell.textContent;

    // Add editing class for positioning
    cell.classList.add('editing');

    // Create input element with CSS class
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalContent;
    input.className = 'cell-input';

    // Clear cell content and add input
    cell.textContent = '';
    cell.appendChild(input);
    input.focus();
    input.select();

    // Handle input events
    input.addEventListener('blur', function() {
      finishEditing(cell, input.value);
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishEditing(cell, input.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finishEditing(cell, originalContent);
      }
    });
  }

  function finishEditing(cell, newValue) {
    // Remove input and restore cell content
    const input = cell.querySelector('input');
    if (input) {
      input.remove();
    }
    cell.textContent = newValue || '';

    // Remove editing class
    cell.classList.remove('editing');

    // Add visual feedback for edited cell
    cell.classList.add('cell-edited');
    setTimeout(() => {
      cell.classList.remove('cell-edited');
    }, 1000);

    // TODO: Replace with HTMX call to server for persistence
    console.log('Cell updated:', newValue);
  }
});