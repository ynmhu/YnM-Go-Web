// dist/js/ynm.js - Globális funkciók

// =====================
// API CONFIGURATION - Hozzá kell adni!
// =====================
const API_BASE_URL = '/api/api.php?action=';
const API_ENDPOINTS = {
    // Auth
    'login': 'login',
    'logout': 'logout',
	'max_uses_options': 'max-uses-options',
	'permissions': 'permissions',     
    'check_session': 'check_session',
    
    // Dashboard
    'dashboard': 'dashboard',
	'audit': 'audit',    
    
    // Users
    'users_list': 'users_list',
    'users_add': 'users_add',
    'users_update': 'users_update',
    'users_delete': 'users_delete',
    
    // Channels
    'channels_list': 'channels_list',
    'channels_add': 'channels_add',
    'channels_update': 'channels_update',
    'channels_delete': 'channels_delete',
    'channels_stats': 'channels_stats',
    'channels_sync': 'channels_sync',
    'channel_detail': 'channel_detail',       
    'channels_list_stats': 'channels_list_stats',    
    'channels_full_detail': 'channels_full_detail',      
    'channels_with_users': 'channels_with_users',    
    
    // Channel Users
    'channel_users_list': 'channel_users_list',
    'channel_users_add': 'channel_users_add',
    'channel_users_update': 'channel_users_update',
    'channel_users_delete': 'channel_users_delete',
    
    // Database
    'database_list': 'database_list',
    'database_stats': 'database_stats',
    'database_generate': 'database_generate',
    'database_delete': 'database_delete',
	'database_passwords': 'database_passwords',    
    'database_cleanup': 'database_cleanup',
    'database_export': 'database_export',
    'database_check_expired': 'database_check_expired',
    'database_auto_cleanup': 'database_auto_cleanup',
    'database_delete_old_expired': 'database_delete_old_expired',
    
    // Logs
    'logs_list': 'logs_list',
    'logs_export': 'logs_export',
    
    // Profile
    'profile_get': 'profile_get',
    'profile_update': 'profile_update',
    
    // Status
    'status': 'status',
	'bot_stats':'bot_stats',
    
    // Bot Control
    'bot_restart': 'bot_restart',
    'bot_status': 'bot_status',
	'bot_control': 'bot_control',                  
    'bot_memory': 'bot_memory',             
    'bot_reconnect': 'bot_reconnect',
    'bot_reload': 'bot_reload'
};

// =====================
// NOTIFICATION SYSTEM
// =====================
function getToastHost() {
  let host = document.getElementById('toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toastHost';
    document.body.appendChild(host);
  }
  return host;
}
function showNotification(message, type = 'info', timeout = 3000) {
  const host = getToastHost();

  const toast = document.createElement('div');
  toast.className = `toast-msg toast-${type}`;
  toast.textContent = message;

  host.appendChild(toast);

  // anim / eltűnés
  setTimeout(() => toast.classList.add('hide'), timeout);
  toast.addEventListener('transitionend', () => toast.remove());
}

function createNotificationElement() {
    const notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = 'notification';
    notification.style.display = 'none';
    document.body.appendChild(notification);
    return notification;
}

// =====================
// API HELPER - JAVÍTOTT VERZIÓ
// =====================
async function apiCall(action, data = {}, method = 'POST') {
    // ✅ Alapértelmezett action handler
    if (!action) {
        throw new Error('Action is required');
    }
    
    // ✅ URL összeépítés - egyszerű módszer
    let url = `/api/api.php?action=${encodeURIComponent(action)}`;
    
    console.log(`🔵 API CALL START`);
    console.log(`  Action: ${action}`);
    console.log(`  Method: ${method}`);
    console.log(`  Data:`, data);
    
    // ✅ GET paraméterek
    if (method === 'GET') {
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && value !== null && value !== '') {
                url += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            }
        }
        console.log(`  GET URL: ${url}`);
    }
    
    try {
        const options = {
            method: method,
            credentials: 'include'
        };
        
        // ✅ POST/PUT - body-ba az adat
        if (method !== 'GET') {
            options.headers = {
                'Content-Type': 'application/json'
            };
            if (Object.keys(data).length > 0) {
                options.body = JSON.stringify(data);
            }
        }
        
        console.log(`  URL: ${url}`);
        console.log(`  Options:`, options);
        
        const response = await fetch(url, options);
        console.log(`  Response Status: ${response.status}`);
        
        const text = await response.text();
        console.log(`  Response Text (first 200 chars):`, text.substring(0, 200));
        
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            console.error(`  ❌ Failed to parse JSON:`, text);
            throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
        }
        
        console.log(`  Response JSON:`, json);
        
        if (!response.ok && !json.success) {
            console.error(`  ❌ Error: ${json.error}`);
            throw new Error(json.error || `HTTP ${response.status}`);
        }
        
        console.log(`✅ API CALL SUCCESS\n`);
        return json;
        
    } catch (error) {
        console.error(`❌ API CALL FAILED: ${error.message}\n`);
        throw error;
    }
}
// =====================
// MODAL HELPERS
// =====================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Kattintás modal-on kívül = bezárás
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// =====================
// TABLE HELPERS
// =====================
function createTableRow(data, columns) {
    const row = document.createElement('tr');
    
    columns.forEach(col => {
        const cell = document.createElement('td');
        
        if (col.render) {
            cell.innerHTML = col.render(data);
        } else {
            cell.textContent = data[col.field] || '-';
        }
        
        if (col.editable) {
            cell.classList.add('editable');
            cell.setAttribute('data-field', col.field);
            cell.setAttribute('contenteditable', 'true');
        }
        
        row.appendChild(cell);
    });
    
    return row;
}

// =====================
// DATE FORMATTING
// =====================
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString('hu-HU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// =====================
// SEARCH & FILTER
// =====================
function filterTable(tableId, searchValue, filterColumn = null) {
    const table = document.getElementById(tableId);
    const tbody = table.querySelector('tbody');
    const rows = tbody.getElementsByTagName('tr');
    
    searchValue = searchValue.toLowerCase();
    
    for (let row of rows) {
        const cells = row.getElementsByTagName('td');
        let found = false;
        
        for (let cell of cells) {
            const text = cell.textContent.toLowerCase();
            if (text.includes(searchValue)) {
                found = true;
                break;
            }
        }
        
        row.style.display = found ? '' : 'none';
    }
}

// =====================
// CONFIRMATION DIALOG
// =====================
function confirmAction(message) {
    return confirm(message);
}

// =====================
// LOADING INDICATOR
// =====================
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="loading">Loading...</div>';
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const loading = element.querySelector('.loading');
        if (loading) loading.remove();
    }
}

// =====================
// SANITIZE INPUT
// =====================
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// =====================
// COPY TO CLIPBOARD
// =====================
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(err => {
        showNotification('Failed to copy', 'error');
    });
}

// =====================
// EXPORT TO CSV
// =====================
function exportTableToCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    const rows = table.querySelectorAll('tr');
    const csv = [];
    
    for (let row of rows) {
        const cols = row.querySelectorAll('td, th');
        const csvRow = [];
        
        for (let col of cols) {
            csvRow.push('"' + col.textContent.replace(/"/g, '""') + '"');
        }
        
        csv.push(csvRow.join(','));
    }
    
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}
// =====================
// SESSION CHECK
// =====================
async function checkSession() {
    try {
        const response = await fetch('/api/api.php?action=check_session', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.warn('Session check failed:', response.status);
            return false;
        }
        
        const result = await response.json();
        
        if (result.success && result.logged_in) {
            console.log('Session valid for user:', result.username);
            
            // ✅ Frissítsd a DOM-ot
            updateUserInfo(result.username, result.role);
            
            localStorage.setItem('username', result.username);
            localStorage.setItem('userRole', result.role);
            
            return true;
        } else {
            console.log('Session expired or guest');
            // ✅ Guest esetén is frissíts
            updateUserInfo('Guest', 'user');
            return false;
        }
    } catch (error) {
        console.error('Session check failed:', error.message);
        return false;
    }
}

// ✅ JAVÍTOTT updateUserInfo függvény
function updateUserInfo(username, role) {
    const isLoggedIn = username && username !== 'Guest';
    console.log('🔄 updateUserInfo called:', { username, role, isLoggedIn });

    // Meglévő elemek (ha a PHP generálja)
    const loginBtn = document.getElementById('loginButton');
    let userDropdown = document.getElementById('userDropdownMenu');

    // Garantált placeholder (a DOMContentLoaded init hozza létre)
    const placeholder = document.getElementById('userPlaceholder');

    // Ha be vagy jelentkezve, és nincs dropdown, hozzuk létre a placeholder-ben (innerHTML - egyszerű)
    if (isLoggedIn && !userDropdown) {
        console.log('⚠️ User dropdown not found, creating it inside placeholder...');
        const dropdownHTML = `
            <div class="dropdown user-dropdown" id="userDropdownMenu" style="display: block;">
                <button class="btn btn-primary dropdown-toggle" data-bs-toggle="dropdown" id="userDropdownBtn">
                    ${username}
                    <span class="badge badge-${(role||'user').toLowerCase()} ms-1">${(role||'user').toUpperCase()}</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="#settings" data-page="settings"><i class="fas fa-cog me-2"></i>Settings</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" onclick="logout(); return false;"><i class="fas fa-sign-out-alt me-2"></i>Logout</a></li>
                </ul>
            </div>
        `;
        if (placeholder) {
            // Töröljük a placeholder tartalmát (lényeg: mindig egy helyre kerül)
            placeholder.innerHTML = dropdownHTML;
            userDropdown = document.getElementById('userDropdownMenu');
        } else {
            // Fallback: ha nincs placeholder (ritka), beszúrjuk a container-be
            const container = document.querySelector('.ms-auto.d-flex.align-items-center');
            if (container) {
                container.insertAdjacentHTML('beforeend', dropdownHTML);
                userDropdown = document.getElementById('userDropdownMenu');
            }
        }
    }

    // Frissítsük a dropdown gomb szövegét, ha van
    const dropdownBtn = document.getElementById('userDropdownBtn');
    if (dropdownBtn && isLoggedIn) {
        dropdownBtn.innerHTML = `${username} <span class="badge badge-${(role||'user').toLowerCase()} ms-1">${(role||'user').toUpperCase()}</span>`;
        console.log('✅ Dropdown button content updated');
    }

    // Láthatóság kezelése (NE távolítsunk el DOM elemet, csak show/hide)
    if (isLoggedIn) {
        if (loginBtn) {
            loginBtn.style.display = 'none';
            console.log('✅ Login button hidden');
            // ha loginBtn helye nem a placeholder, áthelyezzük (biztosítjuk a stabil helyet)
            if (placeholder && loginBtn.parentElement !== placeholder) placeholder.appendChild(loginBtn);
        }
        if (userDropdown) {
            userDropdown.style.display = 'block';
            // ha userDropdown nem a placeholderben van, áthelyezzük
            if (placeholder && userDropdown.parentElement !== placeholder) placeholder.appendChild(userDropdown);
            console.log('✅ User dropdown shown');
        }
        document.body.classList.remove('guest');
        document.body.classList.add('logged-in');
        console.log('✅ Body class updated to logged-in');
    } else {
        if (loginBtn) {
            loginBtn.style.display = 'inline-block';
            if (placeholder && loginBtn.parentElement !== placeholder) placeholder.appendChild(loginBtn);
            console.log('✅ Login button shown');
        }
        if (userDropdown) {
            userDropdown.style.display = 'none';
            console.log('✅ User dropdown hidden');
        }
        document.body.classList.remove('logged-in');
        document.body.classList.add('guest');
        console.log('✅ Body class updated to guest');
    }
}
// =====================
// INIT
// =====================
document.addEventListener('DOMContentLoaded', function() {
  // --- USER PLACEHOLDER INITIALIZÁCIÓ (tegyük az elejére) ---
  try {
    const container = document.querySelector('.ms-auto.d-flex.align-items-center');
    if (container) {
      let ph = document.getElementById('userPlaceholder');
      if (!ph) {
        ph = document.createElement('div');
        ph.id = 'userPlaceholder';
        ph.style.minWidth = '180px';
        ph.style.width = '180px';
        ph.style.display = 'flex';
        ph.style.alignItems = 'center';
        ph.style.justifyContent = 'flex-end';
        ph.style.gap = '.5rem';
        ph.style.boxSizing = 'border-box';
        container.appendChild(ph);
      }
      // Ha a PHP már generált elemeket, áthelyezzük őket ide (így mindig ugyanott lesznek)
      const loginBtn = document.getElementById('loginButton');
      if (loginBtn && loginBtn.parentElement !== ph) ph.appendChild(loginBtn);
      const existingDropdown = document.getElementById('userDropdownMenu');
      if (existingDropdown && existingDropdown.parentElement !== ph) ph.appendChild(existingDropdown);
    } else {
      console.warn('User placeholder init: container .ms-auto... nem található.');
    }
  } catch (err) {
    console.error('User placeholder init error:', err);
  }

  // --- Eddigi logikád folytatása ---
  // ✅ JAVÍTVA: Első session check (ha nem login oldal)
  if (!window.location.pathname.includes('login.php')) {
      checkSession();
  }

  document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
          const modals = document.querySelectorAll('.modal');
          modals.forEach(modal => modal.style.display = 'none');
      }
  });
});