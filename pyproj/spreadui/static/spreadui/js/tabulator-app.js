// Tabulator spreadsheet application with single-user editing
document.addEventListener('DOMContentLoaded', function() {
    let table;
    let keepaliveInterval = null;
    let statusPollInterval = null;
    let isEditing = false;
    let sessionUUID = null;

    // Generate UUID for this browser tab
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Custom numeric editor that allows arrow key navigation
    function numericEditor(cell, onRendered, success, cancel, editorParams) {
        const editor = document.createElement("input");
        editor.setAttribute("type", "text");
        editor.setAttribute("inputmode", "numeric");
        editor.style.padding = "4px";
        editor.style.width = "100%";
        editor.style.boxSizing = "border-box";
        editor.value = cell.getValue();

        function setValue(value) {
            success(value);
        }

        function handleKeydown(e) {
            // Allow arrow keys to navigate between cells - don't prevent default
            if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
                // Let Tabulator handle the navigation
                return;
            }

            // Allow numeric input and basic editing keys
            if (!/^[0-9\b\t\n]$/.test(e.key) &&
                !["Backspace", "Delete", "Tab", "Enter", "Escape", "Home", "End"].includes(e.key)) {
                e.preventDefault();
            }
        }

        function handleBlur() {
            const value = editor.value.trim();
            if (value === "") {
                setValue(null);
            } else if (/^\d+$/.test(value)) {
                setValue(parseInt(value, 10));
            } else {
                cancel();
            }
        }

        editor.addEventListener("keydown", handleKeydown);
        editor.addEventListener("blur", handleBlur);

        // Focus and select text when editor is created
        onRendered(function() {
            editor.focus();
            editor.select();
        });

        return editor;
    }

    // Initialize Tabulator
    function initializeTable(readOnly = true) {
        const columns = [
            {title: "ID", field: "id", width: 80},
            {title: "First Name", field: "first_name", editor: readOnly ? false : "input"},
            {title: "Last Name", field: "last_name", editor: readOnly ? false : "input"},
            {title: "Email", field: "email", editor: readOnly ? false : "input"},
            {title: "Age", field: "age", editor: readOnly ? false : numericEditor, validator: "integer"},
        ];

        if (table) {
            table.destroy();
        }

        table = new Tabulator("#spreadsheet-table", {
            layout: "fitColumns",
            height: "600px",
            columns: columns,
            data: [],
            placeholder: "Loading data...",
        });

        // Add event handlers for user interaction
        if (!readOnly) {
            // Cell edited - save data
            table.on("cellEdited", function(cell) {
                saveRow(cell.getRow().getData());
                extendEditingSession(); // Extend session on edit
            });

            // Cell clicked - extend session
            table.on("cellClick", function(e, cell) {
                extendEditingSession(); // Extend session on click
            });

            // Cell editing ended - extend session
            table.on("cellEditCancelled", function(cell) {
                extendEditingSession(); // Extend session on cancel
            });
        }

        loadData();
    }

    // Fetch data from API
    async function loadData() {
        try {
            const response = await fetch('/api/people');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            table.setData(data);
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    // Save row data to server
    async function saveRow(rowData) {
        if (!isEditing) return;

        try {
            const response = await fetch(`/api/people/${rowData.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uuid: sessionUUID,
                    first_name: rowData.first_name,
                    last_name: rowData.last_name,
                    email: rowData.email,
                    age: rowData.age
                })
            });

            const result = await response.json();
            if (!result.success) {
                console.error('Failed to save row:', result.message);
                showToast('Error saving data: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('Failed to save row:', error);
            showToast('Error saving data', 'danger');
        }
    }

    // Check session status
    async function checkSessionStatus() {
        console.log('In checkSessionStatus');
        try {
            const response = await fetch(`/api/session/status?uuid=${sessionUUID}`);
            const status = await response.json();

            updateSessionUI(status);

            if (isEditing && !status.can_edit) {
                // We lost editing privileges - session expired
                endEditingSession();
                showToast('Editing session expired - switching to read-only mode', 'warning');
            }
        } catch (error) {
            console.error('Failed to check session status:', error);
        }
    }

    // Start editing session
    async function startEditingSession() {
        try {
            const response = await fetch('/api/session/edit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({uuid: sessionUUID})
            });

            const result = await response.json();

            if (result.success && result.can_edit) {
                isEditing = true;
                initializeTable(false); // Switch to editable mode
                startKeepalive();
                updateSessionUI({can_edit: true});
                showToast('You are now editing the spreadsheet', 'success');
            } else {
                showToast(result.message || 'Cannot start editing session', 'warning');
            }
        } catch (error) {
            console.error('Failed to start editing session:', error);
            showToast('Failed to start editing session', 'danger');
        }
    }

    // Extend editing session on user interaction
    async function extendEditingSession() {
        if (!isEditing) return;

        try {
            const response = await fetch('/api/session/edit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({uuid: sessionUUID})
            });

            const result = await response.json();
            if (!result.success || !result.can_edit) {
                // Session is invalid or we lost editing rights
                endEditingSession();
                showToast(result.message || 'Session expired', 'warning');
            }
        } catch (error) {
            console.error('Failed to extend editing session:', error);
        }
    }

    // End editing session
    async function endEditingSession() {
        try {
            await fetch('/api/session/end', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({uuid: sessionUUID})
            });
        } catch (error) {
            console.error('Failed to end session:', error);
        }

        isEditing = false;
        stopKeepalive();
        initializeTable(true); // Switch back to read-only mode
        updateSessionUI({can_edit: false});
    }

    // Send keepalive to detect client disappearance
    async function sendKeepalive() {
        if (!isEditing) return;

        try {
            await fetch('/api/session/keepalive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({uuid: sessionUUID})
            });
        } catch (error) {
            console.error('Failed to send keepalive:', error);
        }
    }

    // Start keepalive interval
    function startKeepalive() {
        keepaliveInterval = setInterval(sendKeepalive, 15000); // Every 15 seconds
    }

    // Stop keepalive interval
    function stopKeepalive() {
        if (keepaliveInterval) {
            clearInterval(keepaliveInterval);
            keepaliveInterval = null;
        }
    }

    // Update session UI
    function updateSessionUI(status) {
        const statusElement = document.getElementById('connection-status');
        const textElement = document.getElementById('status-text');
        const editButton = document.getElementById('edit-button');
        const sessionInfo = document.getElementById('session-info');

        if (status.can_edit && !isEditing) {
            statusElement.className = 'alert alert-success';
            textElement.textContent = 'Ready to edit - Click "Start Editing" to begin';
            editButton.style.display = 'block';
            sessionInfo.style.display = 'none';
        } else if (isEditing) {
            // Check if session has expired (time remaining ≤ 0)
            if (status.time_remaining !== undefined && status.time_remaining <= 0) {
                statusElement.className = 'alert alert-danger';
                textElement.textContent = 'Session expired - switched to read-only mode';
                editButton.style.display = 'block';
                editButton.textContent = 'Reclaim Editing';
                editButton.className = 'btn btn-warning btn-sm ms-2';
                sessionInfo.style.display = 'none';

                // Switch table to read-only mode
                if (isEditing) {
                    isEditing = false;
                    stopKeepalive();
                    initializeTable(true); // Switch to read-only mode
                }
            }
            // Check if session is about to expire (less than 10 seconds)
            else if (status.time_remaining !== undefined && status.time_remaining <= 10) {
                statusElement.className = 'alert alert-danger';
                textElement.textContent = 'Session expiring soon - save your work!';
                editButton.style.display = 'none';
                sessionInfo.style.display = 'block';
            } else {
                statusElement.className = 'alert alert-success';
                textElement.textContent = 'You are currently editing';
                editButton.style.display = 'none';
                sessionInfo.style.display = 'block';
            }

            // Update time remaining directly from server response
            const timeElement = document.getElementById('time-remaining');
            if (timeElement && status.time_remaining !== undefined) {
                timeElement.textContent = Math.max(0, status.time_remaining);
                // Change color to red when time is low
                if (status.time_remaining <= 10) {
                    timeElement.style.color = '#dc3545';
                    timeElement.style.fontWeight = 'bold';
                } else {
                    timeElement.style.color = '';
                    timeElement.style.fontWeight = '';
                }
            }
        } else {
            statusElement.className = 'alert alert-warning';
            if (status.current_editor) {
                textElement.textContent = `Someone else is editing (${status.current_editor.substring(0, 8)}...) - Time remaining: ${status.time_remaining}s`;
            } else {
                textElement.textContent = 'Checking edit status...';
            }
            editButton.style.display = 'none';
            sessionInfo.style.display = 'none';
        }
    }

    // Show toast notification
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toastId = 'toast-' + Date.now();

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0`;
        toast.id = toastId;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        toastContainer.appendChild(toast);

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', function() {
            toast.remove();
        });
    }

    // Initialize the application
    function initializeApp() {
        // Generate UUID for this browser tab
        sessionUUID = generateUUID();
        console.log('Generated session UUID:', sessionUUID);

        // Create UI elements
        const statusContainer = document.getElementById('connection-status');
        statusContainer.innerHTML = `
            <span id="status-text">Checking edit status...</span>
            <button id="edit-button" class="btn btn-primary btn-sm ms-2" style="display: none;">Start Editing</button>
            <div id="session-info" class="mt-2" style="display: none;">
                <small>You are editing. Time remaining: <span id="time-remaining">30</span>s</small>
                <button id="end-edit-button" class="btn btn-warning btn-sm ms-2">Stop Editing</button>
            </div>
        `;

        // Add event listeners
        document.getElementById('edit-button').addEventListener('click', startEditingSession);
        document.getElementById('end-edit-button').addEventListener('click', endEditingSession);

        // Initialize table in read-only mode
        initializeTable(true);

        // Start polling for session status
        statusPollInterval = setInterval(checkSessionStatus, 3000); // Every 3 seconds
        checkSessionStatus(); // Initial check
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        if (isEditing) {
            // Try to end session, but don't wait for response
            fetch('/api/session/end', {
                method: 'POST',
                keepalive: true // Send even during page unload
            }).catch(() => {}); // Ignore errors during unload
        }

        if (keepaliveInterval) clearInterval(keepaliveInterval);
        if (statusPollInterval) clearInterval(statusPollInterval);
    });

    // Start the application
    initializeApp();
});