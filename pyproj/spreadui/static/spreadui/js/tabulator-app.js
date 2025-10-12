// Tabulator spreadsheet application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Tabulator
    const table = new Tabulator("#spreadsheet-table", {
        layout: "fitColumns",
        height: "600px",
        columns: [
            {title: "ID", field: "id", width: 80},
            {title: "First Name", field: "first_name", editor: false},
            {title: "Last Name", field: "last_name", editor: false},
            {title: "Email", field: "email", editor: false},
            {title: "Age", field: "age", editor: false},
        ],
        data: [],
        placeholder: "Loading data...",
    });

    // Fetch data from API
    async function loadData() {
        try {
            const response = await fetch('/api/people');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            table.setData(data);
            updateConnectionStatus('Connected', 'success');
        } catch (error) {
            console.error('Failed to load data:', error);
            updateConnectionStatus('Connection failed', 'danger');
        }
    }

    // Update connection status
    function updateConnectionStatus(message, type) {
        const statusElement = document.getElementById('connection-status');
        const textElement = document.getElementById('status-text');

        statusElement.className = `alert alert-${type}`;
        textElement.textContent = message;
    }

    // Initial data load
    loadData();
});