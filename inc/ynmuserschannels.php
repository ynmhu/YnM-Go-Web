<?php
if (session_status() === PHP_SESSION_NONE) session_start();

function hasRole($requiredRole) {
    // Ellenőrizd, hogy be van-e jelentkezve
    if (!isset($_SESSION['username']) || $_SESSION['username'] === 'Guest') {
        return false;
    }
    
    // Az aktuális user role-ja
    $userRole = $_SESSION['role'] ?? 'vip';
    
    // Role hierarchy
    $roleHierarchy = [
        'user' => 0,
        'vip' => 1,
        'mod' => 2,
        'admin' => 3,
        'owner' => 4
    ];
    
    // Ellenőrzés
    $requiredLevel = $roleHierarchy[$requiredRole] ?? 0;
    $userLevel = $roleHierarchy[$userRole] ?? 0;
    
    return $userLevel >= $requiredLevel;
}
if (!isset($_SESSION['username']) || $_SESSION['username'] === 'Guest') {
    exit;
}
?>
<div class="dashboard-section" id="channel-users-section">
    <h3>👥 Channel Users</h3>
    <div class="filters-row">
        <div>
            <label>Channel: 
                <select id="filterChannel" class="filter-select">
                    <option value="">All Channels</option>
                </select>
            </label>
            <label>User: 
                <select id="filterUser" class="filter-select">
                    <option value="">All Users</option>
                </select>
            </label>
        </div>
        <span>Total Entries: <span id="channelUserCount">0</span></span>
        <button id="refreshChannelUsersBtn" class="btn btn-secondary">Refresh</button>
    </div>
    
    <table id="channelUsersTable" class="channel-users-table">
        <thead>
            <tr>
                <th>ID</th>
                <th>Channel</th>
                <th>User</th>
                <th>Hostmask</th>
                <th>Auto Voice</th>
                <th>Auto HalfOp</th>
                <th>Auto Op</th>
                <th>Added At</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody id="channelUsersTableBody"></tbody>
    </table>
</div>

<button id="showAddChannelUserBtn" class="btn btn-info">➕ Add Channel User</button>

<!-- Add Channel User Modal -->
<div id="addChannelUserModal" class="modal">
    <div class="modal-content">
        <span class="close" onclick="closeModal('addChannelUserModal')">&times;</span>
        <h3>Add User to Channel</h3>
        <form id="addChannelUserForm">
            <label>Channel: 
                <select name="channel" id="newChannel" required>  
                    <option value="">Select Channel</option>
                </select>
            </label>
            <label>User: 
                <select name="nick" id="newUserNick" required>  
                    <option value="">Select User</option>
                </select>
            </label>
            <label>Hostmask: <input type="text" name="hostmask" id="newUserHostmask"></label>
            <label><input type="checkbox" id="newUserAutoVoice"> AutoVoice</label>
            <label><input type="checkbox" id="newUserAutoHalfOp"> AutoHalfOp</label>
            <label><input type="checkbox" id="newUserAutoOp"> AutoOp</label>
            <button type="submit" class="btn btn-success">Add</button>
			<label>Role:
  <select name="role" id="newUserRole">
    <option value="user">user</option>
    <option value="vip" selected>vip</option>
    <option value="mod">mod</option>
    <option value="admin">admin</option>
    <option value="owner">owner</option>
  </select>
</label>
        </form>
    </div>
</div>