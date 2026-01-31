// js/ynmchannelstopic.js
// A változót egy IIFE-be csomagoljuk, hogy ne legyen globális
(function() {
    let topicsData = [];

    function getGlobalRole() {
        return (localStorage.getItem('userRole') || 'user').toLowerCase();
    }

    function canEditTopicsGlobally() {
        const r = getGlobalRole();
        return r === 'owner' || r === 'admin' || r === 'mod' || r === 'vip';
    }

    window.initYnmChannelsTopic = function initYnmChannelsTopic() {
        console.log('initYnmChannelsTopic()');

        const tbody = document.getElementById('channelsTopicTableBody');
        if (!tbody) {
            console.warn('channelsTopicTableBody not found - page HTML not loaded?');
            return;
        }

        loadChannelTopics();
        setupEventListeners();
    };

	function setupEventListeners() {
	  const refreshBtn = document.getElementById('refreshTopicsBtn');
	  if (refreshBtn) refreshBtn.addEventListener('click', loadChannelTopics);

	  // Event delegation: edit gomb a táblában
	  const tableBody = document.getElementById('channelsTopicTableBody');
	  if (tableBody) {
		tableBody.addEventListener('click', (e) => {
		  const btn = e.target.closest('.js-edit-topic');
		  if (!btn) return;

		  if (!canEditTopicsGlobally()) {
			showNotification('⚠️ Csak VIP/Mod/Admin/Owner módosíthatja a topic-ot', 'warning');
			return;
		  }

		  const id = parseInt(btn.dataset.id, 10);
		  openEditModal(id);
		});
	  }

	  const editForm = document.getElementById('editTopicForm');
	  if (editForm) {
		editForm.addEventListener('submit', onEditTopicSubmit);
	  }

	  const clearInlineBtn = document.getElementById('clearTopicInlineBtn');
	  if (clearInlineBtn) {
		clearInlineBtn.addEventListener('click', async () => {
		  const id = parseInt(document.getElementById('editTopicChannelId').value, 10);
		  if (!id) return;

		  if (!confirm('Biztosan törlöd a topicot?')) return;

		  await saveTopic(id, '');
		  closeModal('editTopicModal');
		});
	  }
	}

    async function loadChannelTopics() {
        const tbody = document.getElementById('channelsTopicTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
        
        try {
            const result = await apiCall('channels_topic', {}, 'GET');
            if (result.success) {
                topicsData = result.topics || [];
                renderChannelTopics(topicsData);
                
                const totalCount = topicsData.length;
                const withTopicCount = topicsData.filter(t => t.current_topic && t.current_topic.trim() !== '').length;
                
                const countElement = document.getElementById('channelsWithTopicCount');
                if (countElement) {
                    countElement.textContent = `${withTopicCount} / ${totalCount}`;
                }
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="error">Failed to load topics</td></tr>';
            }
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="5" class="error">Error loading topics</td></tr>';
            console.error('Error loading topics:', error);
        }
    }

    function renderChannelTopics(topics) {
	  const canEdit = canEditTopicsGlobally();
	  const tbody = document.getElementById('channelsTopicTableBody');
	  if (!tbody) return;

	  if (!topics || topics.length === 0) {
		tbody.innerHTML = '<tr><td colspan="6">No channels found</td></tr>';
		return;
	  }

	  tbody.innerHTML = '';
	  topics.forEach(topic => {
		const row = document.createElement('tr');
		row.dataset.id = topic.id;

		const topicSetBy = topic.topic_set_by || '-';
		const topicSetAt = topic.topic_set_at ? formatDate(topic.topic_set_at) : '-';

		const safeName = sanitizeInput(topic.name);
		const safeTopic = sanitizeInput(topic.current_topic || '');

		row.innerHTML = `
		  <td>${topic.id}</td>
		  <td><strong>${safeName}</strong></td>
		  <td class="topic-cell">${safeTopic || '<span class="muted">—</span>'}</td>
		  <td>${sanitizeInput(topicSetBy)}</td>
		  <td>${topicSetAt}</td>
		  <td>
			${
			  canEdit
				? `<button class="btn btn-secondary btn-sm js-edit-topic"
						   data-id="${topic.id}">✏️ Edit</button>`
				: `<span class="muted" title="Csak VIP/Mod/Admin/Owner módosíthatja">Nincs jog</span>`
			}
		  </td>
		`;
		tbody.appendChild(row);
	  });
	}

    // Fontos: a függvényt hozzáadjuk a window objektumhoz
    window.updateChannelTopic = async function(channelId, element) {
        const value = (element.innerText || element.textContent).trim();
        
        try {
            const result = await apiCall('channels_topic_update', {
                id: channelId,
                topic: value
            }, 'POST');
            
            if (result.success) {
                let message = '✅ Topic updated';
                if (result.bot_action && result.bot_action.message) {
                    message += '\n🤖 ' + result.bot_action.message;
                }
                showNotification(message, 'success');
                
                element.style.backgroundColor = '#d4edda';
                setTimeout(() => { 
                    element.style.backgroundColor = ''; 
                    loadChannelTopics();
                }, 1000);
            } else {
                showNotification('❌ ' + (result.error || 'Update failed'), 'error');
                loadChannelTopics();
            }
        } catch (error) {
            const msg = String(error.message || error);
            
            if (msg.includes('403') || msg.includes('Unauthorized')) {
                showNotification('⚠️ Csak VIP/Mod/Admin/Owner módosíthatja a topic-ot', 'warning');
            } else {
                showNotification('❌ Hiba: ' + msg, 'error');
            }
            loadChannelTopics();
        }
    };
function openEditModal(channelId) {
  const item = topicsData.find(t => Number(t.id) === Number(channelId));
  if (!item) {
    showNotification('Channel not found', 'error');
    return;
  }

  document.getElementById('editTopicChannelId').value = item.id;
  document.getElementById('editTopicChannelName').textContent = item.name;
  document.getElementById('editTopicTextarea').value = item.current_topic || '';

  openModal('editTopicModal');
}

async function onEditTopicSubmit(e) {
  e.preventDefault();

  const id = parseInt(document.getElementById('editTopicChannelId').value, 10);
  const topic = (document.getElementById('editTopicTextarea').value || '').trim();

  if (!id) return;

  await saveTopic(id, topic);
  closeModal('editTopicModal');
}

async function saveTopic(channelId, topicValue) {
  try {
    const result = await apiCall('channels_topic_update', {
      id: channelId,
      topic: topicValue
    }, 'POST');

    if (result.success) {
      let message = topicValue ? '✅ Topic updated' : '✅ Topic cleared';
      if (result.bot_action?.message) message += '\n🤖 ' + result.bot_action.message;

      showNotification(message, 'success');
      await loadChannelTopics();
    } else {
      showNotification('❌ ' + (result.error || 'Update failed'), 'error');
    }
  } catch (error) {
    const msg = String(error.message || error);
    if (msg.includes('403') || msg.includes('Unauthorized')) {
      showNotification('⚠️ Csak VIP/Mod/Admin/Owner módosíthatja a topic-ot', 'warning');
    } else {
      showNotification('❌ Hiba: ' + msg, 'error');
    }
  }
}
    // Clear Topic Modal
    const showClearTopicBtn = document.getElementById('showClearTopicBtn');
    if (showClearTopicBtn) {
        showClearTopicBtn.onclick = function () {
            openModal('clearTopicModal');
            populateChannelSelect();
        };
    }

    function populateChannelSelect() {
        const select = document.getElementById('clearTopicChannelSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Select Channel --</option>';
        
        topicsData.forEach(topic => {
            if (topic.current_topic && topic.current_topic.trim() !== '') {
                const option = document.createElement('option');
                option.value = topic.id;
                const topicPreview = topic.current_topic.substring(0, 50);
                option.textContent = `${topic.name} - ${topicPreview}${topic.current_topic.length > 50 ? '...' : ''}`;
                select.appendChild(option);
            }
        });
    }

    const clearTopicForm = document.getElementById('clearTopicForm');
    if (clearTopicForm) {
        clearTopicForm.onsubmit = async function (e) {
            e.preventDefault();
            
            const channelId = document.getElementById('clearTopicChannelSelect')?.value;
            if (!channelId) {
                showNotification('Please select a channel', 'error');
                return;
            }
            
            if (!confirm('Are you sure you want to clear the topic for this channel?')) {
                return;
            }
            
            try {
                const result = await apiCall('channels_topic_update', {
                    id: parseInt(channelId),
                    topic: ''
                }, 'POST');
                
                if (result.success) {
                    let message = '✅ Topic cleared successfully';
                    if (result.bot_action && result.bot_action.message) {
                        message += '\n🤖 ' + result.bot_action.message;
                    }
                    showNotification(message, 'success');
                    closeModal('clearTopicModal');
                    clearTopicForm.reset();
                    loadChannelTopics();
                } else {
                    showNotification(result.error || 'Clear failed', 'error');
                }
            } catch (err) {
                showNotification('Error: ' + err.message, 'error');
                console.error('Clear topic error:', err);
            }
        };
    }

    // ✅ AUTO-INIT
    console.log('🔄 ynmchannelstopic.js loading...');
    
    function tryInit() {
        const tbody = document.getElementById('channelsTopicTableBody');
        
        if (tbody) {
            console.log('✅ channelsTopicTableBody found, initializing...');
            window.initYnmChannelsTopic();
            return true;
        }
        
        console.log('⏳ channelsTopicTableBody not found yet, waiting...');
        return false;
    }
    
    // Egyszerűbb inicializálás
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        // Ha már betöltött, próbáljuk azonnal
        setTimeout(tryInit, 100);
    }
	
	
})();