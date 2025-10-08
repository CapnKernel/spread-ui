// Simple spreadsheet cell editing, navigation and column resizing functionality
document.addEventListener('DOMContentLoaded', function() {
  const dataCells = document.querySelectorAll('.data-cell');
  let currentCell = null;
  let isEditing = false;

  // Set initial focus to first data cell
  if (dataCells.length > 0) {
    setFocus(dataCells[0]);
  }

  // Prevent header cells from taking focus
  const headerCells = document.querySelectorAll('.header-cell, .row-header');
  headerCells.forEach(header => {
    header.setAttribute('tabindex', '-1');
  });

  dataCells.forEach(cell => {
    // Set focus on click
    cell.addEventListener('click', function() {
      if (!isEditing) {
        setFocus(this);
      }
    });
  });

  // Global keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (isEditing) return; // Don't navigate while editing

    if (!currentCell) return;

    const row = currentCell.parentNode;
    // Get data cell index (excluding row header)
    const dataCells = Array.from(row.querySelectorAll('.data-cell'));
    const cellIndex = dataCells.indexOf(currentCell);
    const rowIndex = Array.from(row.parentNode.children).indexOf(row);

    // Start editing on any printable character (append mode)
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      startEditing(currentCell, 'append', e.key);
      return;
    }

    switch(e.key) {
      case 'ArrowUp':
        e.preventDefault();
        navigateToCell(rowIndex - 1, cellIndex);
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigateToCell(rowIndex + 1, cellIndex);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        navigateToCell(rowIndex, cellIndex - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        navigateToCell(rowIndex, cellIndex + 1);
        break;
      case 'Tab':
        e.preventDefault();
        console.log('Global Tab navigation:', {
          currentCell: cellIndex,
          currentRow: rowIndex,
          shiftKey: e.shiftKey
        });
        if (e.shiftKey) {
          // Shift-Tab: move left
          navigateToCell(rowIndex, cellIndex - 1);
        } else {
          // Tab: move right
          navigateToCell(rowIndex, cellIndex + 1);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (e.shiftKey) {
          // Shift-Enter: move up
          navigateToCell(rowIndex - 1, cellIndex);
        } else {
          // Enter: start editing with selection
          startEditing(currentCell, 'select');
        }
        break;
      case 'F2':
        e.preventDefault();
        startEditing(currentCell, 'end');
        break;
    }
  });

  function navigateToCell(rowIndex, cellIndex) {
    const table = document.querySelector('.spreadsheet-table tbody');
    const rows = table.querySelectorAll('tr');

    if (rowIndex >= 0 && rowIndex < rows.length) {
      const row = rows[rowIndex];
      const dataCells = row.querySelectorAll('.data-cell');

      if (cellIndex >= 0 && cellIndex < dataCells.length) {
        setFocus(dataCells[cellIndex]);
      }
    }
  }

  function setFocus(cell) {
    // Remove focus from previous cell
    if (currentCell) {
      currentCell.classList.remove('focused');
      currentCell.removeAttribute('tabindex');
    }

    // Set focus to new cell
    currentCell = cell;
    currentCell.classList.add('focused');
    currentCell.setAttribute('tabindex', '0');
    currentCell.focus();
  }

  function startEditing(cell, mode = 'select', character = '') {
    if (isEditing) return;

    isEditing = true;
    const originalContent = cell.querySelector('.cell-content').textContent;

    // Add editing class for positioning
    cell.classList.add('editing');

    // Create input element with CSS class
    const input = document.createElement('input');
    input.type = 'text';

    // Set initial value based on mode
    if (mode === 'append' && character) {
      input.value = originalContent + character; // Append character
    } else {
      input.value = originalContent; // Preserve existing content
    }

    input.className = 'cell-input';

    // Clear cell content and add input
    const contentSpan = cell.querySelector('.cell-content');
    contentSpan.style.display = 'none';
    cell.appendChild(input);
    input.focus();

    // Set cursor position based on mode
    if (mode === 'select') {
      input.select(); // Select all text for replacement
    } else if (mode === 'end' || mode === 'append') {
      input.setSelectionRange(input.value.length, input.value.length); // Cursor at end
    }

    // Handle input events
    const blurHandler = function() {
      finishEditing(cell, input.value);
    };
    input.addEventListener('blur', blurHandler);

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation(); // Stop event from bubbling to global navigation
        const newValue = input.value;

        // Get current cell position before finishing edit
        const row = cell.parentNode;
        const dataCells = Array.from(row.querySelectorAll('.data-cell'));
        const cellIndex = dataCells.indexOf(cell);
        const rowIndex = Array.from(row.parentNode.children).indexOf(row);

        // Navigate based on key and modifiers
        let targetRow = rowIndex;
        let targetCell = cellIndex;

        if (e.key === 'Enter') {
          if (e.shiftKey) {
            targetRow = rowIndex - 1; // Shift-Enter: up
          } else {
            targetRow = rowIndex + 1; // Enter: down
          }
        } else if (e.key === 'Tab') {
          if (e.shiftKey) {
            targetCell = cellIndex - 1; // Shift-Tab: left
          } else {
            targetCell = cellIndex + 1; // Tab: right
          }
        }

        // Remove blur listener to prevent duplicate finishEditing calls
        input.removeEventListener('blur', blurHandler);
        finishEditing(cell, newValue);
        navigateToCell(targetRow, targetCell);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation(); // Stop event from bubbling to global navigation
        // Remove blur listener to prevent duplicate finishEditing calls
        input.removeEventListener('blur', blurHandler);
        finishEditing(cell, originalContent);
      }
    });
  }
  function finishEditing(cell, newValue) {
    // Remove input and restore cell content
    const input = cell.querySelector('input');
    if (input && input.parentNode === cell) {
      input.remove();
    }

    // Show content span and update value
    const contentSpan = cell.querySelector('.cell-content');
    contentSpan.textContent = newValue || '';
    contentSpan.style.display = '';

    // Remove editing class
    cell.classList.remove('editing');
    isEditing = false;

    // Add visual feedback for edited cell
    cell.classList.add('cell-edited');
    setTimeout(() => {
      cell.classList.remove('cell-edited');
    }, 1000);

    // TODO: Replace with HTMX call to server for persistence
    console.log('Cell updated:', newValue);
  }

  function initColumnZIndex() {
    const table = document.querySelector('.spreadsheet-table');
    const rows = table.querySelectorAll('tbody tr');

    if (rows.length === 0) return;

    // Get the number of data columns (excluding row headers)
    const firstRow = rows[0];
    const dataCells = firstRow.querySelectorAll('.data-cell');
    const columnCount = dataCells.length;

    // Set z-index for each column (left columns overlay right columns)
    rows.forEach(row => {
      const cells = row.querySelectorAll('.data-cell');
      cells.forEach((cell, index) => {
        const contentSpan = cell.querySelector('.cell-content');
        if (contentSpan) {
          // Left columns get higher z-index values
          const zIndex = columnCount - index;
          contentSpan.style.zIndex = zIndex;
        }
      });
    });
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

  // Initialize column z-index layering
  initColumnZIndex();

  // Initialize column resizing
  initColumnResizing();
});