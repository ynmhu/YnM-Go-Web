// js/dashboard.js - Dashboard funkcionalitás restart gombbal

// =====================
// BOT CONTROL - JAVÍTVA: JOGOSULTSÁG ELLENŐRZÉSSEL
// =====================
async function restartBot() {
    console.log('restartBot() called');
    
    // JAVÍTVA: Effective role ellenőrzése
    try {
        const dashboardData = await apiCall('dashboard');
        const effectiveRole = dashboardData.stats?.effective_role;
        
        if (!['owner', 'admin'].includes(effectiveRole)) {
            showNotification('❌ Permission denied: Only owners and admins can restart the bot', 'error');
            return;
        }
    } catch (error) {
        console.error('Permission check failed:', error);
    }
    
    if (!confirm('⚠️ Are you sure you want to restart the bot?\n\nThis will disconnect all users temporarily.')) {
        console.log('User cancelled restart');
        return;
    }
    
    try {
        showNotification('🔄 Restarting bot...', 'info');
        console.log('Calling API: bot_restart');
        
        const result = await apiCall('bot_restart');
        console.log('API response:', result);
        
        if (result.success) {
            showNotification('✅ Bot is restarting! Please wait 10 seconds...', 'success');
            
            // 10 másodperc múlva ellenőrizze a státuszt
            setTimeout(() => {
                checkBotStatus();
            }, 10000);
        } else {
            console.error('Restart failed:', result.error);
            showNotification('❌ Failed to restart bot: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Restart exception:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

async function reconnectIRC() {
    // JAVÍTVA: Effective role ellenőrzése
    try {
        const dashboardData = await apiCall('dashboard');
        const effectiveRole = dashboardData.stats?.effective_role;
        
        if (!['owner', 'admin'].includes(effectiveRole)) {
            showNotification('❌ Permission denied: Only owners and admins can reconnect IRC', 'error');
            return;
        }
    } catch (error) {
        console.error('Permission check failed:', error);
    }
    
    if (!confirm('🔌 Reconnect IRC connection?')) {
        return;
    }
    
    try {
        showNotification('🔌 Reconnecting IRC...', 'info');
        
        const result = await apiCall('bot_reconnect');
        
        if (result.success) {
            showNotification('✅ IRC reconnecting!', 'success');
            setTimeout(() => checkBotStatus(), 5000);
        } else {
            showNotification('❌ Failed: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

async function reloadBot() {
    // JAVÍTVA: Effective role ellenőrzése
    try {
        const dashboardData = await apiCall('dashboard');
        const effectiveRole = dashboardData.stats?.effective_role;
        
        if (!['owner', 'admin'].includes(effectiveRole)) {
            showNotification('❌ Permission denied: Only owners and admins can reload bot', 'error');
            return;
        }
    } catch (error) {
        console.error('Permission check failed:', error);
    }
    
    if (!confirm('♻️ Reload bot configuration?\n\nThis will reload plugins and settings without disconnecting.')) {
        console.log('User cancelled reload');
        return;
    }
    
    try {
        showNotification('♻️ Reloading configuration...', 'info');
        console.log('Calling API: bot_reload');
        
        const result = await apiCall('bot_reload');
        console.log('API response:', result);
        
        if (result.success) {
            showNotification('✅ Configuration reloaded!', 'success');
        } else {
            console.error('Reload failed:', result.error);
            showNotification('❌ Failed to reload: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Reload exception:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

async function checkBotStatus() {
    try {
        // Próbáljuk meg az API hívást biztonságosan
        const result = await apiCall('bot_status', { command: 'status' });
        
        // FONTOS: Ellenőrizzük, hogy van-e 'result' és 'result.success'
        if (result && result.success) {
            const statusEl = document.getElementById('bot-status');
            if (statusEl) {
                statusEl.textContent = '🟢 Online';
                statusEl.style.color = '#28a745';
            }
             showNotification('✅ Bot is online', 'success'); // Ezt lehet kommentben hagyni, hogy ne jöjjön fel mindig
        } else {
            // Ha nincs success vagy hibás a válasz
            const statusEl = document.getElementById('bot-status');
            if (statusEl) {
                statusEl.textContent = '⚠️ Unknown';
                statusEl.style.color = '#ffc107';
            }
            console.warn('Bot status check returned no success:', result);
        }
    } catch (error) {
        // Csak logoljuk a hibát, ne dobjunk fel újra
        console.error('Status check error:', error);
        const statusEl = document.getElementById('bot-status');
        if (statusEl) {
            statusEl.textContent = '⚠️ Error';
            statusEl.style.color = '#ffc107';
        }
    }
}

// =====================
// ÚJ FUNKCIÓK: ROLE MEGJELENÍTÉS
// =====================

function updateRoleDisplay(userInfo, stats) {
    // Role indicator frissítése
    const roleElement = document.getElementById('user-role-display');
    if (roleElement && userInfo) {
        const globalRole = userInfo.global_role || 'user';
        const effectiveRole = userInfo.effective_role || globalRole;
        
        let roleHtml = `
            <span class="role-badge role-${effectiveRole}">
                ${effectiveRole.toUpperCase()}
            </span>
        `;
        
        // Ha a channel role különbözik a globálistól
        if (effectiveRole !== globalRole && stats?.user_channels?.length > 0) {
            const channelRoles = stats.user_channels
                .map(ch => `${ch.channel} (${ch.role})`)
                .join(', ');
                
            roleHtml += `
                <span class="channel-role-info" style="margin-left: 10px; font-size: 0.9em; color: #6c757d;">
                    (Globális: ${globalRole})
                    <br>
                    <small>Channel role-ok: ${channelRoles}</small>
                </span>
            `;
        }
        
        roleElement.innerHTML = roleHtml;
    }
}

function updateUserInfoWithChannels(userInfo, stats) {
    // User info frissítése channel role-okkal
    const userInfoElement = document.getElementById('user-details');
    if (userInfoElement && userInfo) {
        let userHtml = `
            <strong>${userInfo.username || 'N/A'}</strong>
            <br>
            <small>Effective role: ${userInfo.effective_role || 'user'}</small>
        `;
        
        // Channel role-ok hozzáadása
        if (stats?.user_channels && stats.user_channels.length > 0) {
            userHtml += '<br><small>Channel permissions:</small>';
            userHtml += '<ul style="font-size: 0.85em; margin: 5px 0 0 20px;">';
            
            stats.user_channels.forEach(channel => {
                const badgeClass = channel.role === 'admin' || channel.role === 'owner' 
                    ? 'badge-success' 
                    : channel.role === 'mod' 
                        ? 'badge-warning' 
                        : 'badge-info';
                        
                userHtml += `
                    <li>
                        ${channel.channel}: 
                        <span class="badge ${badgeClass}">${channel.role}</span>
                    </li>
                `;
            });
            
            userHtml += '</ul>';
        }
        
        userInfoElement.innerHTML = userHtml;
    }
}

function updateStat(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value || '0';
    }
}

function updateRecentActivity(activities) {
    const tbody = document.querySelector('#recent-activity tbody');
    
    if (!activities || activities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No recent activity</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    activities.forEach(activity => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(activity.timestamp)}</td>
            <td><strong>${escapeHtml(activity.username)}</strong></td>
            <td>${activity.action}</td>
            <td>${escapeHtml(activity.details || '-')}</td>
        `;
        tbody.appendChild(row);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =====================
// MENÜ FRISSÍTÉS EFFECTIVE ROLE ALAPJÁN
// =====================
function updateMenuVisibility(effectiveRole, globalRole, hasChannelAdmin) {
    console.log('Updating menu visibility - Effective:', effectiveRole, 'Global:', globalRole);
    
    // Menü elemek keresése és frissítése
    const menuItems = {
        // Users menü
        'nav-users': ['admin', 'owner', 'mod'].includes(effectiveRole),
        'users-menu': ['admin', 'owner', 'mod'].includes(effectiveRole),
        'users-link': ['admin', 'owner', 'mod'].includes(effectiveRole),
        
        // Channels menü
        'nav-channels': ['admin', 'owner', 'mod'].includes(effectiveRole),
        'channels-menu': ['admin', 'owner', 'mod'].includes(effectiveRole),
        'channels-link': ['admin', 'owner', 'mod'].includes(effectiveRole),
        
        // Channel Users menü
        'nav-channel-users': ['admin', 'owner', 'mod', 'vip'].includes(effectiveRole),
        'channel-users-menu': ['admin', 'owner', 'mod', 'vip'].includes(effectiveRole),
        'channel-users-link': ['admin', 'owner', 'mod', 'vip'].includes(effectiveRole),
        
        // Logs menü
        'nav-logs': ['vip', 'mod', 'admin', 'owner'].includes(effectiveRole),
        'logs-menu': ['vip', 'mod', 'admin', 'owner'].includes(effectiveRole),
        'logs-link': ['vip', 'mod', 'admin', 'owner'].includes(effectiveRole),
        
        // Database menü
        'nav-database': ['admin', 'owner', 'mod'].includes(effectiveRole),
        'database-menu': ['admin', 'owner', 'mod'].includes(effectiveRole),
        'database-link': ['admin', 'owner', 'mod'].includes(effectiveRole),
        
        // Bot Control menü - CSAK GLOBÁLIS
        'nav-bot-control': ['admin', 'owner'].includes(globalRole),
        'bot-control-menu': ['admin', 'owner'].includes(globalRole),
        'bot-control-link': ['admin', 'owner'].includes(globalRole),
        
        // Settings menü - CSAK GLOBÁLIS
        'nav-settings': ['admin', 'owner'].includes(globalRole),
        'settings-menu': ['admin', 'owner'].includes(globalRole),
        'settings-link': ['admin', 'owner'].includes(globalRole),
    };
    
    // Debug: milyen ID-ket találunk?
    console.log('Looking for menu IDs...');
    
    // Minden lehetséges ID-t próbáljunk meg
    Object.keys(menuItems).forEach(menuId => {
        const element = document.getElementById(menuId);
        
        if (element) {
            console.log(`Found menu element: ${menuId}, showing: ${menuItems[menuId]}`);
            
            // Ha li elem, akkor azt rejtsük el/mutassuk
            if (element.tagName === 'LI') {
                element.style.display = menuItems[menuId] ? 'block' : 'none';
            } 
            // Ha a elem, akkor a szülő li-t
            else if (element.tagName === 'A') {
                const parentLi = element.closest('li');
                if (parentLi) {
                    parentLi.style.display = menuItems[menuId] ? 'block' : 'none';
                }
            }
        }
    });
    
    // Ha nem talál ID-ket, próbáljuk class alapján
    if (document.querySelectorAll('[id^="nav-"], [id$="-menu"]').length === 0) {
        console.log('No menu IDs found, trying class-based...');
        updateMenuVisibilityByClass(effectiveRole, globalRole);
    }
}

// Backup: Class alapú menü frissítés
function updateMenuVisibilityByClass(effectiveRole, globalRole) {
    console.log('Trying class-based menu update...');
    
    // Keressünk linkeket szöveg alapján
    const menuRules = [
        { text: 'Users', selector: 'a', show: ['admin', 'owner', 'mod'].includes(effectiveRole) },
        { text: 'Channels', selector: 'a', show: ['admin', 'owner', 'mod'].includes(effectiveRole) },
        { text: 'Channel Users', selector: 'a', show: ['admin', 'owner', 'mod', 'vip'].includes(effectiveRole) },
        { text: 'Audit Logs', selector: 'a', show: ['vip', 'mod', 'admin', 'owner'].includes(effectiveRole) },
        { text: 'Database', selector: 'a', show: ['admin', 'owner', 'mod'].includes(effectiveRole) },
        { text: 'Bot Control', selector: 'a', show: ['admin', 'owner'].includes(globalRole) },
        { text: 'Settings', selector: 'a', show: ['admin', 'owner'].includes(globalRole) },
        { text: 'Profile', selector: 'a', show: true }, // Mindig látszik
        { text: 'Dashboard', selector: 'a', show: true }, // Mindig látszik
        { text: 'Logout', selector: 'a', show: true }, // Mindig látszik
    ];
    
    menuRules.forEach(rule => {
        const elements = document.querySelectorAll(rule.selector);
        elements.forEach(element => {
            if (element.textContent.trim().includes(rule.text)) {
                const parentLi = element.closest('li');
                if (parentLi) {
                    parentLi.style.display = rule.show ? 'block' : 'none';
                    console.log(`${rule.text}: ${rule.show ? 'SHOW' : 'HIDE'}`);
                }
            }
        });
    });
}

function updateNavigationBasedOnRole() {
    try {
        // 1. Próbáljuk a sessionStorage/localStorage-t
        let effectiveRole = sessionStorage.getItem('effective_role') || 
                          localStorage.getItem('effective_role') || 
                          'user';
        
        let globalRole = sessionStorage.getItem('global_role') || 
                       localStorage.getItem('global_role') || 
                       'user';
        
        // 2. Ha nincs, nézzük a DOM-ban lévő badge-eket
        if (effectiveRole === 'user') {
            const roleBadge = document.querySelector('.role-badge');
            if (roleBadge) {
                const badgeClass = Array.from(roleBadge.classList).find(c => c.startsWith('role-'));
                if (badgeClass) {
                    effectiveRole = badgeClass.replace('role-', '');
                }
            }
        }
        
        // 3. Channel admin ellenőrzés
        const hasChannelAdmin = document.querySelector('.channel-admin-badge') !== null;
        
        console.log('Menu update - Effective:', effectiveRole, 'Global:', globalRole, 'Channel Admin:', hasChannelAdmin);
        
        // 4. Menü frissítése
        updateMenuVisibility(effectiveRole, globalRole, hasChannelAdmin);
        
    } catch (error) {
        console.error('Error updating navigation:', error);
    }
}

function updateNavigationBasedOnRole() {
    try {
        // JAVÍTVA: Elsőként próbáljuk a sessionStorage-t, ha nincs akkor localStorage
        let effectiveRole = sessionStorage.getItem('effective_role') || 
                          localStorage.getItem('effective_role') || 
                          'user';
        
        let globalRole = sessionStorage.getItem('global_role') || 
                       localStorage.getItem('global_role') || 
                       'user';
        
        // Ha nincs effectiveRole, akkor nézzük a URL-ből vagy a DOM-ból
        if (effectiveRole === 'user') {
            // Nézzük meg van-e role badge a DOM-ban
            const roleBadge = document.querySelector('.role-badge');
            if (roleBadge) {
                const badgeClass = Array.from(roleBadge.classList).find(c => c.startsWith('role-'));
                if (badgeClass) {
                    effectiveRole = badgeClass.replace('role-', '');
                }
            }
        }
        
        console.log(`Effective role for menu: ${effectiveRole}, Global: ${globalRole}`);
        
        // Menü elemek elrejtése/megjelenítése
        updateMenuVisibility(effectiveRole);
        
    } catch (error) {
        console.error('Error updating navigation:', error);
    }
}

function updateMenuVisibilityByClass(effectiveRole, globalRole) {
    console.log('Trying class-based menu update...');
    
    // Keressünk linkeket szöveg alapján
    const menuRules = [
        { text: 'Users', selector: 'a', show: ['admin', 'owner', 'mod'].includes(effectiveRole) },
        { text: 'Channels', selector: 'a', show: ['admin', 'owner', 'mod'].includes(effectiveRole) },
        { text: 'Channel Users', selector: 'a', show: ['admin', 'owner', 'mod', 'vip'].includes(effectiveRole) },
        { text: 'Audit Logs', selector: 'a', show: ['vip', 'mod', 'admin', 'owner'].includes(effectiveRole) },
        { text: 'Database', selector: 'a', show: ['admin', 'owner', 'mod'].includes(effectiveRole) },
        { text: 'Bot Control', selector: 'a', show: ['admin', 'owner'].includes(globalRole) },
        { text: 'Settings', selector: 'a', show: ['admin', 'owner'].includes(globalRole) },
        { text: 'Profile', selector: 'a', show: true }, // Mindig látszik
        { text: 'Dashboard', selector: 'a', show: true }, // Mindig látszik
        { text: 'Logout', selector: 'a', show: true }, // Mindig látszik
    ];
    
    menuRules.forEach(rule => {
        const elements = document.querySelectorAll(rule.selector);
        elements.forEach(element => {
            if (element.textContent.trim().includes(rule.text)) {
                const parentLi = element.closest('li');
                if (parentLi) {
                    parentLi.style.display = rule.show ? 'block' : 'none';
                    console.log(`${rule.text}: ${rule.show ? 'SHOW' : 'HIDE'}`);
                }
            }
        });
    });
}
function updateNavigationBasedOnRole() {
    try {
        // 1. Próbáljuk a sessionStorage/localStorage-t
        let effectiveRole = sessionStorage.getItem('effective_role') || 
                          localStorage.getItem('effective_role') || 
                          'user';
        
        let globalRole = sessionStorage.getItem('global_role') || 
                       localStorage.getItem('global_role') || 
                       'user';
        
        // 2. Ha nincs, nézzük a DOM-ban lévő badge-eket
        if (effectiveRole === 'user') {
            const roleBadge = document.querySelector('.role-badge');
            if (roleBadge) {
                const badgeClass = Array.from(roleBadge.classList).find(c => c.startsWith('role-'));
                if (badgeClass) {
                    effectiveRole = badgeClass.replace('role-', '');
                }
            }
        }
        
        // 3. Channel admin ellenőrzés
        const hasChannelAdmin = document.querySelector('.channel-admin-badge') !== null;
        
        console.log('Menu update - Effective:', effectiveRole, 'Global:', globalRole, 'Channel Admin:', hasChannelAdmin);
        
        // 4. Menü frissítése
        updateMenuVisibility(effectiveRole, globalRole, hasChannelAdmin);
        
    } catch (error) {
        console.error('Error updating navigation:', error);
    }
}


function showUserLimitedAccessMessage() {
    // Csak ha a main-content létezik és üres
    const mainContent = document.getElementById('main-content');
    if (mainContent && mainContent.children.length === 0) {
        const message = `
            <div class="limited-access-message" style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #6c757d; margin: 20px 0;">
                <h3>👋 Welcome!</h3>
                <p>Your account has limited access to the system.</p>
                <p>You can only view your own profile and dashboard.</p>
                <p>If you need more permissions, contact an administrator.</p>
            </div>
        `;
        mainContent.innerHTML = message;
    }
}

function showChannelAdminBadge(channels) {
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        // Eltávolítjuk a régi badge-ot ha van
        const oldBadge = document.querySelector('.channel-admin-badge');
        if (oldBadge) oldBadge.remove();
        
        // Új badge
        const badge = document.createElement('span');
        badge.className = 'channel-admin-badge';
        badge.innerHTML = `👑 Channel Admin (${channels})`;
        badge.style.marginLeft = '10px';
        badge.style.background = '#ffd700';
        badge.style.color = '#000';
        badge.style.padding = '3px 8px';
        badge.style.borderRadius = '10px';
        badge.style.fontSize = '0.8rem';
        badge.style.display = 'inline-block';
        badge.style.fontWeight = 'bold';
        
        userInfo.appendChild(badge);
    }
}

// =====================
// LOAD DASHBOARD DATA - JAVÍTVA
// =====================
async function loadDashboard() {
    try {
        console.log('Loading dashboard data...');
        const result = await apiCall('dashboard');
        
        if (result && result.success) {
            // Mentjük a role-okat
            if (result.stats) {
                const effectiveRole = result.stats.effective_role || 'user';
                const globalRole = result.stats.global_role || effectiveRole;
                
                sessionStorage.setItem('effective_role', effectiveRole);
                sessionStorage.setItem('global_role', globalRole);
                
                console.log('Roles saved:', { effectiveRole, globalRole });
            }
            
            // Statistics update
            updateStat('total-users', result.stats?.total_users || 0);
            updateStat('total-channels', result.stats?.total_channels || 0);
            updateStat('total-logs', result.stats?.total_logs || 0);
            
            // Bot status - CSAK globális adminnak
            const globalRole = result.user_info?.global_role || 'user';
            const statusEl = document.getElementById('bot-status');
            
            if (statusEl) {
                if (['owner', 'admin'].includes(globalRole)) {
                    checkBotStatus();
                } else {
                    statusEl.textContent = 'N/A';
                    statusEl.style.color = '#6c757d';
                }
            }
            
            // Update recent activity
            updateRecentActivity(result.stats?.recent_activity || []);
            
            // Channel admin badge ha van
            if (result.stats?.has_channel_admin && result.stats?.user_channels) {
                const adminChannels = result.stats.user_channels
                    .filter(ch => ch.role === 'admin' || ch.role === 'owner')
                    .map(ch => ch.channel)
                    .join(', ');
                
                if (adminChannels) {
                    showChannelAdminBadge(adminChannels);
                }
            }
            
            // Menü frissítése AZONNAL
            updateNavigationBasedOnRole();
            
        }
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}
// =====================
// HELPER FUNCTIONS
// =====================

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Auto refresh
function startAutoRefresh() {
    setInterval(() => {
        loadDashboard();
    }, 60000);
}

// =====================
// INIT - JAVÍTVA
// =====================
document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
    startAutoRefresh();
    
    console.log('Dashboard loaded');
});