// js/database.js - Database oldal logika

let passwordsData = [];
let showPasswords = true; // Biztonság: alapértelmezetten nem mutatjuk a jelszavakat
// =====================
// INIT - MÓDOSÍTOTT
// =====================
document.addEventListener('DOMContentLoaded', async function() {
    // ✅ ÚJ: Töltsük be a jelenlegi felhasználót
    await loadCurrentUser();
    
    loadPasswords();
    loadDatabaseStats();
    checkExpiredPasswords();
    setupEventListeners();
    
    // Auto refresh every 30 seconds
    setInterval(() => {
        loadPasswords();
        checkExpiredPasswords();
    }, 30000);
    
    // 24 óránként automatikus törlés
    setInterval(autoDeleteOldPasswords, 24 * 60 * 60 * 1000);
});

// ✅ ÚJ FÜGGVÉNY: Bejelentkezett user betöltése
async function loadCurrentUser() {
    try {
        const result = await apiCall('check_session', {}, 'GET');
        
        if (result.success && result.logged_in && result.username) {
            localStorage.setItem('username', result.username);
            localStorage.setItem('role', result.role);
            console.log('✅ Current user loaded:', result.username, '(' + result.role + ')');
        } else {
            console.warn('⚠️ Not logged in or session expired');
            // Opcionálisan: átirányítás login oldalra
            // window.location.href = 'index.php';
        }
    } catch (error) {
        console.error('❌ Failed to load current user:', error);
    }
}
// =====================
// CHECK EXPIRED PASSWORDS
// =====================
async function checkExpiredPasswords() {
    try {
        // Módosított változat - használjuk a már létező database_list action-t
        const result = await apiCall('database_list', {}, 'GET');
        
        if (result.success && result.passwords) {
            // Számoljuk ki helyben a lejárt jelszavakat
            const oldExpiredCount = result.passwords.filter(p => 
                p.expired && (p.hours_since_expiry || 0) > 24
            ).length;
            
            if (oldExpiredCount > 0) {
                showExpiredNotification(oldExpiredCount);
                
                // Opcionálisan: mutassuk az értesítést az oldalon is
                if (!document.getElementById('autoDeleteNotification')) {
                    showAutoDeleteNotification(oldExpiredCount);
                }
            }
        }
    } catch (error) {
        console.error('Failed to check expired passwords:', error);
    }
}

function showExpiredNotification(count) {
    // Notification logic...
    console.log(`⚠️ ${count} passwords expired more than 24 hours ago`);
}

function showAutoDeleteNotification(expiredCount) {
    // Csak akkor mutassuk, ha nincs már megjelenítve
    const existingNotification = document.getElementById('autoDeleteNotification');
    if (existingNotification) {
        return;
    }
    
    const notification = document.createElement('div');
    notification.id = 'autoDeleteNotification';
    notification.className = 'notification notification-warning';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        padding: 15px;
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 5px;
        color: #856404;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        max-width: 400px;
    `;
    
    const hoursLeft = 24; // A kódban lehet számolni, hogy mennyi idő van hátra
    
    notification.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>⚠️ ${expiredCount} expired password(s)</strong>
                <div style="font-size: 0.9em; margin-top: 5px;">
                    Will be automatically deleted in <span id="deleteCountdown">${hoursLeft}</span> hours.
                    <button onclick="deleteExpiredNow()" style="margin-left: 10px; padding: 3px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">Delete Now</button>
                </div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 1.2em; cursor: pointer; color: #666;">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Countdown timer
    let hours = hoursLeft;
    const countdownElement = document.getElementById('deleteCountdown');
    const countdownInterval = setInterval(() => {
        hours--;
        if (hours <= 0) {
            clearInterval(countdownInterval);
            notification.remove();
            autoDeleteOldPasswords();
        } else {
            countdownElement.textContent = hours;
        }
    }, 3600000); // 1 óra = 3,600,000 ms
}
// =====================
// AUTO DELETE OLD PASSWORDS
// =====================
async function autoDeleteOldPasswords() {
    try {
        const result = await apiCall('database_auto_cleanup', { 
            max_age_hours: 24 
        });
        
        if (result.success && result.deleted_count > 0) {
            console.log(`Auto-deleted ${result.deleted_count} passwords older than 24 hours`);
            loadPasswords();
            loadDatabaseStats();
        }
    } catch (error) {
        console.error('Auto cleanup failed:', error);
    }
}
// =====================
// DELETE EXPIRED NOW
// =====================
async function deleteExpiredNow() {
    if (!confirmAction('Are you sure you want to delete all passwords expired more than 24 hours ago?')) {
        return;
    }
    
    try {
        const result = await apiCall('database_delete_old_expired', { 
            hours_threshold: 24 
        });
        
        if (result.success) {
            const notification = document.getElementById('autoDeleteNotification');
            if (notification) notification.remove();
            
            showNotification(`Deleted ${result.deleted_count} passwords older than 24 hours`, 'success');
            loadPasswords();
            loadDatabaseStats();
        } else {
            showNotification(result.error || 'Delete failed', 'error');
        }
    } catch (error) {
        showNotification('Failed to delete old passwords', 'error');
    }
}

// =====================
// EVENT LISTENERS
// =====================
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('passwordSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterPasswords(this.value);
        });
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            filterPasswordsByStatus(this.value);
        });
    }
    
    // Generate password form
    const generateForm = document.getElementById('generatePasswordForm');
    if (generateForm) {
        generateForm.addEventListener('submit', handleGeneratePassword);
    }
    
    // Show passwords toggle
    document.addEventListener('keydown', function(e) {
        // Ctrl+Shift+P = show passwords toggle
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            showPasswords = !showPasswords;
            console.log('Show passwords:', showPasswords ? 'ON' : 'OFF');
            renderPasswords(passwordsData);
            showNotification(`Passwords ${showPasswords ? 'visible' : 'hidden'}`, 'info');
        }
    });
}


// =====================
// LOAD PASSWORDS
// =====================
async function loadPasswords() {
    const tbody = document.getElementById('passwordsTableBody');
    if (!tbody) return;
    
    try {
        const result = await apiCall('database_list', {}, 'GET');
        
        if (result.success) {
            passwordsData = result.passwords || [];
            renderPasswords(passwordsData);
            
            // Update stats display
            if (result.stats) {
                document.getElementById('activePasswords').textContent = result.stats.active || 0;
                document.getElementById('expiredPasswords').textContent = result.stats.expired || 0;
                
                // Show/hide delete old button
                const deleteOldBtn = document.getElementById('deleteOldBtn');
                if (deleteOldBtn && result.stats.expired_old > 0) {
                    deleteOldBtn.style.display = 'inline-block';
                    deleteOldBtn.textContent = `⚠️ Delete Old (${result.stats.expired_old})`;
                }
            }
        } else {
            tbody.innerHTML = '<tr><td colspan="10" class="error">Failed to load passwords: ' + (result.error || 'Unknown error') + '</td></tr>';
        }
    } catch (error) {
        console.error('Load passwords error:', error);
        tbody.innerHTML = '<tr><td colspan="10" class="error">Error loading passwords: ' + error.message + '</td></tr>';
    }
}


// =====================
// RENDER PASSWORDS
// =====================
function renderPasswords(passwords) {
    const tbody = document.getElementById('passwordsTableBody');
    if (!tbody) return;
    
    if (passwords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: #666;">No passwords found</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    passwords.forEach(pwd => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', pwd.id);
        
        // Stílus alapján státusz
        if (pwd.expired) {
            const hoursSince = pwd.hours_since_expiry || 0;
            if (hoursSince > 24) {
                row.classList.add('expired-old');
            } else {
                row.classList.add('expired-recent');
            }
        }
        
        // Státusz szöveg
        let statusText, statusClass;
        if (pwd.expired) {
            const hours = pwd.hours_since_expiry || 0;
            if (hours > 24) {
                statusText = `⏳ Expired ${Math.floor(hours/24)} days ago`;
                statusClass = 'status-old';
            } else {
                statusText = '❌ Expired';
                statusClass = 'status-expired';
            }
        } else {
            statusText = '✅ Active';
            statusClass = 'status-active';
        }
        
        // Jelszó megjelenítés (biztonság)
        let passwordDisplay;
        if (showPasswords && !pwd.expired) {
            passwordDisplay = pwd.password || 'N/A';
        } else {
            passwordDisplay = '••••••';
        }
        
        // Time left / expired time
        let timeDisplay;
        if (pwd.expired) {
            const hours = pwd.hours_since_expiry || 0;
            if (hours > 24) {
                timeDisplay = `${Math.floor(hours/24)} days ago`;
            } else {
                timeDisplay = `${hours} hours ago`;
            }
        } else {
            timeDisplay = formatTimeLeft(pwd.time_left);
        }
        
        row.innerHTML = `
            <td>${pwd.id}</td>
            <td><strong>${sanitizeInput(pwd.username)}</strong></td>
            <td>
                <code style="font-family: monospace; font-weight: bold;">${passwordDisplay}</code>
                ${!pwd.expired ? `<br><small><a href="#" onclick="togglePassword(${pwd.id}); return false;">👁️ Show/Hide</a></small>` : ''}
            </td>
            <td>${formatDate(pwd.expires_at)}</td>
            <td>${timeDisplay}</td>
            <td>
                <span class="badge ${pwd.uses > 0 ? 'badge-success' : 'badge-secondary'}">
                    ${pwd.uses || 0}
                </span>
            </td>
            <td>${sanitizeInput(pwd.generated_by || 'system')}</td>
            <td>${formatDate(pwd.created_at)}</td>
            <td><span class="${statusClass}">${statusText}</span></td>
            <td>
                ${!pwd.expired ? `
                    <button class="btn-sm btn-info" onclick="copyPasswordToClipboard('${pwd.password || ''}')" title="Copy password">
                        📋 Copy
                    </button>
                ` : ''}
                <button class="btn-sm btn-danger" onclick="deletePassword(${pwd.id})" title="Delete password">
                    🗑️ Delete
                </button>
                ${pwd.expired && (pwd.hours_since_expiry || 0) > 24 ? `
                    <button class="btn-sm btn-warning" onclick="deleteOldPassword(${pwd.id})" title="Delete old expired">
                        ⚠️ Old
                    </button>
                ` : ''}
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// =====================
// PASSWORD TOGGLE
// =====================
function togglePassword(id) {
    const password = passwordsData.find(p => p.id === id);
    if (!password) return;
    
    const row = document.querySelector(`tr[data-id="${id}"]`);
    const passwordCell = row.querySelector('td:nth-child(3) code');
    
    if (passwordCell.textContent === '••••••') {
        passwordCell.textContent = password.password || 'N/A';
    } else {
        passwordCell.textContent = '••••••';
    }
}

// =====================
// FORMAT TIME LEFT
// =====================
function formatTimeLeft(seconds) {
    if (seconds <= 0) return 'Expired';
    
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (minutes > 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    }
    
    return `${minutes}m ${secs}s`;
}

// =====================
// COPY PASSWORD
// =====================
function copyPasswordToClipboard(password) {
    if (!password) {
        showNotification('No password to copy', 'error');
        return;
    }
    
    copyToClipboard(password);
    showNotification('Password copied to clipboard', 'success');
}

// =====================
// DELETE PASSWORD
// =====================
async function deletePassword(id) {
    const password = passwordsData.find(p => p.id === id);
    if (!password) {
        showNotification('❌ Password not found', 'error');
        return;
    }
    
    // Frontend védelem - ezek után a backend hiba NEM fog előjönni
    if (password.username && password.username.toLowerCase() === 'owner') {
        showNotification('🛡️ Owner password is protected', 'warning');
        return;
    }
    
    
    if (!confirmAction(`Delete password for ${password.username}?`)) {
        return;
    }
    
    try {
        const result = await apiCall('database_delete', { username: password.username });
        
        if (result.success) {
            showNotification('✅ Password deleted', 'success');
            loadPasswords();
            loadDatabaseStats();
        } else {
            showNotification('❌ ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('❌ Delete failed', 'error');
    }
}

async function deleteOldPassword(id) {
    if (!confirmAction('Delete this old expired password?')) {
        return;
    }
    
    await deletePassword(id);
}

async function deleteOldExpired() {
    if (!confirmAction('Delete ALL passwords expired more than 24 hours ago?')) {
        return;
    }
    
    try {
        const result = await apiCall('database_delete_old_expired', { hours_threshold: 24 });
        
        if (result.success) {
            showNotification(`Deleted ${result.deleted_count} old expired passwords`, 'success');
            loadPasswords();
            loadDatabaseStats();
        } else {
            showNotification(result.error || 'Delete failed', 'error');
        }
    } catch (error) {
        showNotification('Failed to delete old passwords', 'error');
    }
}

// =====================
// GENERATE PASSWORD
// =====================
function showGeneratePasswordModal() {
    openModal('generatePasswordModal');
    document.getElementById('generatedPasswordResult').style.display = 'none';
    document.getElementById('generatePasswordForm').reset();
}

function closeGeneratePasswordModal() {
    closeModal('generatePasswordModal');
}

async function handleGeneratePassword(e) {
    e.preventDefault();
    
    const username = document.getElementById('genUsername').value.trim();
    const expiresIn = parseInt(document.getElementById('genExpiresIn').value);
    
    // ✅ JAVÍTVA: Biztosan beolvassuk a select értékét
    const maxUsesSelect = document.getElementById('genMaxUses');
    let maxUses = 10; // alapértelmezett
    
    if (maxUsesSelect && maxUsesSelect.value !== undefined && maxUsesSelect.value !== null && maxUsesSelect.value !== '') {
        const parsed = parseInt(maxUsesSelect.value);
        if (!isNaN(parsed)) {
            maxUses = parsed;
        }
    }
    
    console.log('🎯 Form Data:', { 
        username, 
        expiresIn, 
        maxUses,
        maxUsesSelectExists: !!maxUsesSelect,
        selectValue: maxUsesSelect ? maxUsesSelect.value : 'SELECT NOT FOUND',
        selectText: maxUsesSelect ? maxUsesSelect.options[maxUsesSelect.selectedIndex].text : 'N/A'
    });
    
    if (!username) {
        showNotification('Username is required', 'error');
        return;
    }
    
    try {
        // ✅ MINDIG küldjük a max_uses-t!
        const dataToSend = {
            username: username,
            expires_in: expiresIn,
            max_uses: maxUses 
        };
        
        console.log('📤 Sending data:', dataToSend);
        
        const result = await apiCall('database_generate', dataToSend, 'POST');
        
        console.log('📥 API Response:', {
            max_uses_sent: maxUses,
            max_uses_received: result.max_uses,
            max_uses_display: result.max_uses_display
        });
        
        if (result.success) {
            // Megjelenítés
            const displayMaxUses = result.max_uses === 0 ? 'unlimited' : result.max_uses;
            
            document.getElementById('resultUsername').textContent = result.username;
            document.getElementById('resultPassword').textContent = result.password;
            document.getElementById('resultExpires').textContent = result.expires_in;
            document.getElementById('resultMaxUses').textContent = displayMaxUses;
            document.getElementById('resultExpiresAt').textContent = result.expires_at || 'N/A';
            
            document.getElementById('generatedPasswordResult').style.display = 'block';
            
            showNotification('Password generated successfully', 'success');
            
            // Refresh data
            setTimeout(() => {
                loadPasswords();
                loadDatabaseStats();
            }, 1000);
            
            // Scroll to result
            document.getElementById('generatedPasswordResult').scrollIntoView({ behavior: 'smooth' });
        } else {
            showNotification(result.error || 'Failed to generate password', 'error');
        }
    } catch (error) {
        console.error('Generate password error:', error);
        showNotification('Failed to generate password: ' + error.message, 'error');
    }
}


function copyPassword() {
    const password = document.getElementById('resultPassword').textContent;
    copyToClipboard(password);
    showNotification('Password copied to clipboard', 'success');
}

function copyAllInfo() {
    const username = document.getElementById('resultUsername').textContent;
    const password = document.getElementById('resultPassword').textContent;
    const expires = document.getElementById('resultExpires').textContent;
    const maxUses = document.getElementById('resultMaxUses').textContent;
    const expiresAt = document.getElementById('resultExpiresAt').textContent;
    
    const info = `Username: ${username}\nPassword: ${password}\nExpires in: ${expires} minutes\nMax uses: ${maxUses}\nExpires at: ${expiresAt}`;
    
    copyToClipboard(info);
    showNotification('All info copied to clipboard', 'success');
}


// =====================
// CLEANUP EXPIRED
// =====================
async function cleanupExpired() {
    if (!confirmAction('Are you sure you want to delete all expired passwords?')) {
        return;
    }
    
    try {
        const result = await apiCall('database_cleanup', {});
        
        if (result.success) {
            showNotification(`Deleted ${result.deleted_count} expired passwords`, 'success');
            loadPasswords();
            loadDatabaseStats();
        } else {
            showNotification(result.error || 'Cleanup failed', 'error');
        }
    } catch (error) {
        showNotification('Failed to cleanup expired passwords', 'error');
    }
}

// =====================
// EXPORT DATABASE
// =====================
async function exportDatabase() {
    const filter = document.getElementById('statusFilter').value;
    
    try {
        const result = await apiCall('database_export', { filter: filter });
        
        if (result.success) {
            // CSV download
            const blob = new Blob([result.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.filename;
            a.click();
            window.URL.revokeObjectURL(url);
            
            showNotification('Database exported successfully', 'success');
        } else {
            showNotification('Export failed: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        showNotification('Failed to export database', 'error');
    }
}

// =====================
// LOAD DATABASE STATS
// =====================
async function loadDatabaseStats() {
    try {
        const result = await apiCall('database_stats', {}, 'GET');
        
        if (result.success) {
            const stats = result.stats;
            document.getElementById('activePasswords').textContent = stats.active || 0;
            document.getElementById('expiredPasswords').textContent = stats.expired || 0;
            document.getElementById('totalUses').textContent = stats.total_uses || 0;
            document.getElementById('avgUses').textContent = stats.avg_uses || '0.0';
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}


// =====================
// FILTER PASSWORDS
// =====================
function filterPasswords(searchTerm) {
    const filtered = passwordsData.filter(pwd => {
        const search = searchTerm.toLowerCase();
        return pwd.username.toLowerCase().includes(search) ||
               (pwd.generated_by && pwd.generated_by.toLowerCase().includes(search));
    });
    
    renderPasswords(filtered);
}

function filterPasswordsByStatus(status) {
    if (!status) {
        renderPasswords(passwordsData);
        return;
    }
    
    const filtered = passwordsData.filter(pwd => {
        const hoursSinceExpiry = pwd.hours_since_expiry || 0;
        
        switch(status) {
            case 'active':
                return !pwd.expired;
            case 'expired':
                return pwd.expired;
            case 'expired_24h':
                return pwd.expired && hoursSinceExpiry <= 24;
            case 'expired_old':
                return pwd.expired && hoursSinceExpiry > 24;
            default:
                return true;
        }
    });
    
    renderPasswords(filtered);
}


// =====================
// FILTER - ÚJ OPTION
// =====================
function filterPasswordsByStatus(status) {
    if (!status) {
        renderPasswords(passwordsData);
        return;
    }
    
    const filtered = passwordsData.filter(pwd => {
        const hoursSinceExpiry = pwd.hours_since_expiry || 0;
        
        switch(status) {
            case 'active':
                return !pwd.expired;
            case 'expired':
                return pwd.expired;
            case 'expired_24h':
                return pwd.expired && hoursSinceExpiry <= 24;
            case 'expired_old':
                return pwd.expired && hoursSinceExpiry > 24;
            default:
                return true;
        }
    });
    
    renderPasswords(filtered);
}

// =====================
// REFRESH DATABASE
// =====================
function refreshDatabase() {
    loadPasswords();
    loadDatabaseStats();
    document.getElementById('passwordSearch').value = '';
    document.getElementById('statusFilter').value = '';
    showNotification('Database refreshed', 'info');
}