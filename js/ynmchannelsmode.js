// js/ynmchannelsmode.js
(function() {
    let modesData = [];
    
    // Mode definíciók
    const MODE_DEFINITIONS = {
        'basic': [
            { char: 'n', label: 'No External Msg', icon: '🚫', description: 'Block external messages' },
            { char: 't', label: 'Topic Protected', icon: '🔒', description: 'Only ops can change topic' },
            { char: 'm', label: 'Moderated', icon: '🎙️', description: 'Only voiced users can talk' },
            { char: 'i', label: 'Invite Only', icon: '🎫', description: 'Users need invite' }
        ],
        'visibility': [
            { char: 's', label: 'Secret', icon: '🕵️', description: 'Hidden from /LIST' },
            { char: 'p', label: 'Private', icon: '🔐', description: 'Hide user count' }
        ],
        'limits': [
            { char: 'l', label: 'User Limit', icon: '👥', description: 'Max users', hasParam: true, paramType: 'number' },
            { char: 'k', label: 'Password', icon: '🔑', description: 'Channel password', hasParam: true, paramType: 'text' }
        ]
    };
    
    function getGlobalRole() {
        return (localStorage.getItem('userRole') || 'user').toLowerCase();
    }
    
    function canEditModesGlobally() {
        const r = getGlobalRole();
        return r === 'owner' || r === 'admin' || r === 'mod';
    }
    
    window.initYnmChannelsMode = function initYnmChannelsMode() {
        console.log('initYnmChannelsMode() - Toggle Mode UI');
        
        const container = document.getElementById('channelsModeContainer');
        if (!container) {
            console.warn('channelsModeContainer not found');
            return;
        }
        
        loadChannelModes();
        setupEventListeners();
    };
    
    function setupEventListeners() {
        const refreshBtn = document.getElementById('refreshModesBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadChannelModes);
        }
    }
    
    async function loadChannelModes() {
        const container = document.getElementById('channelsModeContainer');
        if (!container) return;
        
        container.innerHTML = '<div class="loading-state">Loading channels...</div>';
        
        try {
            const result = await apiCall('channels_mode', {}, 'GET');
            if (result.success) {
                modesData = result.modes || [];
                renderChannelModeCards(modesData);
            } else {
                container.innerHTML = '<div class="loading-state error">Failed to load modes</div>';
            }
        } catch (error) {
            container.innerHTML = '<div class="loading-state error">Error loading modes</div>';
            console.error('Error loading modes:', error);
        }
    }
    
    function renderChannelModeCards(modes) {
        const container = document.getElementById('channelsModeContainer');
        if (!container) return;
        
        const canEdit = canEditModesGlobally();
        
        if (!modes || modes.length === 0) {
            container.innerHTML = '<div class="loading-state">No channel modes found</div>';
            return;
        }
        
        container.innerHTML = '';
        
        modes.forEach(function(channelMode) {
            const card = createChannelModeCard(channelMode, canEdit);
            container.appendChild(card);
        });
    }
    
    function createChannelModeCard(channelMode, canEdit) {
        const card = document.createElement('div');
        card.className = 'channel-mode-card';
        card.dataset.channelId = channelMode.id;
        
        // Parse active modes
        const activeModes = parseActiveModes(channelMode.modes || '');
        
        // Header
        const header = document.createElement('div');
        header.className = 'channel-header';
        header.innerHTML = `
            <div class="channel-name">${sanitizeInput(channelMode.channel)}</div>
            <div class="channel-info">
                <div class="channel-info-item">
                    <i>🕐</i>
                    <span>${formatDate(channelMode.updated_at)}</span>
                </div>
                <div class="channel-info-item">
                    <i>👤</i>
                    <span>${sanitizeInput(channelMode.set_by || 'Unknown')}</span>
                </div>
            </div>
        `;
        card.appendChild(header);
        
        if (!canEdit) {
            const noPermMsg = document.createElement('div');
            noPermMsg.className = 'no-permission-message';
            noPermMsg.textContent = '⚠️ Only Mod/Admin/Owner can modify channel modes';
            card.appendChild(noPermMsg);
            card.appendChild(createModeDisplayOnly(activeModes));
            return card;
        }
        
        // Mode categories
        Object.keys(MODE_DEFINITIONS).forEach(function(category) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'mode-category';
            
            const categoryTitle = document.createElement('div');
            categoryTitle.className = 'mode-category-title';
            categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            categoryDiv.appendChild(categoryTitle);
            
            const grid = document.createElement('div');
            grid.className = 'mode-toggle-grid';
            
            MODE_DEFINITIONS[category].forEach(function(modeDef) {
                const btn = createModeToggleButton(
                    channelMode,
                    modeDef,
                    activeModes.includes(modeDef.char)
                );
                grid.appendChild(btn);
            });
            
            categoryDiv.appendChild(grid);
            card.appendChild(categoryDiv);
        });
        
        return card;
    }
    
    function createModeToggleButton(channelMode, modeDef, isActive) {
        const btn = document.createElement('button');
        btn.className = 'mode-toggle-btn' + (isActive ? ' active' : '');
        btn.dataset.channel = channelMode.channel;
        btn.dataset.channelId = channelMode.id;
        btn.dataset.mode = modeDef.char;
        btn.title = modeDef.description;
        
        // Get param value from JSON params
        let paramValue = '';
        if (modeDef.hasParam && isActive) {
            const params = channelMode.mode_params;
            if (typeof params === 'object' && params !== null) {
                paramValue = params[modeDef.char] || '';
            } else if (typeof params === 'string') {
                paramValue = params; // Backward compatibility
            }
        }
        
        if (modeDef.hasParam) {
            btn.classList.add('has-param');
            btn.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <span class="mode-icon">${modeDef.icon}</span>
                    <span class="mode-label">${modeDef.label}</span>
                    <span class="mode-indicator"></span>
                </div>
                <input type="${modeDef.paramType}" 
                       class="mode-param-input" 
                       placeholder="${modeDef.paramType === 'number' ? 'e.g. 50' : 'Enter password'}"
                       value="${paramValue}">
            `;
            
            // Param input event
            const paramInput = btn.querySelector('.mode-param-input');
            paramInput.addEventListener('click', function(e) {
                e.stopPropagation();
            });
            
            paramInput.addEventListener('input', function(e) {
                e.stopPropagation();
            });
            
            paramInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    btn.click();
                }
            });
        } else {
            btn.innerHTML = `
                <span class="mode-icon">${modeDef.icon}</span>
                <span class="mode-label">${modeDef.label}</span>
                <span class="mode-indicator"></span>
            `;
        }
        
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const currentlyActive = btn.classList.contains('active');
            const newState = !currentlyActive;
            const modeChar = modeDef.char;
            const modeStr = (newState ? '+' : '-') + modeChar;
            
            let param = '';
            if (modeDef.hasParam) {
                const paramInput = btn.querySelector('.mode-param-input');
                if (newState) {
                    // Activating mode with param
                    param = paramInput ? paramInput.value.trim() : '';
                    
                    if (!param) {
                        showNotification(`⚠️ Please enter a ${modeDef.label.toLowerCase()}`, 'warning');
                        if (paramInput) paramInput.focus();
                        return;
                    }
                } else {
                    // Deactivating mode - clear param
                    if (paramInput) paramInput.value = '';
                }
            }
            
            btn.classList.add('disabled');
            
            try {
                await toggleChannelMode(channelMode.id, channelMode.channel, modeStr, param);
                
                // Update UI
                btn.classList.toggle('active');
                
            } catch (error) {
                console.error('Toggle error:', error);
            } finally {
                btn.classList.remove('disabled');
            }
        });
        
        return btn;
    }
    
    function createModeDisplayOnly(activeModes) {
        const display = document.createElement('div');
        display.className = 'mode-toggle-grid';
        display.style.opacity = '0.6';
        
        const allModes = [].concat(
            MODE_DEFINITIONS.basic,
            MODE_DEFINITIONS.visibility,
            MODE_DEFINITIONS.limits
        );
        
        allModes.forEach(function(modeDef) {
            const isActive = activeModes.includes(modeDef.char);
            const btn = document.createElement('div');
            btn.className = 'mode-toggle-btn' + (isActive ? ' active' : '') + ' disabled';
            btn.innerHTML = `
                <span class="mode-icon">${modeDef.icon}</span>
                <span class="mode-label">${modeDef.label}</span>
                <span class="mode-indicator"></span>
            `;
            display.appendChild(btn);
        });
        
        return display;
    }
    
    async function toggleChannelMode(channelId, channelName, mode, param) {
        try {
            const result = await apiCall('channels_mode_update', {
                id: parseInt(channelId) || 0,
                channel_name: channelName,
                mode: mode,
                param: param || ''
            }, 'POST');
            
            if (result.success) {
                showNotification(`✅ Mode ${mode} applied to ${channelName}`, 'success');
                
                // Update local data
                const idx = modesData.findIndex(m => m.id === channelId);
                if (idx !== -1 && result.modes && result.modes.length > 0) {
                    modesData[idx] = result.modes.find(m => m.id === channelId) || modesData[idx];
                }
            } else {
                showNotification('❌ ' + (result.error || 'Failed to set mode'), 'error');
                throw new Error(result.error);
            }
        } catch (error) {
            const msg = String(error.message || error);
            if (msg.includes('403') || msg.includes('Unauthorized')) {
                showNotification('⚠️ Only Mod/Admin/Owner can set channel modes', 'warning');
            } else {
                showNotification('❌ Error: ' + msg, 'error');
            }
            throw error;
        }
    }
    
    function parseActiveModes(modesStr) {
        const modes = [];
        modesStr = (modesStr || '').replace(/\s+/g, '');
        
        for (let i = 0; i < modesStr.length; i++) {
            const char = modesStr[i];
            if (char !== '+' && char !== '-') {
                modes.push(char);
            }
        }
        
        return modes;
    }
    
    // AUTO-INIT
    console.log('🔄 ynmchannelsmode.js (Toggle UI) loading...');
    
    function tryInit() {
        const container = document.getElementById('channelsModeContainer');
        
        if (container) {
            console.log('✅ channelsModeContainer found, initializing...');
            window.initYnmChannelsMode();
            return true;
        }
        
        console.log('⏳ channelsModeContainer not found yet, waiting...');
        return false;
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        setTimeout(tryInit, 100);
    }
    
})();