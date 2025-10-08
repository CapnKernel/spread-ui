// Simple spreadsheet cell editing and column resizing functionality
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
  
  // Initialize column resizing
  initColumnResizing();

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
  
  function initColumnResizing() {
    const table = document.querySelector('.spreadsheet-table');
    const headers = table.querySelectorAll('thead th');
    
    headers.forEach((header, index) => {
      // Skip the first header (row numbers)
      if (index === 0) return;
      
      // Create resize handle
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'resize-handle';
      
      // Insert after the header
      header.appendChild(resizeHandle);
      
      // Add event listeners for resizing
      resizeHandle.addEventListener('mousedown', function(e) {
        e.preventDefault();
        startResize(header, e);
      });
    });
  }
  
  function startResize(header, e) {
    const table = document.querySelector('.spreadsheet-table');
    const startX = e.clientX;
    const startWidth = header.offsetWidth;
    const columnIndex = Array.from(header.parentNode.children).indexOf(header);
    
    function doResize(e) {
      const newWidth = startWidth + (e.clientX - startX);
      if (newWidth > 50) { // Minimum width
        header.style.width = newWidth + 'px';
        
        // Update all cells in this column
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
          const cell = row.children[columnIndex];
          if (cell) {
            cell.style.width = newWidth + 'px';
          }
        });
      }
    }
    
    function stopResize() {
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stopResize);
      document.body.classList.remove('resizing');
    }
    
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
    document.body.classList.add('resizing');
  }
});