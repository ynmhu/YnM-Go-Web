//js/ynmuserschannels.js - Channel Users management (JOGOSULTSÁG ALAPÚ + SAJÁT CSATORNÁK)

window.YnmUsersChannels = window.YnmUsersChannels || {
  channelUsersData: [],
  myChannels: [],
  myChannelsList: [],
  usersForFilter: [],
  currentUserRole: 'user',
  currentUsername: ''
};

var S = window.YnmUsersChannels;// shortcut

// ✅ JAVÍTOTT VÁLTOZAT
async function callChannelUsersAPI(action, data = {}, method = 'POST') {
  try {
    const url = '/api/api.php';
    const requestOptions = {
      method,
      headers: { 'Accept': 'application/json' },
      credentials: 'include'
    };

    if (method === 'GET') {
      const params = new URLSearchParams({ action, ...data });
      const fullUrl = `${url}?${params}`;
      console.log(`📡 GET: ${fullUrl}`);
       const response = await fetch(`${url}?action=${encodeURIComponent(action)}`, requestOptions);
      return await handleResponse(response);
    }

    // POST/PUT/DELETE
    requestOptions.headers['Content-Type'] = 'application/json';
    requestOptions.body = JSON.stringify({ action, ...data });

    const fullUrl = `${url}?action=${encodeURIComponent(action)}`;
    console.log(`📡 ${method}: ${fullUrl}`, { action, ...data });

    const response = await fetch(fullUrl, requestOptions);
    return await handleResponse(response);

  } catch (error) {
    console.error(`❌ API call failed for ${action}:`, error.message);
    throw error;
  }
}

// Helper function for response handling
async function handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (!contentType?.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Server returned non-JSON:', text.substring(0, 200));
        throw new Error(`Server returned HTML: ${text.substring(0, 100)}...`);
    }
    
    const result = await response.json();
    
	if (!response.ok) {
	  throw new Error(result.message || result.error || `HTTP ${response.status}`);
	}
    
    return result;
}
async function loadChannelUsers() {
  const tbody = document.getElementById('channelUsersTableBody');

  try {
    const result = await callChannelUsersAPI('channel_users_list', {}, 'GET');

    if (result.success) {
      channelUsersData = result.channel_users || [];
      renderChannelUsers(channelUsersData);

      document.getElementById('channelUserCount').textContent = result.stats?.total || 0;

      if (result.stats?.user_role) {
        currentUserRole = result.stats.user_role;
        localStorage.setItem('userRole', currentUserRole);
        updateUIForRole();
      }
    } else {
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="error">Nem sikerült betölteni</td></tr>';
    }
  } catch (error) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="error">Hiba történt a betöltés során</td></tr>';
    console.error('Channel users load error:', error);
  }
}

window.initYnmuserschannels = async function initYnmuserschannels() {
  console.log('initYnmuserschannels()');

  if (!document.getElementById('channelUsersTableBody')) {
    console.warn('channelUsersTableBody not found');
    return;
  }

  await loadUserInfo();
  await loadMyChannelsForDropdown();
  await loadUsersForDropdown();
  await loadChannelUsers();
  setupEventListeners();
  updateUIForRole();
};
async function loadUserInfo() {
  try {
    // username a session check-ből
    currentUsername = localStorage.getItem('username') || '';

    // dashboardból jön a global + effective role
    const result = await apiCall('dashboard', {}, 'GET');
    if (result.success) {

      const globalRole = (result.stats?.global_role || 'user').toLowerCase();
      const effectiveRole = (result.stats?.effective_role || globalRole).toLowerCase();

      // ✅ külön tároljuk
      localStorage.setItem('globalRole', globalRole);
      localStorage.setItem('effectiveRole', effectiveRole);

      // a page permissionhöz (channel-users oldalon) az effective role kell
      currentUserRole = effectiveRole;
      localStorage.setItem('userRole', effectiveRole);

      console.log('✅ Roles set:', { globalRole, effectiveRole, username: currentUsername });

      // hostmask
      if (result.user_info?.hostmask) {
        localStorage.setItem('userHostmask', result.user_info.hostmask);
      }

      // csatorna role lista (opcionális)
      if (result.stats?.user_channels) {
        localStorage.setItem('userChannels', JSON.stringify(result.stats.user_channels));
      }
    } else {
      // fallback
      currentUserRole = localStorage.getItem('userRole') || 'user';
      console.log('Dashboard not success, fallback role:', currentUserRole);
    }

  } catch (error) {
    console.error('Failed to load user info:', error);
    currentUserRole = localStorage.getItem('userRole') || 'user';
  }
}
// CSAK SAJÁT CSATORNÁK betöltése a dropdown-hoz
async function loadMyChannelsForDropdown() {
  try {
    console.log('Loading channels for role:', currentUserRole);

    const result = await callChannelUsersAPI('channel_users_list', {}, 'GET');

    if (!result.success) {
      console.error('Failed to load channel users list:', result.error);
      myChannels = [];
      populateChannelDropdowns();
      return;
    }

    const allVisibleUsers = result.channel_users || [];
    const currentNick = (localStorage.getItem('username') || '').trim();
    const globalRole = (localStorage.getItem('globalRole') || 'user').toLowerCase();
    const canSeeAllChannels = (globalRole === 'owner' || globalRole === 'admin');

    const myChannelsList = [];
    const channelMap = {}; // csak akkor használjuk, ha canSeeAllChannels

    // 1) Saját csatornák összegyűjtése + (opcionális) összes csatorna map
    allVisibleUsers.forEach(cu => {
      const nick = (cu.user_nick || cu.nick || '').trim();
      const channel = (cu.channel_name || cu.channel || '').trim();
      if (!channel) return;

      // saját csatornák
      if (nick === currentNick && !myChannelsList.includes(channel)) {
        myChannelsList.push(channel);
      }

      // global admin/owner: összes csatorna
      if (canSeeAllChannels && !channelMap[channel]) {
        channelMap[channel] = true;
      }
    });

    console.log('My channels list:', myChannelsList);

    // 2) Dropdown listát építjük
    const uniqueChannels = [];

    if (canSeeAllChannels) {
      Object.keys(channelMap).forEach(ch => uniqueChannels.push({ name: ch }));
    } else {
      myChannelsList.forEach(ch => uniqueChannels.push({ name: ch }));
    }

    myChannels = uniqueChannels;
    window.myChannelsList = myChannelsList;

    console.log('Channels for dropdown:', myChannels);
    populateChannelDropdowns();

  } catch (error) {
    console.error('Failed to load channels:', error);
    myChannels = [];
    populateChannelDropdowns();
  }
}
// Fallback owner csatornák betöltésére
async function loadChannelsForOwnerFallback() {
    try {
        // ❌ ROSSZ: await apiCall('channel_users_list', {}, 'GET');
        // ✅ JÓ: await apiCall('channel_users_api.php?action=channel_users_list', {}, 'GET');
        
     const result = await callChannelUsersAPI('channel_users_list', {}, 'GET');
        
        if (result.success) {
            const uniqueChannels = [];
            const channelMap = {};
            
            result.channel_users?.forEach(cu => {
                if (cu.channel_name && !channelMap[cu.channel_name]) {
                    channelMap[cu.channel_name] = true;
                    uniqueChannels.push({
                        name: cu.channel_name
                    });
                }
            });
            
            myChannels = uniqueChannels;
            console.log('Owner fallback channels:', myChannels);
        }
    } catch (error) {
        console.error('Owner fallback failed:', error);
        myChannels = [];
    }
}

// Nem owner felhasználók csatornái - JAVÍTVA
async function loadChannelsForNonOwner() {
    try {
        const result = await callChannelUsersAPI('channel_users_list', {}, 'GET');
        
        if (result.success) {
            const allVisibleUsers = result.channel_users || [];
            const currentNick = localStorage.getItem('username') || '';
            
            const uniqueChannels = [];
            const channelMap = {};
            
            // CSAK azokat a csatornákat vesszük, ahol a felhasználó SAJÁT MAGA szerepel
            allVisibleUsers.forEach(cu => {
                if (cu.channel_name && !channelMap[cu.channel_name] && cu.user_nick === currentNick) {
                    channelMap[cu.channel_name] = true;
                    uniqueChannels.push({
                        name: cu.channel_name
                    });
                    console.log('Non-owner found channel:', cu.channel_name, 'for user:', currentNick);
                }
            });
            
            myChannels = uniqueChannels;
            console.log('Non-owner channels found:', myChannels);
        } else {
            console.log('Failed to load channel users list:', result.error);
            myChannels = [];
        }
    } catch (error) {
        console.error('Failed to load non-owner channels:', error);
        myChannels = [];
    }
}
async function loadUsersForDropdown() {
    try {
        const result = await apiCall('users_list', {}, 'GET');
        if (result.success) {
            usersForFilter = result.users || [];
			window.YnmUsersChannels.usersForFilter = usersForFilter; 
            populateUserDropdowns();
        }
    } catch (error) {
        console.error('Failed to load users for dropdown:', error);
    }
}

function populateChannelDropdowns() {
    const filterSelect = document.getElementById('filterChannel');
    const addSelect = document.getElementById('newChannel');
    
    // CSAK SAJÁT CSATORNÁK mutatása (ahol a felhasználó benne van)
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">Összes csatorna</option>';
        
        myChannels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.name;
            option.textContent = channel.name;
            filterSelect.appendChild(option);
        });
        
        // Ha nincs egy csatornája sem
        if (myChannels.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Nincs csatornája';
            option.disabled = true;
            filterSelect.appendChild(option);
        }
    }
    
    // Hozzáadás dropdown - CSAK SAJÁT CSATORNÁK
    if (addSelect) {
        addSelect.innerHTML = '<option value="">Válassz csatornát...</option>';
        
        myChannels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.name;
            option.textContent = channel.name;
            addSelect.appendChild(option);
        });
        
        // Ha nincs egy csatornája sem
        if (myChannels.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Nincs hozzáférhető csatorna';
            option.disabled = true;
            addSelect.appendChild(option);
        }
    }
    
    console.log('Dropdowns populated with my channels:', myChannels.map(c => c.name));
}


function autoFillHostmaskFromSelectedUser() {
  const nick = document.getElementById('newUserNick')?.value;
  if (!nick) return;

  const users = window.YnmUsersChannels.usersForFilter || usersForFilter || [];
  const u = users.find(x => (x.nick || x.username) === nick);
  if (!u) return;

  const hostInput = document.getElementById('newUserHostmask');
  if (hostInput) {
    hostInput.value = u.hostmask || '';
  }
}
function populateUserDropdowns() {
    const filterSelect = document.getElementById('filterUser');
    const addSelect = document.getElementById('newUserNick');
    
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">Összes felhasználó</option>';
        usersForFilter.forEach(user => {
            const option = document.createElement('option');
            option.value = user.nick;
            option.textContent = user.nick;
            filterSelect.appendChild(option);
        });
    }
    
    if (addSelect) {
        addSelect.innerHTML = '<option value="">Válassz felhasználót...</option>';
        
        // Szűrjük a felhasználókat a szerep alapján
        usersForFilter.forEach(user => {
            // Ha VIP vagyok, csak saját magamat lássam
            if (currentUserRole === 'vip' && user.nick !== (localStorage.getItem('username') || '')) {
                return;
            }
            
            // Ha Mod vagyok, csak VIP felhasználókat lássak
            if (currentUserRole === 'mod' && user.role !== 'vip' && user.nick !== (localStorage.getItem('username') || '')) {
                return;
            }
            
            const option = document.createElement('option');
            option.value = user.nick;
            option.textContent = user.nick + (user.role ? ` (${user.role})` : '');
            addSelect.appendChild(option);
        });
    }
}

function filterChannelUsers() {
    const channelFilter = document.getElementById('filterChannel')?.value || '';
    const userFilter = document.getElementById('filterUser')?.value || '';
    
    let filtered = channelUsersData;
    
    // CSAK a saját csatornáit szűrheti
    if (channelFilter) {
        // Ellenőrizzük, hogy a csatorna tényleg a saját csatornái között van-e
        const validChannel = myChannels.some(c => c.name === channelFilter);
        if (validChannel) {
            filtered = filtered.filter(cu => cu.channel_name === channelFilter);
        } else {
            // Ha nem érvényes csatorna (nem a sajátja), akkor hibaüzenet
            showNotification('❌ Csak a saját csatornáidat szűrheted', 'warning');
            
            // Visszaállítjuk a dropdown-ot
            document.getElementById('filterChannel').value = '';
            
            // Visszatöltjük az összes adatot
            renderChannelUsers(channelUsersData);
            return;
        }
    }
    
    if (userFilter) {
        filtered = filtered.filter(cu => cu.user_nick === userFilter);
    }
    
    renderChannelUsers(filtered);
}


function renderChannelUsers(channelUsers) {
    console.log('Rendering all received users for role:', currentUserRole);
    
    const tbody = document.getElementById('channelUsersTableBody');
    if (!tbody) return;
    
    if (!channelUsers || channelUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 20px;">Nincs megjeleníthető csatorna felhasználó</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    const currentUsername = localStorage.getItem('username') || '';
    
    channelUsers.forEach(cu => {
        console.log('Showing user:', cu.user_nick);
        
        const row = document.createElement('tr');
        row.setAttribute('data-id', cu.id);
        row.setAttribute('data-user-nick', cu.user_nick);
        row.setAttribute('data-user-role', cu.role || 'vip');
        
        // 🔍 DEBUG LOG
        console.log('🔍 Checking permissions:', {
            currentRole: currentUserRole,
            currentUser: currentUsername,
            targetNick: cu.user_nick,
            targetRole: cu.role,
            isSameUser: currentUsername === cu.user_nick
        });
        
		// ✅ Frissítsd a renderChannelUsers()-ben a hívásokat:
		const canEdit = canEditUser(currentUserRole, currentUsername, cu.user_nick, cu.role || 'vip', cu.channel_name);
		const canEditVoice = canEditField(currentUserRole, currentUsername, cu.user_nick, cu.role || 'vip', 'auto_voice', cu.channel_name);
		const canEditHalfop = canEditField(currentUserRole, currentUsername, cu.user_nick, cu.role || 'vip', 'auto_halfop', cu.channel_name);
		const canEditOp = canEditField(currentUserRole, currentUsername, cu.user_nick, cu.role || 'vip', 'auto_op', cu.channel_name);
				
        row.innerHTML = `
            <td>${cu.id}</td>
            <td>${sanitizeInput(cu.channel_name || '-')}</td>
            <td>${sanitizeInput(cu.user_nick || '-')} ${cu.role ? `<span class="badge">${cu.role}</span>` : ''}</td>
            <td>${sanitizeInput(cu.hostmask || '-')}</td>
            <td>
                <input type="checkbox" ${cu.auto_voice ? 'checked' : ''} 
                    ${!canEditVoice ? 'disabled' : ''}
                    onchange="updateChannelUserAutoMode(${cu.id}, 'auto_voice', this.checked, '${cu.user_nick}', '${cu.role || 'vip'}', '${cu.channel_name || ''}')"
                    title="${canEditVoice ? 'Auto Voice (+v)' : 'Nincs jogosultságod módosítani'}">
            </td>
            <td>
                <input type="checkbox" ${cu.auto_halfop ? 'checked' : ''} 
                    ${!canEditHalfop ? 'disabled' : ''}
                    onchange="updateChannelUserAutoMode(${cu.id}, 'auto_halfop', this.checked, '${cu.user_nick}', '${cu.role || 'vip'}', '${cu.channel_name || ''}')"
                    title="${canEditHalfop ? 'Auto Halfop (+h)' : 'Nincs jogosultságod módosítani'}">
            </td>
            <td>
                <input type="checkbox" ${cu.auto_op ? 'checked' : ''} 
                    ${!canEditOp ? 'disabled' : ''}
                    onchange="updateChannelUserAutoMode(${cu.id}, 'auto_op', this.checked, '${cu.user_nick}', '${cu.role || 'vip'}', '${cu.channel_name || ''}')"
                    title="${canEditOp ? 'Auto OP (+o)' : 'Nincs jogosultságod módosítani'}">
            </td>
            <td>${formatDate(cu.created_at)}</td>
            <td>
                ${canEdit ? `
                    <button class="btn-sm btn-danger" onclick="deleteChannelUser(${cu.id}, '${cu.user_nick}')" 
                        title="Eltávolítás a csatornából">🗑️ Törlés</button>
                ` : `
                    <button class="btn-sm btn-danger" disabled title="Nincs jogosultságod törölni">🗑️ Törlés</button>
                `}
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// ✅ JAVÍTOTT: Megfelelő channel ellenőrzés
function canEditUser(currentRole, currentUser, targetNick, targetRole, targetChannel) {
    if (!targetChannel) return false;
    
    const normalizedCurrentUser = (currentUser || '').toLowerCase().trim();
    const normalizedTargetNick = (targetNick || '').toLowerCase().trim();
    
    // 1. Saját maga mindig szerkesztheti
    if (normalizedCurrentUser === normalizedTargetNick) {
        return true;
    }
    
    // 2. VIP: csak saját magát
    if (currentRole === 'vip') {
        return false; // Már kezeltük a saját esetet
    }
    
    // 3. Közös csatorna ellenőrzés (MOD és ADMIN)
    if (currentRole === 'mod' || currentRole === 'admin') {
        // Ellenőrizzük, hogy a felhasználó benne van-e a targetChannel-ban
        const userInChannel = window.myChannelsList?.includes(targetChannel) || false;
        
        if (!userInChannel) {
            console.log(`User ${currentUser} NOT in channel ${targetChannel}`);
            return false;
        }
        
        // Mod: csak VIP-eket szerkeszthet
        if (currentRole === 'mod') {
            return targetRole === 'vip';
        }
        
        // Admin: VIP, Mod, Admin szerkeszthető (de Admin OP-t nem)
        return ['vip', 'mod', 'admin'].includes(targetRole);
    }
    
    // 4. Owner: mindent
    return currentRole === 'owner';
}


function canEditField(currentRole, currentUser, targetNick, targetRole, field, targetChannel) {
    const normalizedCurrentUser = (currentUser || '').toLowerCase().trim();
    const normalizedTargetNick = (targetNick || '').toLowerCase().trim();
    
    if (!canEditUser(currentRole, currentUser, targetNick, targetRole, targetChannel)) {
        return false;
    }
    
    if (currentRole === 'vip') {
        return field === 'auto_voice';
    }
    
    if (currentRole === 'mod') {
        if (normalizedCurrentUser === normalizedTargetNick) {
            return true;
        }
        if (targetRole === 'vip') {
            return field === 'auto_voice';
        }
        return false;
    }
    
    if (currentRole === 'admin') {
        if (normalizedCurrentUser === normalizedTargetNick) {
            return true;
        }
        if (targetRole === 'vip') {
            return field === 'auto_voice';
        }
        if (targetRole === 'admin' && field === 'auto_op') {
            return false;
        }
        if (targetRole === 'mod') {
            return true;
        }
        return true;
    }
    
    if (currentRole === 'owner') {
        return true;
    }
    
    return false;
}

async function updateChannelUserAutoMode(id, field, value, targetNick, targetRole, targetChannel) {
  try {
    const currentUsername = localStorage.getItem('username') || 'unknown';

    // Előellenőrzések (maradhatnak)
    if (currentUserRole === 'vip' && targetNick !== currentUsername) {
      showNotification('❌ VIP felhasználóként csak a saját beállításaidat módosíthatod', 'error');
      return;
    }

    if (currentUserRole === 'mod' && targetNick !== currentUsername && targetRole !== 'vip') {
      showNotification('❌ Moderátorként csak VIP felhasználók beállításait módosíthatod', 'error');
      return;
    }

    if (currentUserRole === 'mod' && targetNick !== currentUsername && field !== 'auto_voice') {
      showNotification('❌ Moderátorként VIP felhasználóknál csak az "Auto Voice" engedélyezhető', 'error');
      return;
    }

    // API hívás
    const result = await callChannelUsersAPI('channel_users_update', { id, field, value }, 'POST');

    if (result.success) {
      showNotification(result.message || '✅ Beállítás frissítve', 'success');

      // 1) Frissítsük a lokális adatot
      const idx = channelUsersData.findIndex(u => String(u.id) === String(id));
      if (idx !== -1) {
        // nálad a renderben "cu.auto_voice" truthy-ra épít, ezért 0/1-re tesszük
        channelUsersData[idx][field] = value ? 1 : 0;
      }

      // 2) (Opcionális) jelöld meg vizuálisan a sort, hogy frissült
      const row = document.querySelector(`tr[data-id="${id}"]`);
      if (row) {
        row.classList.add('table-success');
        setTimeout(() => row.classList.remove('table-success'), 600);
      }

      // NEM töltjük újra a teljes listát
      return;
    }

    showNotification('❌ ' + (result.error || 'Update failed'), 'error');

    // Hibánál se muszáj reload, de ha szeretnéd: csak akkor
    // await loadChannelUsers();

  } catch (error) {
    console.error('Update failed:', error);

    let errorMessage = 'Ismeretlen hiba történt';
    if (String(error.message).includes('403')) {
      errorMessage = 'Nincs jogosultságod ehhez a művelethez vagy nincs közös csatornád a felhasználóval';
    } else if (String(error.message).includes('Network')) {
      errorMessage = 'Hálózati hiba történt';
    }

    showNotification('❌ ' + errorMessage, 'error');

    // Ha hálózati hiba miatt elszállhatott az állapot, itt lehet reload:
    // await loadChannelUsers();
  }
}
async function deleteChannelUser(id, targetNick) {
    const currentUsername = localStorage.getItem('username') || 'unknown';
    
    // Előellenőrzés
		if (currentUserRole === 'vip') {
			if (targetNick !== currentUsername) {
				showNotification('❌ VIP felhasználóként csak saját magadat távolíthatod el', 'error');
				return;
			}
		}
	    if (currentUserRole === 'mod' || currentUserRole === 'admin') {
        const channelUser = channelUsersData.find(cu => cu.id == id);
        if (channelUser) {
            const targetChannel = channelUser.channel_name || channelUser.channel || '';
            
            // Ellenőrizzük, hogy van-e közös csatorna
            if (!myChannelsList.includes(targetChannel)) {
                showNotification(`❌ Nincs közös csatornád "${targetChannel}"-val`, 'error');
                return;
            }
        }
    }
    
    if (!confirm(`Biztosan eltávolítod a(z) "${targetNick}" felhasználót a csatornából?`)) {
        return;
    }
    
    try {
       const result = await callChannelUsersAPI('channel_users_delete', { id }, 'POST');
        if (result.success) {
            showNotification(result.message || '✅ Felhasználó eltávolítva a csatornából', 'success');
            loadChannelUsers();
        } else {
            showNotification('❌ ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('❌ Hiba történt a törlés során', 'error');
    }
}

async function handleAddChannelUser(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = {
        nick: document.getElementById('newUserNick').value,
        hostmask: document.getElementById('newUserHostmask').value.trim(),
        channel: document.getElementById('newChannel').value,
        auto_op: document.getElementById('newUserAutoOp').checked,
        auto_voice: document.getElementById('newUserAutoVoice').checked,
        auto_halfop: document.getElementById('newUserAutoHalfOp').checked,
        role: document.getElementById('newUserRole')?.value || 'user'
    };
    
    if (!formData.nick || !formData.channel) {
        showNotification('❌ Csatorna és felhasználó megadása kötelező', 'error');
        return;
    }
    
    // VIP CSAK saját magát adhatja hozzá
    if (currentUserRole === 'vip' && formData.nick !== (localStorage.getItem('username') || '')) {
        showNotification('❌ VIP felhasználóként csak saját magadat adhatod hozzá', 'error');
        return;
    }
    
    try {
        const result = await callChannelUsersAPI('channel_users_add', formData, 'POST');
        if (result.success) {
            showNotification(result.message || '✅ Felhasználó hozzáadva a csatornához!', 'success');
            closeModal('addChannelUserModal');
            form.reset();
            loadChannelUsers();
        } else {
            showNotification('❌ ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('❌ Hiba történt: ' + error.message, 'error');
    }
}

function setupEventListeners() {
    const refreshBtn = document.getElementById('refreshChannelUsersBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadChannelUsers);
    }

    const filterChannel = document.getElementById('filterChannel');
    if (filterChannel) {
        filterChannel.addEventListener('change', filterChannelUsers);
    }

    const filterUser = document.getElementById('filterUser');
    if (filterUser) {
        filterUser.addEventListener('change', filterChannelUsers);
    }

    const showAddBtn = document.getElementById('showAddChannelUserBtn');
    if (showAddBtn) {
        showAddBtn.addEventListener('click', function() {
            openModal('addChannelUserModal');
        });
    }

    const addForm = document.getElementById('addChannelUserForm');
    if (addForm) {
        addForm.addEventListener('submit', handleAddChannelUser);
    }
	const newUserNick = document.getElementById('newUserNick');
	if (newUserNick) {
	  newUserNick.addEventListener('change', autoFillHostmaskFromSelectedUser);
	}
}

function updateUIForRole() {
    const addButton = document.getElementById('showAddChannelUserBtn');
    
    if (currentUserRole === 'vip') {
        // VIP: csak saját sorokat módosíthat
        if (addButton) addButton.style.display = 'none';
        
        // Csak a saját sorait lássa szerkeszthetőnek
        channelUsersData.forEach((cu, index) => {
            const row = document.querySelector(`tr[data-id="${cu.id}"]`);
            if (row && cu.user_nick !== (localStorage.getItem('username') || 'unknown')) {
                row.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.disabled = true;
                    cb.title = 'Csak saját beállításaidat módosíthatod';
                });
            }
        });
    }
}

// Segédfüggvények
function sanitizeInput(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('hu-HU');
}