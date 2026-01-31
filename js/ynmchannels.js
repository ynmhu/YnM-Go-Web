// channels.js - Bot integrációval

let channelsData = [];

function getGlobalRole() {
  return (localStorage.getItem('userRole') || 'user').toLowerCase();
}

function canEditChannelsGlobally() {
  const r = getGlobalRole();
  return r === 'owner' || r === 'admin';
}

window.initYnmchannels = function initYnmchannels() {
  console.log('initYnmchannels()');

  // biztosíték: csak akkor induljon, ha a page HTML bent van
  const tbody = document.getElementById('channelsTableBody');
  if (!tbody) {
    console.warn('channelsTableBody not found - page HTML not loaded?');
    return;
  }

  loadChannels();
  setupEventListeners();
};

function setupEventListeners() {
    const refreshBtn = document.getElementById('refreshChannelsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadChannels);
    }
}

async function loadChannels() {
    const tbody = document.getElementById('channelsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
    try {
        const result = await apiCall('channels_list', {}, 'GET');
        if (result.success) {
            channelsData = result.channels;
            renderChannels(channelsData);
            document.getElementById('activeChannelCount').textContent = result.stats.total || 0;
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="error">Failed to load channels</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="error">Error loading channels</td></tr>';
    }
}

function renderChannels(channels) {
	const canEdit = canEditChannelsGlobally();
	const disabledAttr = canEdit ? '' : 'disabled';
	const titleAttr = canEdit ? '' : 'Csak global owner/admin módosíthat csatornát';
	const editableAttr = canEdit ? 'true' : 'false';
    const tbody = document.getElementById('channelsTableBody');
    if (!tbody) return;
    if (channels.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8">No channels found</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    channels.forEach(channel => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', channel.id);
        row.innerHTML = `
            <td>${channel.id}</td>
            <td class="editable" 
                data-field="name" 
                contenteditable="true" 
                onblur="updateChannelField(${channel.id}, 'name', this)">
                ${sanitizeInput(channel.name || '-')}
            </td>
            <td class="editable" 
                data-field="owner"
                contenteditable="true"
                onblur="updateChannelField(${channel.id}, 'owner', this)">
                ${sanitizeInput(channel.owner || '-')}
            </td>
            <td class="editable"
                data-field="owner_hostmask"
                contenteditable="true"
                onblur="updateChannelField(${channel.id}, 'owner_hostmask', this)">
                ${sanitizeInput(channel.owner_hostmask || '-')}
            </td>
            <td>
                <div class="auto-modes">
                    <label>
                        <input type="checkbox" ${channel.auto_op ? 'checked' : ''} 
                            onchange="updateAutoMode(${channel.id}, 'auto_op', this.checked)"> Op
                    </label>
                    <label>
                        <input type="checkbox" ${channel.auto_voice ? 'checked' : ''} 
                            onchange="updateAutoMode(${channel.id}, 'auto_voice', this.checked)"> Voice
                    </label>
                    <label>
                        <input type="checkbox" ${channel.auto_halfop ? 'checked' : ''} 
                            onchange="updateAutoMode(${channel.id}, 'auto_halfop', this.checked)"> HalfOp
                    </label>
                </div>
            </td>
            <td>${formatDate(channel.created_at)}</td>
            <td>
                <button class="btn-sm btn-danger" onclick="deleteChannel(${channel.id})">🗑️ Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function updateChannelField(channelId, field, element) {
    const value = (element.innerText || element.textContent).trim();
    if (!value && field !== 'owner') {
        showNotification('Value cannot be empty', 'error');
        loadChannels();
        return;
    }
    try {
        const result = await apiCall('channels_update', {
            id: channelId,
            field: field,
            value: value
        });
        if (result.success) {
            showNotification('Channel updated', 'success');
            element.style.backgroundColor = '#d4edda';
            setTimeout(() => { element.style.backgroundColor = ''; }, 1000);
        } else {
            showNotification(result.error || 'Update failed', 'error');
            loadChannels();
        }
    } catch (error) {
        showNotification('Failed to update channel', 'error');
        loadChannels();
    }
}

async function updateAutoMode(channelId, field, value) {
  try {
    const result = await apiCall('channels_update', {
      id: channelId,
      field: field,
      value: value ? 1 : 0
    });

    if (result.success) {
      showNotification('✅ Auto mode updated', 'success');
      return;
    }

    // ha a backend visszaad success:false-ot (ritkább)
    showNotification('❌ ' + (result.error || 'Update failed'), 'error');
    loadChannels();

  } catch (error) {
    const msg = String(error.message || error);

    // ✅ 403: jogosultság hiba -> szép üzenet
    if (msg.includes('Csak owner/admin módosíthat csatornát') || msg.includes('403')) {
      showNotification('⚠️ Csak global OWNER vagy ADMIN módosíthat csatorna beállításokat.', 'warning');
      loadChannels(); // visszaállítja a checkboxot a helyes állapotra
      return;
    }

    // egyéb hiba
    showNotification('❌ Hiba: ' + msg, 'error');
    loadChannels();
  }
}

async function deleteChannel(channelId) {
    if (!confirm('Are you sure you want to delete this channel?\n\n⚠️ The bot will also leave this channel!')) return;
    
    try {
        const result = await apiCall('channels_delete', { id: channelId });
        if (result.success) {
            // 🤖 Bot visszajelzés megjelenítése
            let message = 'Channel deleted successfully';
            if (result.bot_action) {
                message += '\n🤖 ' + result.bot_action;
            }
            showNotification(message, 'success');
            loadChannels();
        } else {
            showNotification(result.error || 'Delete failed', 'error');
        }
    } catch (error) {
        showNotification('Failed to delete channel', 'error');
    }
}

// Add Channel Modal
// Add Channel Modal (null-safe)
const showAddChannelBtn = document.getElementById('showAddChannelBtn');
if (showAddChannelBtn) {
  showAddChannelBtn.onclick = function () {
    openModal('addChannelModal');
  };
}

const addChannelForm = document.getElementById('addChannelForm');
if (addChannelForm) {
  addChannelForm.onsubmit = async function (e) {
    e.preventDefault();

    const formData = {
      name: document.getElementById('newChannelName')?.value.trim(),
      owner: document.getElementById('newChannelOwner')?.value.trim(),
      owner_hostmask: document.getElementById('newChannelHostmask')?.value.trim(),
      auto_op: document.getElementById('newAutoOp')?.checked || false,
      auto_voice: document.getElementById('newAutoVoice')?.checked || false,
      auto_halfop: document.getElementById('newAutoHalfOp')?.checked || false,
    };

    if (!formData.name) {
      showNotification('Channel name is required', 'error');
      return;
    }

    try {
      const result = await apiCall('channels_add', formData);
      if (result.success) {
        let message = 'Channel added successfully';
        if (result.bot_action) {
          message += '\n🤖 ' + result.bot_action;
        }
        showNotification(message, 'success');
        closeModal('addChannelModal');
        addChannelForm.reset();
        loadChannels();
      } else {
        if (result.bot_success === false) {
          showNotification(`Channel added but bot failed: ${result.bot_action}`, 'warning');
          closeModal('addChannelModal');
          addChannelForm.reset();
          loadChannels();
        } else {
          showNotification(result.error || 'Add failed', 'error');
        }
      }
    } catch (err) {
      showNotification('Error: ' + err.message, 'error');
      console.error('Add channel error:', err);
    }
  };
}