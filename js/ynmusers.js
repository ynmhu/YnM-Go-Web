// js/ynmusers.js - TELJES FÁJL (javítva: duplikációk kiszedve, globál függvények window-ra, closeAddUserModal fix, egységes lang kezelés)
(function () {
  'use strict';

  // =====================
  // STATE (LOCAL)
  // =====================
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
    moduleInitialized = true;

    console.log('👥 Users module initializing...');
    setupEventListeners();
    setupUserEditForm();
    loadUsers();
  }

  // =====================
  // EVENT LISTENERS
  // =====================
  function setupEventListeners() {
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        filterUsers(this.value);
      });
    }

    const roleFilter = document.getElementById('roleFilter');
    if (roleFilter) {
      roleFilter.addEventListener('change', function () {
        filterUsersByRole(this.value);
      });
    }

    const addForm = document.getElementById('addUserForm');
    if (addForm) {
      addForm.addEventListener('submit', handleSubmitUser);
    }

    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
      addUserBtn.addEventListener('click', function (e) {
        e.preventDefault();
        showAddUserModal();
      });
    }
  }

  // =====================
  // LOAD USERS
  // =====================
  async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">⏳ Loading...</td></tr>';
    }

    try {
      const result = await apiCall('users_list', {}, 'GET');

      if (result.success) {
        usersData = Array.isArray(result.users) ? result.users : [];
        renderUsers(usersData);
        showNotification(`Loaded ${result.count ?? usersData.length} users`, 'success');
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="10" class="error">Failed to load users</td></tr>';
        showNotification(result.error || 'Failed to load users', 'error');
      }
    } catch (error) {
      console.error('❌ loadUsers error:', error);
      if (tbody) tbody.innerHTML = '<tr><td colspan="10" class="error">Error loading users</td></tr>';
      showNotification('Error loading users: ' + error.message, 'error');
    }
  }

  // =====================
  // EDIT FORM (userEditModal)
  // =====================
  function setupUserEditForm() {
    const userEditForm = document.getElementById('userEditForm');
    if (!userEditForm) return;

    userEditForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const id = parseInt(document.getElementById('editUserIdModal')?.value, 10);
      if (!id || Number.isNaN(id)) {
        showNotification('Invalid user ID', 'error');
        return;
      }

      const data = {
        id,
        nick: document.getElementById('editNick')?.value?.trim() ?? '',
        email: document.getElementById('editEmail')?.value?.trim() ?? '',
        role: document.getElementById('editRole')?.value ?? 'vip',
        hostmask: document.getElementById('editHostmask')?.value?.trim() ?? '',
        added_by: document.getElementById('editAddedBy')?.value?.trim() ?? '',
        lang: normalizeLang(document.getElementById('editLang')?.value),
        welcome: document.getElementById('editWelcome')?.value?.trim() ?? '',
        website: document.getElementById('editWebsite')?.value?.trim() ?? '',
        invites: parseInt(document.getElementById('editInvites')?.value, 10) || 0,
        mychar: document.getElementById('editMychar')?.value ?? '!',
        discord_id: document.getElementById('editDiscord')?.value?.trim() ?? '',
        telegram_id: document.getElementById('editTelegram')?.value?.trim() ?? '',
        facebook: document.getElementById('editFacebook')?.value?.trim() ?? ''
      };

      const pass = document.getElementById('editPass')?.value ?? '';
      if (pass.trim().length > 0) data.pass = pass;

      // remove empty strings only (keep 0)
      Object.keys(data).forEach((k) => {
        if (data[k] === '') delete data[k];
      });

      try {
        const result = await apiCall('users_update', data);
        if (result.success) {
          showNotification('User updated successfully', 'success');
          window.closeUserEditModal();
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

  // =====================
  // RENDER USERS
  // =====================
  function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No users found</td></tr>';
      return;
    }

    tbody.innerHTML = '';

    users.forEach((user) => {
      const id = parseInt(user.id, 10);
      const row = document.createElement('tr');
      row.setAttribute('data-id', String(user.id));

      const lang = normalizeLang(user.lang);
      const langFlag = getLangFlag(lang);
      const mychar = user.mychar || '!';

      row.innerHTML = `
        <td>${sanitizeInput(String(user.id ?? ''))}</td>
        <td>${sanitizeInput(user.nick ?? '')}</td>
        <td>${sanitizeInput(user.email ?? '')}</td>
        <td><span class="badge badge-${getRoleClass(user.role)}">${sanitizeInput(String(user.role ?? ''))}</span></td>
        <td><code>${sanitizeInput(user.hostmask ?? '')}</code></td>
        <td title="${sanitizeInput(getLangName(lang))}">${langFlag} ${sanitizeInput(lang.toUpperCase())}</td>
        <td>
          <select class="mychar-select" data-user-id="${sanitizeInput(String(user.id ?? ''))}"
                  onchange="updateUserField(${Number.isFinite(id) ? id : 0}, 'mychar', this)">
            <option value="!" ${mychar === '!' ? 'selected' : ''}>!</option>
            <option value="-" ${mychar === '-' ? 'selected' : ''}>-</option>
            <option value="." ${mychar === '.' ? 'selected' : ''}>.</option>
          </select>
        </td>
        <td class="action-buttons">
          <button class="btn-sm btn-info" onclick="openUserEditModal(${Number.isFinite(id) ? id : 0})">Edit</button>
          <button class="btn-sm btn-danger" onclick="deleteUser(${Number.isFinite(id) ? id : 0})">🗑️</button>
        </td>
      `;

      tbody.appendChild(row);
    });
  }

  // =====================
  // FILTERS
  // =====================
  function filterUsers(searchTerm) {
    const search = (searchTerm || '').toLowerCase();
    const filtered = usersData.filter((user) => {
      return (user.nick || '').toLowerCase().includes(search) ||
        (user.email || '').toLowerCase().includes(search) ||
        (user.hostmask || '').toLowerCase().includes(search) ||
        (user.role || '').toLowerCase().includes(search);
    });
    renderUsers(filtered);
  }

  function filterUsersByRole(role) {
    if (!role) {
      renderUsers(usersData);
      return;
    }
    renderUsers(usersData.filter((u) => u.role === role));
  }

  // =====================
  // ADD USER MODAL
  // =====================
  function showAddUserModal() {
    editMode = false;

    const modalTitle =
      document.getElementById('modalTitle') ||
      document.getElementById('modalAddTitle') ||
      document.getElementById('modalEditTitle');

    if (modalTitle) modalTitle.textContent = '➕ Add New User';

    const submitBtn =
      document.getElementById('submitBtn') ||
      document.querySelector('#addUserModal button[type="submit"]');

    if (submitBtn) submitBtn.textContent = 'Add User';

    const addForm = document.getElementById('addUserForm');
    if (addForm) {
      addForm.reset();

      // Defaultok az ADD formhoz (a te HTML-edben newLang: en/hu/ro)
      const langInput = document.getElementById('newLang');
      const mycharInput = document.getElementById('newMyChar');
      const invitesInput = document.getElementById('newInvites');
      const userIdInput = document.getElementById('editUserId');

      if (langInput) langInput.value = 'en';
      if (mycharInput) mycharInput.value = '!';
      if (invitesInput) invitesInput.value = 0;
      if (userIdInput) userIdInput.value = '';
    }

    openModal('addUserModal');
  }

  // =====================
  // ADD/EDIT SUBMIT (addUserModal)
  // =====================
  async function handleSubmitUser(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // normalize id if present
    if (data.id) {
      const id = parseInt(data.id, 10);
      if (!Number.isNaN(id)) data.id = id;
    }

    // normalize lang for ADD form (en/hu/ro)
    if (data.lang) data.lang = normalizeLang(data.lang);

    // remove empty strings
    Object.keys(data).forEach((key) => {
      if (data[key] === '') delete data[key];
    });

    const action = editMode ? 'users_update' : 'users_add';

    try {
      const result = await apiCall(action, data);

      if (result.success) {
        const msg = editMode
          ? `✅ User #${data.id} updated successfully`
          : `✅ User added successfully${result.user_id ? ' with ID: ' + result.user_id : ''}`;

        showNotification(msg, 'success');
        window.closeAddUserModal();
        loadUsers();
      } else {
        showNotification(result.error || 'Operation failed', 'error');
      }
    } catch (error) {
      console.error('Save error:', error);
      showNotification('Failed to save user: ' + error.message, 'error');
    }
  }

  // =====================
  // DELETE USER
  // =====================
  async function deleteUserInternal(userId) {
    const id = parseInt(userId, 10);
    if (!id || Number.isNaN(id)) {
      showNotification('Invalid user ID', 'error');
      return;
    }

    const user = usersData.find((u) => parseInt(u.id, 10) === id);
    const nick = user?.nick || `#${id}`;

    // confirmAction hiány esetén fallback
    const ok = (typeof window.confirmAction === 'function')
      ? window.confirmAction(`Are you sure you want to delete user "${nick}"?`)
      : window.confirm(`Are you sure you want to delete user "${nick}"?`);

    if (!ok) return;

    try {
      const result = await apiCall('users_delete', { id });
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
  // VIEW USER (Modal)
  // =====================
  function viewUserInternal(userId) {
    const id = parseInt(userId, 10);
    const user = usersData.find((u) => parseInt(u.id, 10) === id);
    if (!user) return;

    const content = document.getElementById('userDetailsContent');
    if (!content) return;

    const lang = normalizeLang(user.lang);

    content.innerHTML = `
      <div class="user-details">
        <div class="detail-section">
          <h3>📋 Basic Information</h3>
          <div class="detail-grid">
            <div class="detail-item"><strong>ID:</strong> ${sanitizeInput(String(user.id))}</div>
            <div class="detail-item"><strong>Nick:</strong> ${sanitizeInput(user.nick || '')}</div>
            <div class="detail-item"><strong>Email:</strong> ${sanitizeInput(user.email || 'Not set')}</div>
            <div class="detail-item"><strong>Role:</strong> <span class="badge badge-${getRoleClass(user.role)}">${sanitizeInput(String(user.role || '').toUpperCase())}</span></div>
            <div class="detail-item"><strong>Hostmask:</strong> <code>${sanitizeInput(user.hostmask || '')}</code></div>
            <div class="detail-item"><strong>Language:</strong> ${sanitizeInput(lang.toUpperCase())}</div>
            <div class="detail-item"><strong>Command Char:</strong> <code>${sanitizeInput(user.mychar || '!')}</code></div>
            <div class="detail-item"><strong>Invites:</strong> ${sanitizeInput(String(user.invites ?? 0))}</div>
          </div>
        </div>

        ${user.welcome ? `
        <div class="detail-section">
          <h3>💬 Welcome Message</h3>
          <div class="welcome-msg">${sanitizeInput(user.welcome)}</div>
        </div>` : ''}

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
            <div class="detail-item"><strong>Created:</strong> ${sanitizeInput(formatDate(user.created_at))}</div>
            <div class="detail-item"><strong>Last Login:</strong> ${sanitizeInput(formatDate(user.last_login) || 'Never')}</div>
            <div class="detail-item"><strong>Added By:</strong> ${sanitizeInput(user.added_by || 'System')}</div>
          </div>
        </div>

        <div class="modal-actions" style="margin-top: 20px;">
          <button class="btn btn-primary" onclick="openUserEditModal(${id}); closeViewUserModal();">Edit User</button>
          <button class="btn btn-secondary" onclick="closeViewUserModal()">Close</button>
        </div>
      </div>
    `;

    openModal('viewUserModal');
  }

  // =====================
  // OPEN EDIT MODAL (single, no duplicates)
  // =====================
  async function openUserEditModalInternal(userId) {
    const id = parseInt(userId, 10);
    if (!id || id <= 0 || Number.isNaN(id)) {
      showNotification('Invalid user ID: ' + userId, 'error');
      return;
    }

    try {
      const result = await apiCall('users_get', { id }, 'GET');
      if (!result.success) {
        showNotification(result.error || 'Failed to load user data', 'error');
        return;
      }

      const user = result.user || {};
      document.getElementById('modalEditTitle').textContent = `👤 Edit User #${user.id}`;

      document.getElementById('editUserIdModal').value = user.id ?? id;
      document.getElementById('editNick').value = user.nick || '';
      document.getElementById('editEmail').value = user.email || '';
      document.getElementById('editRole').value = user.role || 'vip';
      document.getElementById('editHostmask').value = user.hostmask || '';
      document.getElementById('editAddedBy').value = user.added_by || '';

      // edit modal optionok: En/Hu/Ro -> erre állítjuk
      const editLang = document.getElementById('editLang');
      if (editLang) editLang.value = toTitleLang(user.lang || 'en');

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
      if (mycharSelect) mycharSelect.value = user.mychar || '!';

      openModal('userEditModal');
    } catch (error) {
      console.error('❌ Error loading user:', error);
      showNotification('Failed to load user data: ' + error.message, 'error');
    }
  }

  // =====================
  // INLINE FIELD UPDATE
  // =====================
  async function updateUserFieldInternal(userId, field, element) {
    const id = parseInt(userId, 10);
    if (!id || Number.isNaN(id)) {
      showNotification('Invalid user ID', 'error');
      return;
    }

    let value;
    if (element && element.tagName === 'SELECT') value = element.value;
    else value = (element?.innerText || element?.textContent || '').trim();

    if (field === 'invites') value = parseInt(value, 10) || 0;
    if (field === 'pass') return;

    try {
      const result = await apiCall('users_update', { id, [field]: value });
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

  // =====================
  // EXPORT CSV
  // =====================
  function exportUsersInternal() {
    const csv = ['ID,Nick,Email,Role,Hostmask,Lang,MyChar,Invites,Created,Last Login'];

    usersData.forEach((user) => {
      const lang = normalizeLang(user.lang);
      csv.push([
        user.id ?? '',
        safeCsv(user.nick),
        safeCsv(user.email),
        safeCsv(user.role),
        safeCsv(user.hostmask),
        safeCsv(lang),
        safeCsv(user.mychar || '!'),
        user.invites ?? 0,
        safeCsv(user.created_at),
        safeCsv(user.last_login)
      ].join(','));
    });

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showNotification('Users exported successfully', 'success');
  }

  // =====================
  // UI HELPERS
  // =====================
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'block';
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.opacity = '0';
    setTimeout(() => { modal.style.display = 'none'; }, 300);
  }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString();
  }

  function sanitizeInput(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function getRoleClass(role) {
    const roleMap = {
      owner: 'owner',
      admin: 'admin',
      mod: 'mod',
      moderator: 'mod',
      vip: 'vip',
      user: 'user'
    };
    return roleMap[String(role || '').toLowerCase()] || 'user';
  }

  function normalizeLang(lang) {
    // input lehet: En/Hu/Ro vagy en/hu/ro
    const v = String(lang || '').trim();
    if (!v) return 'en';
    const lower = v.toLowerCase();
    if (lower === 'en') return 'en';
    if (lower === 'hu') return 'hu';
    if (lower === 'ro') return 'ro';
    // fallback: ha "En" -> "en"
    return lower;
  }

  function toTitleLang(lang) {
    // edit modal optionok: En/Hu/Ro
    const n = normalizeLang(lang);
    if (n === 'en') return 'En';
    if (n === 'hu') return 'Hu';
    if (n === 'ro') return 'Ro';
    return 'En';
  }

  function getLangName(langCode) {
    const n = normalizeLang(langCode);
    if (n === 'en') return 'English';
    if (n === 'hu') return 'Hungarian';
    if (n === 'ro') return 'Romanian';
    return String(langCode || '');
  }

  function getLangFlag(langCode) {
    const n = normalizeLang(langCode);
    if (n === 'hu') return '🇭🇺';
    if (n === 'ro') return '🇷🇴';
    if (n === 'en') return '🇬🇧';
    return '🌍';
  }

  function safeCsv(v) {
    const s = String(v ?? '');
    // escape commas/quotes/newlines
    if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  // =====================
  // EXPOSE GLOBALS (inline onclick miatt)
  // =====================
  window.openUserEditModal = openUserEditModalInternal;
  window.closeUserEditModal = function () { closeModal('userEditModal'); };

  window.viewUser = viewUserInternal;
  window.closeViewUserModal = function () { closeModal('viewUserModal'); };

  window.updateUserField = updateUserFieldInternal;

  window.refreshUsers = function () {
    loadUsers();
    const searchInput = document.getElementById('userSearch');
    const roleFilter = document.getElementById('roleFilter');
    if (searchInput) searchInput.value = '';
    if (roleFilter) roleFilter.value = '';
  };

  window.exportUsers = exportUsersInternal;

  window.deleteUser = function (userId) {
    return deleteUserInternal(userId);
  };

  window.closeAddUserModal = function () {
    closeModal('addUserModal');
    const form = document.getElementById('addUserForm');
    if (form) form.reset();
    editMode = false;
  };

  // (opcionális, de hasznos) ha valahol hívod:
  window.showAddUserModal = showAddUserModal;

  // =====================
  // AUTO INIT
  // =====================
  console.log('✅ Users module loaded');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUsersModule);
  } else {
    setTimeout(initUsersModule, 100);
  }
})();