// logs.js - Teljes JavaScript funkciók az audit log rendszerhez
console.log('✅ showCleanupModal function:', typeof showCleanupModal);
console.log('✅ window.showCleanupModal:', window.showCleanupModal);

// GLOBÁLIS VÁLTOZÓK
// ============================
let currentLogs = [];
let currentStats = {};
let currentFilters = {
    action: '',
    user: '',
    limit: 100
};

// ============================
// INICIALIZÁLÁS
// ============================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Audit logs system loaded');
    
    // Kezdeti adatok betöltése
    loadLogs();
    loadStats();
    
    // Event listeners beállítása
    setupEventListeners();
    
    // Auto-refresh (opcionális, 30 másodpercenként)
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadLogs(true); // silent reload
            loadStats(true);
        }
    }, 30000);
});

// ============================
// EVENT LISTENERS
// ============================
function setupEventListeners() {
    const actionFilter = document.getElementById('actionFilter');
    const userFilter = document.getElementById('userFilter');
    const limitFilter = document.getElementById('logLimit');
    
    if (actionFilter) {
        actionFilter.addEventListener('change', () => {
            currentFilters.action = actionFilter.value;
            loadLogs();
        });
    }
    
    if (userFilter) {
        userFilter.addEventListener('input', debounce(() => {
            currentFilters.user = userFilter.value.trim();
            loadLogs();
        }, 500));
    }
    
    if (limitFilter) {
        limitFilter.addEventListener('change', () => {
            currentFilters.limit = parseInt(limitFilter.value);
            loadLogs();
        });
    }
}

// ============================
// LOGOK BETÖLTÉSE
// ============================
async function loadLogs(silent = false) {
    try {
        const params = new URLSearchParams({
            limit: currentFilters.limit
        });
        
        if (currentFilters.action) params.append('action_filter', currentFilters.action);
        if (currentFilters.user) params.append('user_filter', currentFilters.user);
        
        const response = await fetch(`/api/api.php?action=logs_list&${params}`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });
        
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
            throw new Error('Server returned non-JSON response');
        }
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load logs');
        
        currentLogs = data.logs || [];
        displayLogs(currentLogs);
        
    } catch (error) {
        console.error('❌ Load logs error:', error);
        if (!silent) showError('Failed to load logs: ' + error.message);
        displayLogs([]);
    }
}

// ============================
// LOGOK MEGJELENÍTÉSE
// ============================
function displayLogs(logs) {
    console.log('📋 Displaying logs:', logs.length);
    
    const container = document.getElementById('logsContainer');
    if (!container) {
        console.error('❌ Element not found: logsContainer');
        return;
    }
    
    if (logs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No logs found</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="table-controls">
            <label>
                <input type="checkbox" id="select-all-logs-main">
                Select All
            </label>
            <button id="delete-selected-btn" class="btn btn-danger" style="display:none;">
                <i class="fas fa-trash"></i> Delete Selected
            </button>
        </div>
        <table class="logs-table">
            <thead>
                <tr>
                    <th width="40"><input type="checkbox" id="select-all-logs-table"></th>
                    <th>ID</th>
                    <th>Source</th>
                    <th>NickName</th>
                    <th>Action</th>
                    <th>IP Address</th>
                    <th>Details</th>
                    <th>Channel</th>
					<th>Command</th>
					<th>Timestamp</th>
					<th>View</th>  
                </tr>
            </thead>
            <tbody>
    `;
    
    logs.forEach(log => {
        const actionIcon = getActionIcon(log.action);
        const actionClass = getActionClass(log.action);
        const truncatedDetails = truncateText(log.details || '', 50);
        const source = log.source || 'unknown';
        const sourceIcon = source === 'web' ? '🌐' : '🤖';
        const sourceClass = source === 'web' ? 'source-web' : 'source-bot';
        
        html += `
            <tr class="log-row ${actionClass}">
        <td>
            <input type="checkbox" class="log-checkbox" data-id="${log.id}" data-source="${source}">
        </td>
        <td>${log.id}</td>
        <td>
            <span class="source-badge ${sourceClass}" title="${source === 'web' ? 'Web Interface' : 'IRC Bot'}">
                ${sourceIcon} ${source.toUpperCase()}
            </span>
        </td>
        <td>
            <span class="user-badge role-${log.user_role || 'vip'}">
                ${escapeHtml(log.username || 'unknown')}
            </span>
        </td>
        <td>
            <span class="action-badge ${actionClass}">
                ${actionIcon} ${escapeHtml(log.action || '')}
            </span>
        </td>
        <td class="monospace">${escapeHtml(log.ip_address || 'N/A')}</td>
        <td>
            <span class="details-preview" title="${escapeHtml(log.details || '')}">
                ${escapeHtml(truncatedDetails)}
            </span>
        </td>
        <td>${escapeHtml(log.channel || 'N/A')}</td>  <!-- ÚJ: Channel oszlop -->
        <td>${escapeHtml(log.command || 'N/A')}</td>   <!-- ÚJ: Command oszlop -->
        <td class="monospace">${formatTimestamp(log.timestamp)}</td>
        <td>                                          <!-- ÚJ: View oszlop -->
            <button class="btn-icon" onclick="viewLogDetails(${log.id})" title="View Details">
                <i class="fas fa-eye"></i>
            </button>
        </td>
    </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
    
    setupTableEventListeners();
}
// ============================
// REFRESH LOGS FUNKCIÓ
// ============================
function refreshLogs() {
    console.log('🔄 Manual refresh requested');
    loadLogs();
    loadStats();
    showSuccess('Logs refreshed successfully');
}

// VAGY ha már van loadLogs() és loadStats(), egyszerűbben:
function refreshLogs() {
    loadLogs();
    loadStats();
    showSuccess('Logs refreshed');
}
// ============================
// TÁBLÁZAT EVENT LISTENERS
// ============================
function setupTableEventListeners() {
    // Select all checkbox - main
    const selectAllMain = document.getElementById('select-all-logs-main');
    if (selectAllMain) {
        selectAllMain.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.log-checkbox');
            const tableSelectAll = document.getElementById('select-all-logs-table');
            checkboxes.forEach(cb => cb.checked = this.checked);
            if (tableSelectAll) tableSelectAll.checked = this.checked;
            updateDeleteButtonState();
        });
    }
    
    // Select all checkbox - table header
    const selectAllTable = document.getElementById('select-all-logs-table');
    if (selectAllTable) {
        selectAllTable.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.log-checkbox');
            const mainSelectAll = document.getElementById('select-all-logs-main');
            checkboxes.forEach(cb => cb.checked = this.checked);
            if (mainSelectAll) mainSelectAll.checked = this.checked;
            updateDeleteButtonState();
        });
    }
    
    // Individual checkboxes
    const checkboxes = document.querySelectorAll('.log-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            updateDeleteButtonState();
            syncSelectAllCheckboxes();
        });
    });
    
    // Delete selected button
    const deleteBtn = document.getElementById('delete-selected-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteSelectedLogs);
    }
}

// Új helper függvény
function syncSelectAllCheckboxes() {
    const checkboxes = document.querySelectorAll('.log-checkbox');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
    
    const mainSelectAll = document.getElementById('select-all-logs-main');
    const tableSelectAll = document.getElementById('select-all-logs-table');
    
    if (mainSelectAll) mainSelectAll.checked = allChecked;
    if (tableSelectAll) tableSelectAll.checked = allChecked;
}
// ============================
// TÖRLÉS GOMB ÁLLAPOT
// ============================
function updateDeleteButtonState() {
    const checkboxes = document.querySelectorAll('.log-checkbox:checked');
    const deleteBtn = document.getElementById('delete-selected-btn');
    
    if (deleteBtn) {
        if (checkboxes.length > 0) {
            deleteBtn.style.display = 'inline-block';
            deleteBtn.textContent = `Delete Selected (${checkboxes.length})`;
        } else {
            deleteBtn.style.display = 'none';
        }
    }
}

// ============================
// STATISZTIKÁK BETÖLTÉSE
// ============================
async function loadStats(silent = false) {
    try {
        const response = await fetch('/api/api.php?action=logs_stats', {
            method: 'GET',
            credentials: 'include', // ← FONTOS
            headers: {
                'Accept': 'application/json'
            }
        });
        
        // Ellenőrizd a content-type-ot
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('❌ Non-JSON response:', text.substring(0, 200));
            throw new Error('Server returned HTML instead of JSON');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to load stats');
        }
        
        currentStats = data.stats || {};
        displayStats(currentStats);
        
    } catch (error) {
        console.error('❌ Error loading stats:', error);
        if (!silent) {
            showError('Failed to load statistics: ' + error.message);
        }
    }
}

// ============================
// STATISZTIKÁK MEGJELENÍTÉSE
// ============================
function displayStats(stats) {
    console.log('📊 Displaying stats:', stats);
    
    // Total logs
    const totalElement = document.getElementById('totalLogs'); // ✅ Javított ID
    if (totalElement) {
        totalElement.textContent = stats.total || 0;
    } else {
        console.error('❌ Element not found: totalLogs');
    }
    
    // Successful logins
    const successElement = document.getElementById('successfulLogins'); // ✅
    if (successElement) {
        successElement.textContent = stats.successful_logins || 0;
    }
    
    // Failed logins
    const failedElement = document.getElementById('failedLogins'); // ✅
    if (failedElement) {
        failedElement.textContent = stats.failed_logins || 0;
    }
    
    // Today's logs
    const todayElement = document.getElementById('todayLogs'); // ✅
    if (todayElement) {
        todayElement.textContent = stats.today || 0;
    }
    
    // Most active user
    const activeUserElement = document.getElementById('mostActiveUser'); // ✅
    if (activeUserElement) {
        activeUserElement.textContent = stats.most_active_user || 'N/A';
    }
    
    // Action breakdown chart
    if (stats.action_breakdown) {
        displayActionBreakdown(stats.action_breakdown);
    }
}

// ============================
// ACTION BREAKDOWN CHART
// ============================
function displayActionBreakdown(breakdown) {
    console.log('📊 Displaying action breakdown:', breakdown);
    
    const container = document.getElementById('activityBreakdown');
    if (!container) {
        console.error('❌ Element not found: activityBreakdown');
        return;
    }
    
    let html = '<div class="activity-breakdown">';
    
    Object.entries(breakdown).forEach(([action, count]) => {
        const percentage = currentStats.total > 0 
            ? ((count / currentStats.total) * 100).toFixed(1) 
            : 0;
        
        const actionIcon = getActionIcon(action);
        const actionClass = getActionClass(action);
        
        // Karikás progress ring SVG
        const radius = 54;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;
        
        html += `
            <div class="breakdown-circle-card ${actionClass}">
                <div class="circle-card-bg"></div>
                
                <div class="icon-circle-wrapper">
                    <div class="icon-circle ${actionClass}">
                        ${actionIcon}
                        <span class="circle-action-text">${escapeHtml(action)}</span>
                    </div>
                </div>
                
                <div class="circle-card-content">
                    <h4 class="circle-card-title">${getActionLabel(action)}</h4>
                    <div class="circle-card-count">${count}</div>
                    <div class="circle-card-percentage">${percentage}% of total</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Helper függvény az action-hoz emberbarát címke
function getActionLabel(action) {
    const labels = {
        '✅': 'Successful Login',
        '❌': 'Failed Login',
		'⛔': 'Denied',
        '🚪': 'Logout',
        '🚫': 'Forbidden',
        '🔑': 'Password Generated',
        '🔄': 'Update',
        '➕': 'Created',
        '✏️': 'Edited',
        '🗑️': 'Deleted',
        '📤': 'Exported',
        '🧹': 'Cleanup',
        '⚙️': 'Settings'
    };
    return labels[action] || action;
}

// ============================
// LOG RÉSZLETEK MEGTEKINTÉSE
// ============================
async function viewLogDetails(logId) {
    // Keressük meg a logot a már betöltött logok közül
    const log = currentLogs.find(log => log.id == logId);
    
    if (!log) {
        console.error('❌ Log not found in memory:', logId);
        showError('Log not found in loaded logs');
        
        // Ha nem találjuk a memóriában, próbáljuk lekérni (de a Go API-ban nincs endpoint)
        try {
            const response = await fetch(`api/api.php?action=logs_detail&id=${logId}`, {
                method: 'GET',
                credentials: 'same-origin'
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load log details');
            }
            
            showLogDetailsModal(data.log);
            
        } catch (error) {
            console.error('Error loading log details:', error);
            showError('Failed to load log details: ' + error.message);
        }
        return;
    }
    
    // Ha megtaláltuk a memóriában, mutassuk meg
    showLogDetailsModal(log);
}
// ============================
// LOG RÉSZLETEK MODAL
// ============================
function showLogDetailsModal(log) {
    const actionIcon = getActionIcon(log.action);
    const actionClass = getActionClass(log.action);
    
    const modalHtml = `
        <div class="modal-overlay" id="log-details-modal" onclick="closeModal('log-details-modal')">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3><i class="fas fa-info-circle"></i> Log Details #${log.id}</h3>
                    <button class="modal-close" onclick="closeModal('log-details-modal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Username:</label>
                            <span class="user-badge role-${log.user_role || 'vip'}">
                                ${escapeHtml(log.username || 'unknown')}
                            </span>
                        </div>
                        <div class="detail-item">
                            <label>Action:</label>
                            <span class="action-badge ${actionClass}">
                                ${actionIcon} ${escapeHtml(log.action || '')}
                            </span>
                        </div>
                        <div class="detail-item">
                            <label>Channel:</label>
                            <code>${escapeHtml(log.channel || 'N/A')}</code>
                        </div>
                        <div class="detail-item">
                            <label>Command:</label>
                            <code>${escapeHtml(log.command || 'N/A')}</code>
                        </div>
                        <div class="detail-item">
                            <label>IP Address:</label>
                            <code>${escapeHtml(log.ip_address || 'N/A')}</code>
                        </div>
                        <div class="detail-item">
                            <label>Timestamp:</label>
                            <code>${formatTimestamp(log.timestamp)}</code>
                        </div>
                        <div class="detail-item full-width">
                            <label>Details:</label>
                            <pre class="details-pre">${escapeHtml(log.details || 'N/A')}</pre>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('log-details-modal')">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ============================
// EXPORT FUNKCIÓ
// ============================
async function exportLogs() {
    showLoading('export-logs-btn');
    
    try {
        const response = await fetch(`api/api.php?action=logs_export&limit=${currentFilters.limit}`, {
            method: 'GET',
            credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Export failed');
        }
        
        // CSV letöltés
        const blob = new Blob([data.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || 'audit_logs.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showSuccess(`Exported ${data.count} logs successfully`);
        
    } catch (error) {
        console.error('Export error:', error);
        showError('Export failed: ' + error.message);
    } finally {
        hideLoading('export-logs-btn');
    }
}

// ============================
// CLEANUP DIALOG
// ============================
function showCleanupModal() {
    console.log('🧹 Cleanup modal opening...');
    
    // Először töröld a régi modalt (ha van)
    const oldModal = document.getElementById('cleanup-modal');
    if (oldModal) {
        oldModal.remove();
    }
    
    const modalHtml = `
        <div class="modal-overlay" id="cleanup-modal" onclick="closeModal('cleanup-modal')">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3><i class="fas fa-broom"></i> Cleanup Old Logs</h3>
                    <button class="modal-close" onclick="closeModal('cleanup-modal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Delete logs older than:</p>
					<select id="cleanup-days" class="form-control">
						<option value="10">10 days</option>
						<option value="30">30 days</option>
						<option value="60">60 days</option>
						<option value="90" selected>90 days</option>
						<option value="180">180 days</option>
						<option value="365">1 year</option>
						<option value="0">Everything (all logs)</option>
					</select>
                    <p class="warning-text">
                        <i class="fas fa-exclamation-triangle"></i>
                        This action cannot be undone!
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('cleanup-modal')">
                        Cancel
                    </button>
                    <button class="btn btn-danger" onclick="executeCleanup()">
                        <i class="fas fa-broom"></i> Delete Old Logs
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    console.log('✅ Cleanup modal created');
}

// ============================
// CLEANUP VÉGREHAJTÁS
// ============================
async function executeCleanup() {
    const daysSelect = document.getElementById('cleanup-days');
    if (!daysSelect) {
        showError('Cleanup days selector not found');
        return;
    }
    
    const days = parseInt(daysSelect.value);
    
    // EXTRA CONFIRMATION FOR "EVERYTHING" OPTION
    if (days === 0) {
        const confirmed = confirm(
            '⚠️ DANGER: This will delete ALL audit logs permanently!\n\n' +
            'This action cannot be undone.\n\n' +
            'Are you absolutely sure you want to delete EVERYTHING?'
        );
        
        if (!confirmed) {
            showInfo('Everything cleanup cancelled');
            closeModal('cleanup-modal');
            return;
        }
        
        // Double confirmation for "Everything"
        const finalConfirm = prompt(
            'FINAL WARNING: This will delete ALL audit logs.\n\n' +
            'Type "DELETE EVERYTHING" to confirm:'
        );
        
        if (finalConfirm !== 'DELETE EVERYTHING') {
            showError('Everything cleanup cancelled - confirmation failed');
            closeModal('cleanup-modal');
            return;
        }
    }
    
    closeModal('cleanup-modal');
    showLoading('cleanup-logs-btn');
    
    try {
        const response = await fetch('api/api.php?action=logs_cleanup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({ 
                days: days,
                // Add delete_all flag for PHP
                delete_all: (days === 0)
            })
        });
        
        // 🚨 CHECK RESPONSE TYPE
        const responseText = await response.text();
        console.log('Raw cleanup response:', responseText.substring(0, 500));
        
        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Response was:', responseText);
            
            // If we got HTML, probably PHP error
            if (responseText.includes('<br />') || responseText.includes('<b>')) {
                throw new Error('PHP error returned: ' + responseText.replace(/<[^>]*>/g, '').substring(0, 200));
            } else {
                throw new Error('Invalid JSON response: ' + responseText.substring(0, 200));
            }
        }
        
        if (!data.success) {
            throw new Error(data.error || 'Cleanup failed');
        }
        
        if (days === 0) {
            showSuccess(`✅ Deleted ALL logs (${data.deleted_count} total)`);
        } else {
            showSuccess(`✅ Deleted ${data.deleted_count} logs older than ${days} days`);
        }
        
        // Refresh logs and stats
        loadLogs();
        loadStats();
        
    } catch (error) {
        console.error('Cleanup error:', error);
        showError('Cleanup failed: ' + error.message);
    } finally {
        hideLoading('cleanup-logs-btn');
    }
}

// ============================
// MAI LOGOK BETÖLTÉSE
// ============================
async function loadTodayLogs() {
    showLoading('today-logs-btn');
    
    try {
        const response = await fetch('api/api.php?action=logs_today', {
            method: 'GET',
            credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to load today logs');
        }
        
        currentLogs = data.logs || [];
        displayLogs(currentLogs);
        showSuccess(`Showing ${currentLogs.length} logs from today`);
        
    } catch (error) {
        console.error('Error loading today logs:', error);
        showError('Failed to load today logs: ' + error.message);
    } finally {
        hideLoading('today-logs-btn');
    }
}

// ============================
// TÖMEGES TÖRLÉS
// ============================
async function deleteSelectedLogs() {
    const checkboxes = document.querySelectorAll('.log-checkbox:checked');
    const ids = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id));
    
    if (ids.length === 0) {
        showError('No logs selected');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete ${ids.length} logs? This cannot be undone!`)) {
        return;
    }
    
    showLoading('delete-selected-btn');
    
    try {
        console.log('🗑️ Deleting logs:', ids);
        
			const response = await fetch('/api/api.php?action=logs_delete', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				},
				body: JSON.stringify({ ids: ids })
			});
        
        console.log('Response status:', response.status);
        const contentType = response.headers.get('content-type');
        console.log('Content-Type:', contentType);
        
        if (!contentType?.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text.substring(0, 500));
            throw new Error('Server returned HTML instead of JSON');
        }
        
        const data = await response.json();
        console.log('Delete response:', data);
        
        if (!data.success) {
            throw new Error(data.error || 'Delete failed');
        }
        
        showSuccess(`Deleted ${data.deleted_count} log(s) successfully`);
        loadLogs();
        loadStats();
        
    } catch (error) {
        console.error('Delete error:', error);
        showError('Delete failed: ' + error.message);
    } finally {
        hideLoading('delete-selected-btn');
    }
}
// ============================
// HELPER FÜGGVÉNYEK
// ============================

function getActionIcon(action) {
    const icons = {
        '✅': '<i class="fas fa-check-circle"></i>',
        '❌': '<i class="fas fa-times-circle"></i>',
        '🚪': '<i class="fas fa-door-open"></i>',      // Logout
        '🚫': '<i class="fas fa-ban"></i>',             // Forbidden
        '🔑': '<i class="fas fa-key"></i>',             // Password
        '🔄': '<i class="fas fa-sync-alt"></i>',        // Update
        '➕': '<i class="fas fa-plus-circle"></i>',     // Add
        '✏️': '<i class="fas fa-edit"></i>',
        '🗑️': '<i class="fas fa-trash-alt"></i>',
        '📤': '<i class="fas fa-file-export"></i>',
        '🧹': '<i class="fas fa-broom"></i>',
        '⚙️': '<i class="fas fa-cog"></i>'
    };
    
    return icons[action] || '<i class="fas fa-circle"></i>';
}

function getActionClass(action) {
    if (action === '✅') return 'success';
    if (action === '❌') return 'error';
    if (action === '🗑️') return 'danger';
    if (action === '✏️') return 'warning';
    return 'info';
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    
    try {
        const date = new Date(timestamp);
        return date.toLocaleString('hu-HU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (e) {
        return timestamp;
    }
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================
// UI HELPER FUNKCIÓK
// ============================

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('loading');
        element.disabled = true;
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('loading');
        element.disabled = false;
    }
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}


// ============================
// EXPORT GLOBÁLIS FÜGGVÉNYEK
// ============================
window.viewLogDetails = viewLogDetails;
window.closeModal = closeModal;
window.executeCleanup = executeCleanup;
window.refreshLogs = refreshLogs;  
window.exportLogs = exportLogs;   
window.loadTodayLogs = loadTodayLogs; 
window.deleteSelectedLogs = deleteSelectedLogs; 
window.showCleanupModal = showCleanupModal; 