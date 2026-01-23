// js/users.js - TELJES FÁJL EZ LESZ
(function() {
    // Minden változó LOCAL scope-ban
    let usersData = [];
    let editMode = false;
    let moduleInitialized = false;

    // =====================
    // INIT
    // =====================
    function initUsersModule() {
        if (moduleInitialized) {
            console.log('⚠️ Users module already initialized');
            return;
        }
        
        console.log('👥 Users module initializing...');
        moduleInitialized = true;
        loadUsers();
        setupEventListeners();
        setupUserEditForm();
    }

// =====================
// EVENT LISTENERS
// =====================
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterUsers(this.value);
        });
    }
    
    // Role filter
    const roleFilter = document.getElementById('roleFilter');
    if (roleFilter) {
        roleFilter.addEventListener('change', function() {
            filterUsersByRole(this.value);
        });
    }
    
    // Add/Edit user form
    const addForm = document.getElementById('addUserForm');
    if (addForm) {
        addForm.addEventListener('submit', handleSubmitUser);
    }
}

// =====================
// LOAD USERS
// =====================
// ✅ JAVÍTÁS: loadUsers - debug verzió

async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">⏳ Loading...</td></tr>';
    
    try {
        console.log('📡 Calling users_list API...');
        const result = await apiCall('users_list', {}, 'GET');
        
        console.log('✅ API Response received:', result);
        
        if (result.success) {
            console.log('📊 Users data:', result.users);
            console.log('📊 User count:', result.count);
            
            // ✅ Debug: első user adatait ellenőrizd
            if (result.users && result.users.length > 0) {
                console.log('🔍 First user object:', result.users[0]);
                console.log('   - id:', result.users[0].id, '(type:', typeof result.users[0].id, ')');
                console.log('   - nick:', result.users[0].nick);
                console.log('   - email:', result.users[0].email);
            }
            
            usersData = result.users;
            renderUsers(usersData);
            showNotification(`Loaded ${result.count} users`, 'success');
        } else {
            console.error('❌ API returned success: false');
            tbody.innerHTML = '<tr><td colspan="10" class="error">Failed to load users</td></tr>';
            showNotification(result.error || 'Failed to load users', 'error');
        }
    } catch (error) {
        console.error('❌ loadUsers error:', error);
        tbody.innerHTML = '<tr><td colspan="10" class="error">Error loading users</td></tr>';
        showNotification('Error loading users: ' + error.message, 'error');
    }
}
// =====================
// SETUP USER EDIT FORM
// =====================
function setupUserEditForm() {
    const userEditForm = document.getElementById('userEditForm');
    if (userEditForm) {
        userEditForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const id = parseInt(document.getElementById('editUserIdModal').value);
            if (!id || isNaN(id)) {
                showNotification('Invalid user ID', 'error');
                return;
            }
            
            // Összegyűjtjük az adatokat
            const data = {
                id: id, // Most már integer
                nick: document.getElementById('editNick').value.trim(),
                email: document.getElementById('editEmail').value.trim(),
                role: document.getElementById('editRole').value,
                hostmask: document.getElementById('editHostmask').value.trim(),
                added_by: document.getElementById('editAddedBy').value.trim(),
                lang: document.getElementById('editLang').value.trim(),
                welcome: document.getElementById('editWelcome').value.trim(),
                invites: parseInt(document.getElementById('editInvites').value) || 0,
                discord_id: document.getElementById('editDiscord').value.trim(),
                telegram_id: document.getElementById('editTelegram').value.trim(),
                facebook: document.getElementById('editFacebook').value.trim()
            };
            
            // Jelszó hozzáadása, ha van
            const pass = document.getElementById('editPass').value;
            if (pass && pass.length > 0) {
                data.pass = pass;
            }
            
            // Üres mezők törlése
            Object.keys(data).forEach(key => {
                if (data[key] === '') {
                    delete data[key];
                }
            });
            
            try {
                // DEBUG: nézzük meg mit küldünk
                console.log('DEBUG - Sending update:', data);
                
                const result = await apiCall('users_update', data);
                if (result.success) {
                    showNotification('User updated successfully', 'success');
                    closeUserEditModal();
                    loadUsers();
                } else {
                    showNotification(result.error || 'Update failed', 'error');
                }
            } catch (error) {
                console.error('Update error:', error);
                showNotification('Error updating user: ' + error.message, 'error');
            }
        });
    }
}
// =====================
// VIEW USER (Modalban)
// =====================
window.viewUser = function(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;
    
    const content = document.getElementById('userDetailsContent');
    content.innerHTML = `
        <div class="user-details">
            <div class="detail-section">
                <h3>📋 Basic Information</h3>
                <div class="detail-grid">
                    <div class="detail-item"><strong>ID:</strong> ${user.id}</div>
                    <div class="detail-item"><strong>Nick:</strong> ${sanitizeInput(user.nick)}</div>
                    <div class="detail-item"><strong>Email:</strong> ${sanitizeInput(user.email || 'Not set')}</div>
                    <div class="detail-item"><strong>Role:</strong> <span class="badge badge-${getRoleClass(user.role)}">${user.role.toUpperCase()}</span></div>
                    <div class="detail-item"><strong>Hostmask:</strong> <code>${sanitizeInput(user.hostmask)}</code></div>
                    <div class="detail-item"><strong>Language:</strong> ${user.lang.toUpperCase()}</div>
                    <div class="detail-item"><strong>Command Char:</strong> <code>${user.mychar || '!'}</code></div>
                    <div class="detail-item"><strong>Invites:</strong> ${user.invites}</div>
                </div>
            </div>
            
            ${user.welcome ? `
            <div class="detail-section">
                <h3>💬 Welcome Message</h3>
                <div class="welcome-msg">${sanitizeInput(user.welcome)}</div>
            </div>
            ` : ''}
            
            <div class="detail-section">
                <h3>🔗 Social Links</h3>
                <div class="detail-grid">
                    <div class="detail-item"><strong>Discord:</strong> ${sanitizeInput(user.discord_id || 'Not linked')}</div>
                    <div class="detail-item"><strong>Telegram:</strong> ${sanitizeInput(user.telegram_id || 'Not linked')}</div>
                    <div class="detail-item"><strong>Facebook:</strong> ${sanitizeInput(user.facebook || 'Not linked')}</div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>📅 Timestamps</h3>
                <div class="detail-grid">
                    <div class="detail-item"><strong>Created:</strong> ${formatDate(user.created_at)}</div>
                    <div class="detail-item"><strong>Last Login:</strong> ${formatDate(user.last_login) || 'Never'}</div>
                    <div class="detail-item"><strong>Added By:</strong> ${sanitizeInput(user.added_by || 'System')}</div>
                </div>
            </div>
            
            <div class="modal-actions" style="margin-top: 20px;">
                <button class="btn btn-primary" onclick="openUserEditModal(${user.id}); closeViewUserModal();">Edit User</button>
                <button class="btn btn-secondary" onclick="closeViewUserModal()">Close</button>
            </div>
        </div>
    `;
    
    openModal('viewUserModal');
};

// =====================
// CLOSE VIEW MODAL
// =====================
window.closeViewUserModal = function() {
    closeModal('viewUserModal');
};

// =====================
// RENDER USERS
// =====================
// ✅ JAVÍTÁS: renderUsers - string ID (nick) kezelése
// ✅ JAVÍTÁS: renderUsers - Integer ID kezelése

function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', user.id);
        
        // Flag ikonok a nyelvhez
        let langFlag = '🌍';
        if (user.lang === 'Hu') langFlag = '🇭🇺';
        else if (user.lang === 'Ro') langFlag = '🇷🇴';
        else if (user.lang === 'En') langFlag = '🇬🇧';
        
        // Command Char
        const mychar = user.mychar || '!';
        
        // ✅ JAVÍTÁS: Integer ID - parseInt-vel
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${sanitizeInput(user.nick)}</td>
            <td>${sanitizeInput(user.email || '')}</td>
            <td><span class="badge badge-${getRoleClass(user.role)}">${user.role}</span></td>
            <td><code>${sanitizeInput(user.hostmask)}</code></td>
            <td title="${getLangName(user.lang)}">${langFlag} ${user.lang.toUpperCase()}</td>
            <td>
                <select class="mychar-select" data-user-id="${user.id}" 
                        onchange="updateUserField(${parseInt(user.id)}, 'mychar', this)">
                    <option value="!" ${mychar === '!' ? 'selected' : ''}>!</option>
                    <option value="-" ${mychar === '-' ? 'selected' : ''}>-</option>
                    <option value="." ${mychar === '.' ? 'selected' : ''}>.</option>
                </select>
            </td>
            <td class="action-buttons">
                <button class="btn-sm btn-info" onclick="openUserEditModal(${parseInt(user.id)})">Edit</button>
                <button class="btn-sm btn-danger" onclick="deleteUser(${parseInt(user.id)})">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ✅ JAVÍTÁS: openUserEditModal - Integer ID

window.openUserEditModal = async function(userId) {
    console.log('📝 Opening edit modal for user ID:', userId, 'type:', typeof userId);
    
    // ✅ Ellenőrzés: integer ID kell lennie

		userId = parseInt(userId);
		if (!userId || userId <= 0 || isNaN(userId)) {
			showNotification('Invalid user ID: ' + userId, 'error');
			return;
		}
    try {
        // ✅ API CALL - integer ID-val
        const result = await apiCall('users_get', { id: userId }, 'GET');
        
        if (!result.success) {
            showNotification(result.error || 'Failed to load user data', 'error');
            return;
        }
        
        const user = result.user;
        console.log('👤 User data received:', user);
        
        // Modal cím beállítása
        document.getElementById('modalEditTitle').textContent = `👤 Edit User #${user.id}`;
        console.log('✅ Title set');
        
        // ✅ Űrlap feltöltése
        console.log('🔧 Filling form fields...');
        
        document.getElementById('editUserIdModal').value = user.id;
        document.getElementById('editNick').value = user.nick || '';
        document.getElementById('editEmail').value = user.email || '';
        document.getElementById('editRole').value = user.role || 'vip';
        document.getElementById('editHostmask').value = user.hostmask || '';
        document.getElementById('editAddedBy').value = user.added_by || '';
        
        const langSelect = document.getElementById('editLang');
        if (langSelect) {
            langSelect.value = (user.lang || 'en').toLowerCase();
        }
        
        document.getElementById('editWelcome').value = user.welcome || '';
        document.getElementById('editWebsite').value = user.website || '';
        document.getElementById('editInvites').value = user.invites || 0;
        document.getElementById('editDiscord').value = user.discord_id || '';
        document.getElementById('editTelegram').value = user.telegram_id || '';
        document.getElementById('editFacebook').value = user.facebook || '';
        document.getElementById('editPass').value = '';
        document.getElementById('editCreatedAt').value = user.created_at || 'N/A';
        document.getElementById('editLastLogin').value = user.last_login || 'N/A';
        
        const mycharSelect = document.getElementById('editMychar');
        if (mycharSelect) {
            mycharSelect.value = user.mychar || '!';
        }
        
        console.log('🎉 All fields filled successfully');
        openModal('userEditModal');
        
    } catch (error) {
        console.error('❌ Error loading user:', error);
        showNotification('Failed to load user data: ' + error.message, 'error');
    }
};

// Helper function for language names
function getLangName(langCode) {
    const langMap = {
        'En': 'English',
        'Hu': 'Hungarian',
        'Ro': 'Romanian'
    };
    return langMap[langCode] || langCode;
}
// ✅ JAVÍTÁS: openUserEditModal függvényben website mező hozzáadása

window.openUserEditModal = async function(userId) {
    console.log('📝 Opening edit modal for user ID:', userId);
     if (!userId || userId === 0 || isNaN(userId)) {
        showNotification('Invalid user ID: ' + userId, 'error');
        return;
    }
    // ❌ NE a usersData-ból keressünk, hanem API-ból lekérjük
    try {
        // ✅ API CALL - user adatainak lekérése
        const result = await apiCall('users_get', { id: userId }, 'GET');
        
        if (!result.success) {
            showNotification(result.error || 'Failed to load user data', 'error');
            return;
        }
        
        const user = result.user;
        console.log('👤 User data received:', user);
        
        // Modal cím beállítása
        document.getElementById('modalEditTitle').textContent = `👤 Edit User #${user.id}`;
        
        // ✅ Űrlap feltöltése a TELJES adatokkal
        document.getElementById('editUserIdModal').value = user.id;
        document.getElementById('editNick').value = user.nick || '';
        document.getElementById('editEmail').value = user.email || '';
        document.getElementById('editRole').value = user.role || 'vip';
        document.getElementById('editHostmask').value = user.hostmask || '';
        document.getElementById('editAddedBy').value = user.added_by || '';
        
        // LANGUAGE SELECTOR
        const langSelect = document.getElementById('editLang');
        langSelect.value = user.lang || 'en';
        
        document.getElementById('editWelcome').value = user.welcome || '';
        document.getElementById('editWebsite').value = user.website || ''; // ✅ WEBSITE
        document.getElementById('editInvites').value = user.invites || 0;
        document.getElementById('editDiscord').value = user.discord_id || '';
        document.getElementById('editTelegram').value = user.telegram_id || '';
        document.getElementById('editFacebook').value = user.facebook || '';
        document.getElementById('editPass').value = ''; // Password always empty
        document.getElementById('editCreatedAt').value = user.created_at || 'N/A';
        document.getElementById('editLastLogin').value = user.last_login || 'N/A';
        
        // ✅ MyChar mező javítása (editMychar, nem editMyChar)
        const mycharSelect = document.getElementById('editMychar');
        if (mycharSelect) {
            mycharSelect.value = user.mychar || '!';
        }
        
        openModal('userEditModal');
        
    } catch (error) {
        console.error('❌ Error loading user:', error);
        showNotification('Failed to load user data: ' + error.message, 'error');
    }
};
window.closeUserEditModal = function() {
    closeModal('userEditModal');
};
// =====================
// TOGGLE USER DETAILS FUNCTION
// =====================
window.toggleUserDetails = function(userId) {
    const row = document.querySelector(`tr[data-id="${userId}"]`);
    if (!row) return;
    
    // Megkeressük a details row-ot
    let detailsRow = row.nextElementSibling;
    
    if (detailsRow && detailsRow.classList.contains('user-details-row')) {
        // Ha már létezik, eltüntetjük
        detailsRow.remove();
    } else {
        // Új details row-t hozunk létre
        const user = usersData.find(u => u.id === userId);
        if (!user) return;
        
        detailsRow = document.createElement('tr');
        detailsRow.className = 'user-details-row';
        detailsRow.innerHTML = `
            <td colspan="10">
                <div class="user-details-card">
                    <h4>User Details #${user.id}</h4>
                    <div class="detail-grid">
                        <div><strong>Nick:</strong> ${sanitizeInput(user.nick)}</div>
                        <div><strong>Email:</strong> ${sanitizeInput(user.email || 'N/A')}</div>
                        <div><strong>Role:</strong> <span class="badge">${user.role}</span></div>
                        <div><strong>Hostmask:</strong> <code>${sanitizeInput(user.hostmask)}</code></div>
                        <div><strong>Language:</strong> ${user.lang}</div>
                        <div><strong>Created:</strong> ${formatDate(user.created_at)}</div>
                    </div>
                    <div style="margin-top: 10px;">
                        <button class="btn-sm btn-info" onclick="openUserEditModal(${user.id})">Edit</button>
                        <button class="btn-sm btn-danger" onclick="deleteUser(${user.id})">Delete</button>
                    </div>
                </div>
            </td>
        `;
        
        row.parentNode.insertBefore(detailsRow, row.nextSibling);
    }
};



window.updateUserField = async function(userId, field, element) {
    let value;
    if (element.tagName === "SELECT") {
        value = element.value;
    } else {
        value = (element.innerText || element.textContent || "").trim();
    }
    if (field === "invites") value = parseInt(value) || 0;
    if (field === "pass") {
        // Jelszó állítása külön ablakban (showPasswordChange) történik…
        return;
    }
    try {
        const result = await apiCall('users_update', {
            id: userId,
            [field]: value
        });
        if (result.success) {
            showNotification('User updated', 'success');
            if (element) {
                element.style.backgroundColor = '#d4edda';
                setTimeout(() => { element.style.backgroundColor = ''; }, 900);
            }
        } else {
            showNotification(result.error || 'Update failed', 'error');
            loadUsers();
        }
    } catch (e) {
        showNotification('Error updating user', 'error');
        loadUsers();
    }
}

window.refreshUsers = function() {
        loadUsers();
        const searchInput = document.getElementById('userSearch');
        const roleFilter = document.getElementById('roleFilter');
        
        if (searchInput) searchInput.value = '';
        if (roleFilter) roleFilter.value = '';
    };
    
// =====================
// VIEW USER DETAILS
// =====================
function viewUser(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;
    
    const content = document.getElementById('userDetailsContent');
    content.innerHTML = `
        <div class="user-details">
            <div class="detail-section">
                <h3>📋 Basic Information</h3>
                <div class="detail-grid">
                    <div class="detail-item"><strong>ID:</strong> ${user.id}</div>
                    <div class="detail-item"><strong>Nick:</strong> ${sanitizeInput(user.nick)}</div>
                    <div class="detail-item"><strong>Email:</strong> ${sanitizeInput(user.email || 'Not set')}</div>
                    <div class="detail-item"><strong>Role:</strong> <span class="badge badge-${getRoleClass(user.role)}">${user.role.toUpperCase()}</span></div>
                    <div class="detail-item"><strong>Hostmask:</strong> <code>${sanitizeInput(user.hostmask)}</code></div>
                    <div class="detail-item"><strong>Language:</strong> ${user.lang.toUpperCase()}</div>
                    <div class="detail-item"><strong>Command Char:</strong> <code>${user.mychar}</code></div>
                    <div class="detail-item"><strong>Invites:</strong> ${user.invites}</div>
                </div>
            </div>
            
            ${user.welcome ? `
            <div class="detail-section">
                <h3>💬 Welcome Message</h3>
                <div class="welcome-msg">${sanitizeInput(user.welcome)}</div>
            </div>
            ` : ''}
            
            <div class="detail-section">
                <h3>🔗 Social Links</h3>
                <div class="detail-grid">
                    <div class="detail-item"><strong>Discord:</strong> ${sanitizeInput(user.discord_id || 'Not linked')}</div>
                    <div class="detail-item"><strong>Telegram:</strong> ${sanitizeInput(user.telegram_id || 'Not linked')}</div>
                    <div class="detail-item"><strong>Facebook:</strong> ${sanitizeInput(user.facebook || 'Not linked')}</div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>📅 Timestamps</h3>
                <div class="detail-grid">
                    <div class="detail-item"><strong>Created:</strong> ${formatDate(user.created_at)}</div>
                    <div class="detail-item"><strong>Last Login:</strong> ${formatDate(user.last_login) || 'Never'}</div>
                    <div class="detail-item"><strong>Added By:</strong> ${sanitizeInput(user.added_by || 'System')}</div>
                </div>
            </div>
        </div>
    `;
    
    openModal('viewUserModal');
}

function closeViewUserModal() {
    closeModal('viewUserModal');
}

// =====================
// EDIT USER
// =====================
function editUser(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;
    
    editMode = true;
    
    // Modal cím és gomb módosítás
    document.getElementById('modalTitle').textContent = '✏️ Edit User';
    document.getElementById('submitBtn').textContent = 'Update User';
    
    // Form feltöltése
    document.getElementById('editUserId').value = user.id;
    document.getElementById('newNick').value = user.nick;
    document.getElementById('newEmail').value = user.email || '';
    document.getElementById('newHostmask').value = user.hostmask;
    document.getElementById('newRole').value = user.role;
    document.getElementById('newLang').value = user.lang;
    document.getElementById('newMyChar').value = user.mychar;
    document.getElementById('newInvites').value = user.invites || 0;
    document.getElementById('newWelcome').value = user.welcome || '';
    document.getElementById('newPass').value = '';
    document.getElementById('newDiscord').value = user.discord_id || '';
    document.getElementById('newTelegram').value = user.telegram_id || '';
    document.getElementById('newFacebook').value = user.facebook || '';
    
    openModal('addUserModal');
}

// =====================
// ADD/EDIT USER SUBMIT
// =====================
async function handleSubmitUser(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Üres mezők törlése
    Object.keys(data).forEach(key => {
        if (data[key] === '') delete data[key];
    });
    
    const action = editMode ? 'users_update' : 'users_add';
    
    try {
        const result = await apiCall(action, data);
        
        if (result.success) {
            showNotification(editMode ? 'User updated successfully' : 'User added successfully', 'success');
            closeAddUserModal();
            loadUsers();
        } else {
            showNotification(result.error || 'Operation failed', 'error');
        }
    } catch (error) {
        showNotification('Failed to save user', 'error');
    }
}
// ✅ SAVE USER - Form submit handler

async function saveUser(event) {
    event.preventDefault();
    
    const form = event.target;
    const userId = form.querySelector('[name="id"]').value;
    
    if (!userId) {
        showNotification('Missing user ID', 'error');
        return;
    }
    
    // Collect form data
    const formData = new FormData(form);
    
    // Convert to object
    const updateData = {};
    formData.forEach((value, key) => {
        if (value.trim() !== '') {  // Skip empty fields
            updateData[key] = value;
        }
    });
    
    try {
        showNotification('Saving...', 'info');
        
        const response = await fetch(`api.php?module=users&action=users_update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(updateData)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to save user');
        }
        
        showNotification('User saved successfully!', 'success');
        
        // Refresh the user list
        loadUsers();
        
        // Close modal if open
        const modal = document.querySelector('.modal.show');
        if (modal) {
            modal.classList.remove('show');
        }
        
    } catch (error) {
        console.error('Save error:', error);
        showNotification(error.message, 'error');
    }
}

// ✅ Notification helper
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ✅ Add event listener to edit form
document.addEventListener('DOMContentLoaded', function() {
    const editForm = document.getElementById('editUserForm');
    if (editForm) {
        editForm.addEventListener('submit', saveUser);
    }
});
// =====================
// DELETE USER
// =====================
async function deleteUser(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;
    
    if (!confirmAction(`Are you sure you want to delete user "${user.nick}"?`)) {
        return;
    }
    
    try {
        const result = await apiCall('users_delete', { id: userId });
        
        if (result.success) {
            showNotification('User deleted successfully', 'success');
            loadUsers();
        } else {
            showNotification(result.error || 'Delete failed', 'error');
        }
    } catch (error) {
        showNotification('Failed to delete user', 'error');
    }
}

// =====================
// MODAL FUNCTIONS
// =====================
function showAddUserModal() {
    editMode = false;
    document.getElementById('modalTitle').textContent = '➕ Add New User';
    document.getElementById('submitBtn').textContent = 'Add User';
    
    // Reset form
    const addForm = document.getElementById('addUserForm');
    if (addForm) {
        addForm.reset();
        // Alapértékek beállítása
        document.getElementById('newLang').value = 'En';
        document.getElementById('newMyChar').value = '!';  // Alapértelmezett: !
        document.getElementById('newInvites').value = 0;
        document.getElementById('editUserId').value = '';
    }
    
    openModal('addUserModal');
}

function closeAddUserModal() {
    closeModal('addUserModal');
    document.getElementById('addUserForm').reset();
    editMode = false;
}

// =====================
// FILTER USERS
// =====================
function filterUsers(searchTerm) {
    const filtered = usersData.filter(user => {
        const search = searchTerm.toLowerCase();
        return user.nick.toLowerCase().includes(search) ||
               (user.email && user.email.toLowerCase().includes(search)) ||
               (user.hostmask && user.hostmask.toLowerCase().includes(search)) ||
               user.role.toLowerCase().includes(search);
    });
    
    renderUsers(filtered);
}

function filterUsersByRole(role) {
    if (!role) {
        renderUsers(usersData);
        return;
    }
    
    const filtered = usersData.filter(user => user.role === role);
    renderUsers(filtered);
}

// =====================
// EXPORT USERS
// =====================
function exportUsers() {
    const csv = ['ID,Nick,Email,Role,Hostmask,Lang,MyChar,Invites,Created,Last Login'];
    
    usersData.forEach(user => {
        csv.push([
            user.id,
            user.nick,
            user.email || '',
            user.role,
            user.hostmask,
            user.lang,
            user.mychar,
            user.invites || 0,
            user.created_at,
            user.last_login || ''
        ].join(','));
    });
    
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('Users exported successfully', 'success');
}

// =====================
// HELPER FUNCTIONS
// =====================
// =====================
// HELPER FUNCTIONS (ha még nincsenek)
// =====================
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function sanitizeInput(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getRoleClass(role) {
    const roleMap = {
        'owner': 'owner',
        'admin': 'admin',
        'mod': 'mod',
        'moderator': 'mod',
        'vip': 'vip',
        'user': 'user'
    };
    return roleMap[role?.toLowerCase()] || 'user';
}


// =====================
// REFRESH
// =====================
function refreshUsers() {
    loadUsers();
    document.getElementById('userSearch').value = '';
    document.getElementById('roleFilter').value = '';
}

console.log('✅ Users module loaded');
    // =====================
    // AUTO-INIT
    // =====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUsersModule);
    } else {
        // Ha már betöltött a DOM, várj egy kicsit
        setTimeout(initUsersModule, 100);
    }

})(); 