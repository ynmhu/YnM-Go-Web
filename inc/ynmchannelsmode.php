<?php
// inc/ynmchannelsmode.php
if (session_status() === PHP_SESSION_NONE) session_start();

function hasRole($requiredRole) {
    if (!isset($_SESSION['username']) || $_SESSION['username'] === 'Guest') {
        return false;
    }
    
    $userRole = $_SESSION['role'] ?? 'user';
    
    $roleHierarchy = [
        'user' => 0,
        'vip' => 1,
        'mod' => 2,
        'admin' => 3,
        'owner' => 4
    ];
    
    $requiredLevel = $roleHierarchy[$requiredRole] ?? 0;
    $userLevel = $roleHierarchy[$userRole] ?? 0;
    
    return $userLevel >= $requiredLevel;
}

if (!isset($_SESSION['username']) || $_SESSION['username'] === 'Guest') {
    exit;
}
?>

<div class="dashboard-section" id="channels-mode-section">
    <h3>🔧 Channel Modes</h3>
    <div class="section-header">
        <span>Channel Modes Management</span>
        <button id="refreshModesBtn" class="btn btn-secondary">🔄 Refresh</button>
    </div>

    <div id="channelsModeContainer">
        <div class="loading-state">Loading channels...</div>
    </div>
</div>

<style>
/* Channel Mode Cards */
.channel-mode-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    transition: transform 0.2s;
}

.channel-mode-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}

.channel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid rgba(255,255,255,0.2);
}

.channel-name {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.channel-info {
    display: flex;
    gap: 15px;
    font-size: 13px;
    color: rgba(255,255,255,0.9);
}

.channel-info-item {
    display: flex;
    align-items: center;
    gap: 5px;
}

.channel-info-item i {
    opacity: 0.8;
}

/* Mode Toggle Grid */
.mode-toggle-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
    margin-top: 15px;
}

/* Mode Toggle Button */
.mode-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.15);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
}

.mode-toggle-btn:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
    transform: scale(1.02);
}

.mode-toggle-btn.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-color: #fff;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.mode-toggle-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.mode-toggle-btn .mode-icon {
    font-size: 18px;
    margin-right: 8px;
}

.mode-toggle-btn .mode-label {
    flex: 1;
    text-align: left;
}

.mode-toggle-btn .mode-indicator {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
}

.mode-toggle-btn.active .mode-indicator {
    background: #4ade80;
}

.mode-toggle-btn.active .mode-indicator::before {
    content: '✓';
    color: #fff;
}

/* Mode with parameter */
.mode-toggle-btn.has-param {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
}

.mode-param-input {
    width: 100%;
    padding: 6px 10px;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    color: #fff;
    font-size: 13px;
}

.mode-param-input::placeholder {
    color: rgba(255, 255, 255, 0.6);
}

/* Mode Categories */
.mode-category {
    margin-bottom: 20px;
}

.mode-category-title {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

/* No Permission State */
.no-permission-message {
    text-align: center;
    padding: 30px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
}

/* Loading State */
.loading-state {
    text-align: center;
    padding: 40px;
    color: #666;
    font-size: 16px;
}

/* Responsive */
@media (max-width: 768px) {
    .mode-toggle-grid {
        grid-template-columns: 1fr;
    }
    
    .channel-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }
}
</style>