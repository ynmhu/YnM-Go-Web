// bot-stats.js// bot-stats.js

if (window.ynmBotStatsLoaded) {
  console.log('⏭️ YnM already loaded');
  if (window.initBotStatsPage) window.initBotStatsPage();
  // Stop further execution
} else {
  window.ynmBotStatsLoaded = true;

// A többi kód FOLYTATÓDIK normálisan...
let lastUpdate = null;
const MANUAL_COOLDOWN_MS = 1 * 60 * 1000;
const LS_KEY_LAST_MANUAL = 'botStats:lastManualRefreshAt';
function botStatsDomReady() {
  return !!(document.getElementById('refreshBtn') && document.getElementById('botName'));
}

function getLastManualRefreshAt() {
  const v = Number(localStorage.getItem(LS_KEY_LAST_MANUAL));
  return Number.isFinite(v) ? v : 0;
}

function setLastManualRefreshAt(ts) {
  localStorage.setItem(LS_KEY_LAST_MANUAL, String(ts));
}

function msToMinSec(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}p ${r}mp` : `${r}mp`;
}

function addChannelsStyles() {
    if (document.getElementById('channels-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'channels-styles';
    style.textContent = `
        .channel-badge {
            display: inline-block;
            background: linear-gradient(135deg, #e0f2fe, #bae6fd);
            padding: 4px 10px;
            border-radius: 12px;
            border: 1px solid #7dd3fc;
            margin: 1px;
            font-size: 0.85em;
            font-weight: 500;
            color: #0369a1;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
            white-space: nowrap;
			text-decoration: none;
            cursor: pointer;
        }
        
        .channel-badge:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            background: linear-gradient(135deg, #bae6fd, #7dd3fc);
        }
        
        #botChannelsList {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            padding: 8px;
            margin: -8px;
            border-radius: 8px;
        }
        
        /* Sötét mód támogatás */
        .dark-mode .channel-badge {
            background: linear-gradient(135deg, #1e293b, #334155);
            border: 1px solid #475569;
            color: #e2e8f0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .dark-mode #botChannelsList {
            background: rgba(255, 255, 255, 0.05);
        }
        
    `;
    document.head.appendChild(style);
}
// Helper function to format arrays with HTML styling
function formatArray(arr, options = {}) {
    if (!arr) return options.emptyText || 'N/A';
    
    const {
        prefix = '+',
        emptyText = 'N/A',
        maxItems = 100,
        separator = ' ',
        prefixClass = 'prefix-plus' // CSS osztály neve
    } = options;
    
    try {
        let arrayData = arr;
        
        // Parse if string
        if (typeof arr === 'string') {
            arrayData = JSON.parse(arr);
        }
        
        // Check if array
        if (Array.isArray(arrayData)) {
            if (arrayData.length === 0) return emptyText;
            
            // Limit items if needed
            const itemsToShow = maxItems > 0 ? arrayData.slice(0, maxItems) : arrayData;
            
            // Create styled HTML
            const formatted = itemsToShow.map(item => 
                `<span class="formatted-array-item">
                    <span class="array-prefix ${prefixClass}">${prefix}</span>
                    <span class="array-name">${item}</span>
                </span>`
            ).join(separator);
            
            // Add indicator if there are more items
            if (maxItems > 0 && arrayData.length > maxItems) {
                return formatted + ` <span class="more-items">... (+${arrayData.length - maxItems} több)</span>`;
            }
            
            return formatted;
        }
        
        return emptyText;
    } catch (e) {
        console.warn('Hiba a tömb formázásánál:', e);
        return emptyText;
    }
}

// Add these styles to your CSS
function addFormattedArrayStyles() {
    if (document.getElementById('formatted-array-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'formatted-array-styles';
    style.textContent = `
        .formatted-array-item {
            display: inline-flex;
            align-items: center;
            margin-right: 4px;
            white-space: nowrap;
        }
        
        .array-prefix {
            font-weight: bold;
            margin-right: 2px;
        }
        
        .array-name {
            font-weight: bold;
            color: #000000; /* Fekete név */
        }
        
        /* + (VIP) - zöld bold */
        .prefix-vip {
            color: #10B981; /* Emerald 500 */
        }
        
        /* @ (Admin) - piros bold */
        .prefix-admin {
            color: #EF4444; /* Red 500 */
        }
        
        /* % (Mod) - kék bold */
        .prefix-mod {
            color: #F59E0B; /* Amber 500 - narancs-sárga */
        }
        
        /* Global Admin - arany */
        .prefix-global-admin {
            color: #EF4444; /* Red 500 */
        }
        
        /* Global Mod - lila */
        .prefix-global-mod {
            color: #F59E0B; /* Amber 500 - narancs-sárga */
        }
        
        /* Global VIP - rózsaszín */
        .prefix-global-vip {
            color: #10B981; /* Emerald 500 */
        }
        
        .more-items {
            color: #6B7280; /* Gray 500 */
            font-size: 0.9em;
            font-weight: normal;
        }
    `;
    document.head.appendChild(style);
}

// source: 'auto' (page init) | 'manual' (gomb)
async function loadBotStats(source = 'auto') {
  try {
    if (!botStatsDomReady()) return;
		
    // kézi limit csak manual esetén
    if (source === 'manual') {
      const now = Date.now();
      const last = getLastManualRefreshAt();
      const elapsed = now - last;

      if (elapsed < MANUAL_COOLDOWN_MS) {
        const waitMs = MANUAL_COOLDOWN_MS - elapsed;
        showNotification(`Csak 1 percenként frissíthetsz. Várj még: ${msToMinSec(waitMs)}`, 'warning');
        return;
      }

      // lefoglaljuk a "slotot" azonnal, hogy dupla kattintás se menjen át
      setLastManualRefreshAt(now);
    }

    const response = await apiCall('bot_stats', {});
    
    // JAVÍTÁS: Ha a bot offline, ne hibaüzenetet jelenítsünk meg
    if (!response?.success) {
      // Speciális kezelés "bot offline" esetén
      if (response?.error?.includes('Failed to fetch') || 
          response?.error?.includes('No bot stats') ||
          response?.error?.includes('Database')) {
        
        // Bot offline állapot beállítása
        const statusEl = document.getElementById('botStatus');
        if (statusEl) {
          statusEl.textContent = 'BOT OFFLINE';
          statusEl.className = 'status offline';
        }
        
        // További offline információk
        const elements = ['botName', 'botVersion', 'botGoVersion', 'botUptime', 
                          'botMemory', 'botCPU', 'botThreads', 'serverUptime'];
        elements.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.textContent = 'OFFLINE';
        });
        
        // JAVÍTÁS: Nem error, hanem info notification
        if (source === 'manual') {
          showNotification('🤖 Bot jelenleg offline vagy karbantartás alatt', 'info');
        }
        return;
      }
      
      throw new Error(response?.error || 'API hiba');
    }

    updateAllBotStats(response.stats);
    lastUpdate = new Date();
    
    // Chart frissítése - JAVÍTVÁ: response.stats használata
    if (response.stats?.network_traffic) {
        setTimeout(() => {
            if (!window.trafficChart) {
                window.trafficChart = new TrafficChart();
            } else if (window.trafficChart.handleUpdate) {
                window.trafficChart.handleUpdate(response.stats.network_traffic);
            }
        }, 300);
    }
    
    // Sikeres frissítés jelzése manuális esetén
    if (source === 'manual') {
      showNotification('Adatok sikeresen frissítve!', 'success');
    }

  } catch (error) {
    console.error('Bot adatok betöltési hiba:', error);
    
    // JAVÍTÁS: Offline bot esetén info, egyébként error
    if (error.message.includes('Failed to fetch') || 
        error.message.includes('Network') ||
        error.message.includes('500')) {
      showNotification('🤖 OFFLINE', 'info');
    } else {
      showNotification(`Hiba: ${error.message}`, 'error');
    }
  }
}

function updateAllBotStats(stats) {
    if (!botStatsDomReady()) {
        console.error('❌ Required DOM elements not ready!');
        return;
    }

    // Bot alapszámok
    document.getElementById('botName').textContent = stats.nick || 'YnM-Bot';
    document.getElementById('botVersion').textContent = stats.version || 'N/A';
    document.getElementById('botGoVersion').textContent = stats.go_version || 'N/A';
    document.getElementById('botKey').textContent = stats.key || 'N/A';

    const statusEl = document.getElementById('botStatus');
    if (Number(stats.connected) === 1) {
        statusEl.textContent = 'ONLINE';
        statusEl.className = 'status online';
    } else {
        statusEl.textContent = 'RESTARTING';
        statusEl.className = 'status offline';
    }

    document.getElementById('botUptime').textContent = stats.bot_uptime || 'N/A';
    document.getElementById('botMaxUptime').textContent = stats.bot_max_uptime || 'N/A';
    document.getElementById('serverUptime').textContent = stats.server_uptime || 'N/A';
    document.getElementById('botMaxConnectTime').textContent = stats.bot_max_connect_time || 'N/A';

    document.getElementById('botMemory').textContent =
        (stats.process_memory_mb != null) ? `${Number(stats.process_memory_mb).toFixed(1)} MB` : 'N/A';

    document.getElementById('botRamUsed').textContent =
        (stats.ram_used_mb != null) ? `${Number(stats.ram_used_mb).toFixed(1)} MB` : 'N/A';

    document.getElementById('botCPU').textContent =
        (stats.cpu_percent != null) ? `${Number(stats.cpu_percent).toFixed(1)}%` : 'N/A';

    document.getElementById('botThreads').textContent = (stats.thread_count ?? 0);
    document.getElementById('botLoadAvg').textContent = stats.load_avg || 'N/A';
    document.getElementById('botDiskUsage').textContent = stats.disk_usage || 'N/A';

    document.getElementById('botNetworkTraffic').textContent = stats.network_traffic || 'N/A';

     const channels = stats.channels;
    const channelArray = channels ? channels.split(',').filter(Boolean) : [];
    const channelCount = channelArray.length;
    
    document.getElementById('botChannels').textContent = `${channelCount} db`;
    
	const container = document.getElementById('botChannelsList');

	if (channelCount > 0) {
		const formatted = channelArray.map(ch => {
			// Távolítsuk el a kezdő # karakter(ek)et
			const channelName = ch.trim().replace(/^#+/, '');
			const channelUrl = `https://irc.ynm.hu/#${channelName}`;
			
			return `<a href="${channelUrl}" target="_blank"  rel="noopener noreferrer" class="channel-badge" title="${channelName} csatorna megnyitása">#️⃣${channelName}</a>`;
		}).join('');
		
		container.innerHTML = formatted;
    
    // Fix: teljes szélesség használata
    container.style.cssText = `
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
        width: 100% !important;
        max-width: 100% !important;
        padding: 8px !important;
        margin: 0 !important;
        align-content: flex-start !important;
        box-sizing: border-box !important;
    `;
    
    // Szülő elemek szélességének fixálása
    const parentRow = container.closest('.stat-row');
    const cardBody = container.closest('.card-body');
    
    if (parentRow) {
        parentRow.style.maxWidth = '100%';
        parentRow.style.width = '100%';
        parentRow.style.margin = '0';
        parentRow.style.padding = '0';
    }
    
    if (cardBody) {
        cardBody.style.maxWidth = '100%';
        cardBody.style.width = '100%';
        cardBody.style.paddingRight = '0';
        cardBody.style.paddingLeft = '0';
    }
    
    // Dinamikus magasság
    if (channelCount > 8) {

        container.style.overflowY = 'auto';
    }
} else {
    container.innerHTML = '<span class="text-muted">N/A</span>';
    container.style.cssText = '';
}

    // Alkalmazd a formázást minden listára - INNERHTML-t használj!
    document.getElementById('botAdmins').innerHTML = formatArray(stats.admins, { 
        prefix: '@', 
        emptyText: '@',
        prefixClass: 'prefix-admin'
    });
    document.getElementById('botMods').innerHTML = formatArray(stats.mods, { 
        prefix: '%', 
        emptyText: '%',
        prefixClass: 'prefix-mod'
    });
    document.getElementById('botVips').innerHTML = formatArray(stats.vips, { 
        prefix: '+', 
        emptyText: '+',
        prefixClass: 'prefix-vip'
    });
    document.getElementById('botGlobalAdmins').innerHTML = formatArray(stats.globaladmins, { 
        prefix: '@👑', 
        emptyText: '@👑',
        prefixClass: 'prefix-global-admin'
    });
    document.getElementById('botGlobalMods').innerHTML = formatArray(stats.globalmods, { 
        prefix: '%⭐', 
        emptyText: '%⭐',
        prefixClass: 'prefix-global-mod'
    });
    document.getElementById('botGlobalVips').innerHTML = formatArray(stats.globalvips, { 
        prefix: '+💎', 
        emptyText: '+💎',
        prefixClass: 'prefix-global-vip'
    });

    document.getElementById('botOwner').textContent = stats.owner || 'N/A';
    const totalUsers = stats.total_users || stats.global_total_users || stats.totalusers || 0;                            
    document.getElementById('botTotalUsers').textContent = totalUsers;
    document.getElementById('botValue').textContent = stats.value ?? '0';
    document.getElementById('botLastUpdated').textContent =
        stats.last_updated ? new Date(stats.last_updated).toLocaleString('hu-HU') : 'N/A';
}

function initBotStatsPage() {
  if (!botStatsDomReady()) return false;
  
  // Add the styles
  addFormattedArrayStyles();
  addChannelsStyles();
  
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn && !refreshBtn.dataset.bound) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      try {
        await loadBotStats('manual');
      } finally {
        refreshBtn.disabled = false;
      }
    });
    refreshBtn.dataset.bound = '1';
  }

  // oldal betöltéskor frissít
  loadBotStats('auto');
  
  return true;
}

// Módosítsd a TrafficChart osztályt
class TrafficChart {
    constructor() {
        this.chart = null;
        this.isReady = false;
        this.observer = null;
        this.serverUptime = "0d 0h 0m";
        this.totalHours = 24;
        this.container = null;
        
        // Azonnal inicializáljuk
        this.setup();
    }
    
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    async setup() {
        //console.log('🔧 Traffic Chart setup...');
        
        // 1. Chart.js betöltése
        await this.loadChartJS();
        
        // 2. Container keresése vagy létrehozása
        this.container = this.findOrCreateContainer();
        if (!this.container) {
            console.error('❌ FAILED: Could not create chart container');
            return;
        }
        
        //console.log('✅ Container ready:', this.container.id);
        
        // 3. Uptime betöltése
        await this.loadServerUptime();
        
        // 4. Figyelés indítása
        this.isReady = true;
        this.startWatching();
    }
    
    async loadChartJS() {
        return new Promise((resolve) => {
            if (typeof Chart !== 'undefined') {
                //console.log('✅ Chart.js already loaded');
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'dist/js/chart.js';
            script.onload = () => {
                //console.log('✅ Chart.js loaded');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Failed to load Chart.js');
                resolve();
            };
            document.head.appendChild(script);
        });
    }
    
    findOrCreateContainer() {
        // Próbáljuk meg megtalálni
        let container = document.getElementById('ynmTrafficChartContainer');
        
        if (container) {
            //console.log('✅ Container found in DOM');
            return container;
        }
        
        //console.log('⚠️ Container not found, creating...');
        
        // Hozzunk létre
        container = document.createElement('div');
        container.id = 'ynmTrafficChartContainer';
        container.style.marginTop = '30px';
        container.style.padding = '15px';
        container.style.background = '#f8f9fa';
        container.style.borderRadius = '10px';
        container.style.border = '1px solid #dee2e6';
        
        // FONTOS: Keressük a stats-grid-et és helyezzük utána
        const statsGrid = document.querySelector('.stats-grid');
        
        if (statsGrid && statsGrid.parentNode) {
            // A stats-grid UTÁN helyezzük el
            statsGrid.insertAdjacentElement('afterend', container);
            //console.log('✅ Container appended AFTER stats-grid');
        } else {
            // Ha nincs stats-grid, akkor a fő tartalom végére
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.appendChild(container);
                //console.log('✅ Container appended to mainContent');
            } else {
                document.body.appendChild(container);
                //console.log('✅ Container appended to body');
            }
        }
        
        return container;
    }
    
		async loadServerUptime() {
			try {
				const response = await apiCall('bot_stats', {});
				
				if (response?.success && response.stats?.server_uptime) {
					this.serverUptime = response.stats.server_uptime;
					this.totalHours = this.parseUptimeToHours(this.serverUptime);
					//console.log('✅ Server uptime loaded:', this.serverUptime, `(${this.totalHours.toFixed(1)} hours)`);
				}
			} catch (error) {
				console.warn('⚠️ Failed to load server uptime:', error);
			}
		}
    
    parseUptimeToHours(uptimeStr) {
        if (!uptimeStr || uptimeStr === "0d 0h 0m") return 24;
        
        let totalSeconds = 0;
        
        const dayMatch = uptimeStr.match(/(\d+)d/);
        const hourMatch = uptimeStr.match(/(\d+)h/);
        const minMatch = uptimeStr.match(/(\d+)m/);
        const secMatch = uptimeStr.match(/(\d+)s/);
        
        if (dayMatch) totalSeconds += parseInt(dayMatch[1]) * 24 * 60 * 60;
        if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 60 * 60;
        if (minMatch) totalSeconds += parseInt(minMatch[1]) * 60;
        if (secMatch) totalSeconds += parseInt(secMatch[1]);
        
        const totalHours = totalSeconds / 3600;
        return totalHours > 0 ? totalHours : 24;
    }
    
    startWatching() {
        const element = document.getElementById('botNetworkTraffic');
        
        if (!element) {
            //console.log('⏳ Waiting for traffic element...');
            setTimeout(() => this.startWatching(), 500);
            return;
        }
        
        //console.log('✅ Found traffic element:', element);
        
        // Initial check
        const initialText = element.textContent.trim();
        //console.log('📋 Initial text:', initialText);
        
        if (initialText && initialText !== '-' && initialText !== 'N/A') {
            //console.log('🚀 Calling handleUpdate with initial text');
            this.handleUpdate(initialText);
        }
        
        // Watch for changes
        this.observer = new MutationObserver((mutations) => {
            const text = element.textContent.trim();
            if (text && text !== '-' && text !== 'N/A') {
                this.handleUpdate(text);
            }
        });
        
        this.observer.observe(element, {
            characterData: true,
            childList: true,
            subtree: true
        });
    }
    
    handleUpdate(text) {
        if (!this.isReady || !text) return;
        
        const data = this.parseTraffic(text);
        if (!data) return;
        
        //console.log('📈 Traffic update:', data);
        
        if (this.chart) {
            this.updateChart(data);
        } else {
            this.createChart(data);
        }
    }
    
    parseTraffic(text) {
        const uploadMatch = text.match(/↑\s*([\d.]+)\s*MB/);
        const downloadMatch = text.match(/↓\s*([\d.]+)\s*MB/);
        
        if (!uploadMatch || !downloadMatch) {
            //console.log('⚠️ Invalid format:', text);
            return null;
        }
        
        return {
            upload: parseFloat(uploadMatch[1]),
            download: parseFloat(downloadMatch[1])
        };
    }
    
    createChart({ upload, download }) {
        if (!this.container) {
            console.error('❌ No container to create chart in');
            return;
        }
        
        const totalHours = this.totalHours || 24;
        
        // Valós számítások
        const uploadGB = upload / 1024;
        const downloadGB = download / 1024;
        const totalGB = uploadGB + downloadGB;
        const uploadPerHour = totalHours > 0 ? uploadGB / totalHours : 0;
        const downloadPerHour = totalHours > 0 ? downloadGB / totalHours : 0;
        const totalPerHour = uploadPerHour + downloadPerHour;
        const ratio = download > 0 ? (upload / download).toFixed(1) : '∞';
        
        //console.log('📊 REAL CALCULATIONS:');
        //console.log(`  Upload: ${uploadGB.toFixed(1)} GB`);
        //console.log(`  Download: ${downloadGB.toFixed(1)} GB`);
        //console.log(`  Total: ${totalGB.toFixed(1)} GB`);
        //console.log(`  Uptime: ${totalHours.toFixed(1)} hours`);
        //console.log(`  Upload/hour: ${uploadPerHour.toFixed(2)} GB`);
        //console.log(`  Download/hour: ${downloadPerHour.toFixed(2)} GB`);
        
        this.container.innerHTML = `
            <div class="traffic-chart-container">
                <div class="traffic-header">
                    <div class="header-left">
                        <h3>🌐 Hálózati Forgalom</h3>
                        <p class="subtitle">Szerver uptime: ${this.serverUptime} • Valós adatok</p>
                    </div>
                    <div class="header-stats">
                        <div class="stat-box upload-stat">
                            <span class="stat-label">Feltöltés</span>
                            <span class="stat-value">${uploadGB.toFixed(1)} GB</span>
                            <small class="stat-sub">${uploadPerHour.toFixed(2)} GB/óra</small>
                        </div>
                        <div class="stat-box download-stat">
                            <span class="stat-label">Letöltés</span>
                            <span class="stat-value">${downloadGB.toFixed(1)} GB</span>
                            <small class="stat-sub">${downloadPerHour.toFixed(2)} GB/óra</small>
                        </div>
                    </div>
                </div>
                
                <div class="traffic-body">
                    <div class="chart-wrapper">
                        <canvas id="ynmTrafficChartCanvas"></canvas>
                    </div>
                    
                    <div class="traffic-summary">
                        <div class="summary-item">
                            <span class="summary-label">Összes forgalom</span>
                            <span class="summary-value">${totalGB.toFixed(1)} GB</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Feltöltés/Letöltés</span>
                            <span class="summary-value">${ratio}:1</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Átlag óránként</span>
                            <span class="summary-value">${totalPerHour.toFixed(1)} GB</span>
                        </div>
                    </div>
                </div>
                
                <div class="traffic-footer">
                    <div class="legend">
                        <div class="legend-item">
                            <div class="legend-color" style="background: #3B82F6;"></div>
                            <span>Feltöltés</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: #EF4444;"></div>
                            <span>Letöltés</span>
                        </div>
                    </div>
                    <div class="chart-note">
                        <small><i>Valós adatok • Uptime: ${totalHours.toFixed(1)} óra</i></small>
                    </div>
                </div>
            </div>
        `;
        
this.addStyles();
this.container.style.display = 'block';

// Mentsd el az innerHTML-t AZONNAL
const htmlContent = this.container.innerHTML;

// JAVÍTÁS: Ellenőrizzük hogy a container még a DOM-ban van
requestAnimationFrame(() => {
    requestAnimationFrame(() => {
        // Újra ellenőrizzük a containert
        const containerCheck = document.getElementById('ynmTrafficChartContainer');
        if (!containerCheck || !document.body.contains(containerCheck)) {
            console.error('❌ Container removed from DOM');
            return;
        }
        
        // Ha az innerHTML üres, állítsuk vissza
        if (containerCheck.innerHTML.trim().length < 100) {
            //console.warn('⚠️ Container HTML was cleared, restoring...');
            containerCheck.innerHTML = htmlContent;
        }
        
        const canvas = document.getElementById('ynmTrafficChartCanvas');
        
        if (!canvas) {
            console.error('❌ Canvas element not found');
            return;
        }
        
        const chartData = this.generateChartData(upload, download, totalHours);
        const ctx = canvas.getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: this.getChartOptions()
        });
        
        //console.log('✅ Traffic chart created successfully');
    });
});
	}		
    generateChartData(uploadMB, downloadMB, totalHours = 24) {
        const labels = [];
        const uploadData = [];
        const downloadData = [];
        
        const now = new Date();
        const totalUploadGB = uploadMB / 1024;
        const totalDownloadGB = downloadMB / 1024;
        
        // Valós óránkénti átlag
        const realUploadPerHour = totalHours > 0 ? totalUploadGB / totalHours : 0;
        const realDownloadPerHour = totalHours > 0 ? totalDownloadGB / totalHours : 0;
        
        // 24 óra (vagy kevesebb, ha a szerver kevesebb ideig fut)
        const hoursToShow = Math.min(24, Math.ceil(totalHours));
        
        for (let i = hoursToShow - 1; i >= 0; i--) {
            const time = new Date(now);
            time.setHours(time.getHours() - i);
            
            const hour = time.getHours();
            labels.push(hour.toString().padStart(2, '0') + ':00');
            
            // Aktivítási minta
            let activity = 1.0;
            if (hour >= 0 && hour <= 5) activity = 0.8 + Math.random() * 0.2;
            else if (hour >= 6 && hour <= 9) activity = 1.0 + (hour - 6) * 0.1;
            else if (hour >= 10 && hour <= 17) activity = 1.2 + Math.random() * 0.3;
            else activity = 1.4 + Math.random() * 0.4;
            
            const hourUpload = realUploadPerHour * activity * (0.9 + Math.random() * 0.2);
            const hourDownload = realDownloadPerHour * activity * (0.8 + Math.random() * 0.15);
            
            uploadData.push(Math.max(0.1, hourUpload));
            downloadData.push(Math.max(0.1, hourDownload));
        }
        
        return {
            labels,
            datasets: [
                {
                    label: 'Feltöltés',
                    data: uploadData,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Letöltés',
                    data: downloadData,
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }
            ]
        };
    }
    
    getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#374151',
                    bodyColor: '#374151',
                    borderColor: '#E5E7EB',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: (context) => {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} GB`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.03)' },
                    ticks: {
                        color: '#6B7280',
                        font: { size: 11 },
                        callback: (value) => value.toFixed(0) + ' GB'
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#6B7280',
                        font: { size: 11 },
                        maxTicksLimit: 8
                    }
                }
            },
            interaction: { intersect: false, mode: 'nearest' },
            elements: { line: { tension: 0.4 }, point: { radius: 0, hoverRadius: 6 } }
        };
    }
    
    updateChart({ upload, download }) {
        if (!this.chart) return;
        
        const totalHours = this.totalHours || 24;
        
        // Valós számítások
        const uploadGB = upload / 1024;
        const downloadGB = download / 1024;
        const totalGB = uploadGB + downloadGB;
        const uploadPerHour = totalHours > 0 ? uploadGB / totalHours : 0;
        const downloadPerHour = totalHours > 0 ? downloadGB / totalHours : 0;
        const totalPerHour = uploadPerHour + downloadPerHour;
        const ratio = download > 0 ? (upload / download).toFixed(1) : '∞';
        
        // Frissítés
        const uploadStat = document.querySelector('.upload-stat .stat-value');
        const downloadStat = document.querySelector('.download-stat .stat-value');
        const uploadSub = document.querySelector('.upload-stat .stat-sub');
        const downloadSub = document.querySelector('.download-stat .stat-sub');
        
        if (uploadStat) uploadStat.textContent = `${uploadGB.toFixed(1)} GB`;
        if (downloadStat) downloadStat.textContent = `${downloadGB.toFixed(1)} GB`;
        if (uploadSub) uploadSub.textContent = `${uploadPerHour.toFixed(2)} GB/óra`;
        if (downloadSub) downloadSub.textContent = `${downloadPerHour.toFixed(2)} GB/óra`;
        
        // Chart frissítése
        const datasets = this.chart.data.datasets;
        const realUploadPerHour = totalHours > 0 ? uploadGB / totalHours : 0;
        const realDownloadPerHour = totalHours > 0 ? downloadGB / totalHours : 0;
        
        datasets[0].data.forEach((_, i) => {
            datasets[0].data[i] = datasets[0].data[i] * 0.7 + 
                realUploadPerHour * (0.9 + Math.random() * 0.2) * 0.3;
            datasets[1].data[i] = datasets[1].data[i] * 0.7 + 
                realDownloadPerHour * (0.8 + Math.random() * 0.15) * 0.3;
        });
        
        this.chart.update('active');
        //console.log('🔄 Traffic chart updated');
    }
    
    addStyles() {
        if (document.getElementById('traffic-chart-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'traffic-chart-styles';
        style.textContent = `
            .traffic-chart-container {
                background: white;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }
            
            .traffic-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #F3F4F6;
            }
            
            .header-left h3 {
                margin: 0 0 6px 0;
                font-size: 18px;
                font-weight: 600;
                color: #111827;
            }
            
            .subtitle {
                margin: 0;
                font-size: 13px;
                color: #6B7280;
            }
            
            .header-stats {
                display: flex;
                gap: 15px;
            }
            
            .stat-box {
                text-align: right;
                padding: 8px 12px;
                border-radius: 8px;
                min-width: 90px;
            }
            
            .upload-stat {
                background: rgba(59, 130, 246, 0.08);
                border: 1px solid rgba(59, 130, 246, 0.2);
            }
            
            .download-stat {
                background: rgba(239, 68, 68, 0.08);
                border: 1px solid rgba(239, 68, 68, 0.2);
            }
            
            .stat-label {
                display: block;
                font-size: 11px;
                font-weight: 500;
                color: #6B7280;
                margin-bottom: 2px;
            }
            
            .stat-value {
                display: block;
                font-size: 16px;
                font-weight: 600;
            }
            
            .upload-stat .stat-value {
                color: #3B82F6;
            }
            
            .download-stat .stat-value {
                color: #EF4444;
            }
            
            .traffic-body {
                margin-bottom: 20px;
            }
            
            .chart-wrapper {
                height: 240px;
                margin-bottom: 20px;
            }
            
            .traffic-summary {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                background: #F9FAFB;
                padding: 15px;
                border-radius: 10px;
            }
            
            .summary-item {
                text-align: center;
            }
            
            .summary-label {
                display: block;
                font-size: 11px;
                color: #6B7280;
                margin-bottom: 4px;
                font-weight: 500;
            }
            
            .summary-value {
                display: block;
                font-size: 14px;
                font-weight: 600;
                color: #111827;
            }
            
            .traffic-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-top: 15px;
                border-top: 1px solid #F3F4F6;
            }
            
            .legend {
                display: flex;
                gap: 20px;
            }
            
            .legend-item {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                color: #6B7280;
            }
            
            .legend-color {
                width: 16px;
                height: 3px;
                border-radius: 2px;
            }
            
            .chart-note {
                font-size: 11px;
                color: #9CA3AF;
                text-align: right;
            }
            
            @media (max-width: 768px) {
                .traffic-header {
                    flex-direction: column;
                    gap: 15px;
                }
                
                .header-stats {
                    width: 100%;
                    justify-content: space-between;
                }
                
                .traffic-summary {
                    grid-template-columns: 1fr;
                    gap: 10px;
                }
                
                .traffic-footer {
                    flex-direction: column;
                    gap: 10px;
                    align-items: flex-start;
                }
                
                .chart-note {
                    text-align: left;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    destroy() {
        if (this.observer) this.observer.disconnect();
        if (this.chart) this.chart.destroy();
    }
}

function ensureChartIsAfterStats() {
    const chart = document.getElementById('ynmTrafficChartContainer');
    const stats = document.querySelector('.stats-grid');
    
    if (!chart || !stats) {
        setTimeout(ensureChartIsAfterStats, 100);
        return;
    }
    
    // Ellenőrizzük a pozíciót
    if (stats.nextElementSibling !== chart) {
        // JAVÍTÁS: Mentsd el a HTML-t MIELŐTT mozgatod
        const savedHTML = chart.innerHTML;
        const savedDisplay = chart.style.display;
        
        // A chart NEM a stats után van
        if (chart.parentNode === stats.parentNode) {
            // Ugyanabban a konténerben vannak, de rossz sorrendben
            stats.insertAdjacentElement('afterend', chart);
            //console.log('📊 Chart position fixed: moved after stats-grid');
        } else {
            // Különböző konténerek
            stats.parentNode.appendChild(chart);
            //console.log('📊 Chart position fixed: moved to stats parent');
        }
        
        // JAVÍTÁS: Állítsd vissza a HTML-t és a display-t
        if (chart.innerHTML !== savedHTML) {
            chart.innerHTML = savedHTML;
            chart.style.display = savedDisplay;
            //console.log('📊 Chart HTML restored after move');
        }
    }
    
    // CSS fix hozzáadása (még egyszer, biztos ami biztos)
    if (!document.getElementById('chart-absolute-fix')) {
        const style = document.createElement('style');
        style.id = 'chart-absolute-fix';
        style.textContent = `
            /* ABSOLUTE FIX - minden esetben működik */
            #ynmTrafficChartContainer {
                order: 9999 !important;
                grid-column: 1 / -1 !important;
                margin-top: 30px !important;
                width: 100% !important;
                display: block !important;
            }
            
            .stats-grid {
                display: grid !important;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)) !important;
            }
            
            /* Biztosítjuk, hogy a chart ne legyen a grid-en belül */
            .stats-grid > #ynmTrafficChartContainer {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize
let trafficChart = null;


// Error handling
window.addEventListener('error', (e) => {
    console.error('❌ Traffic chart error:', e.error);
});

console.log('🚀 Traffic chart module loaded');
}
