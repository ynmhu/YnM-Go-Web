<?php
if (session_status() === PHP_SESSION_NONE) session_start();

function hasRole($requiredRole) {
    // Ellenőrizd, hogy be van-e jelentkezve
    if (!isset($_SESSION['username']) || $_SESSION['username'] === 'Guest') {
        return false;
    }
    
    // Az aktuális user role-ja
    $userRole = $_SESSION['role'] ?? 'user';
    
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
<div class="dashboard-section" id="channels-section">
    <h3>🔗 Channel List</h3>
    <span>Total Channels: <span id="activeChannelCount">0</span></span>
    <button id="refreshChannelsBtn" class="btn btn-secondary">Refresh</button>
<table id="channelsTable" class="channels-table">
  <thead>
    <tr>
      <th>ID</th>
      <th>Name</th>
      <th>Owner</th>
      <th>Hostmask</th>
      <th>Auto Modes</th>
      <th>Created At</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody id="channelsTableBody"></tbody>
</table>
</div>
<?php if (hasRole('admin')): ?>
  <button id="showAddChannelBtn" class="btn btn-info">➕ Add Channel</button>
<?php endif; ?>

<!-- Modal (can be <div class="modal" ...> as usual) -->
<?php if (hasRole('admin')): ?>
<div id="addChannelModal" class="modal">
  <div class="modal-content">
    <span class="close" onclick="closeModal('addChannelModal')">&times;</span>
    <h3>Add a New Channel</h3>
    <form id="addChannelForm">
      <label>Name: <input type="text" name="name" id="newChannelName" required></label>
      <label>Owner: <input type="text" name="owner" id="newChannelOwner"></label>
      <label>Hostmask: <input type="text" name="owner_hostmask" id="newChannelHostmask"></label>
      <label><input type="checkbox" id="newAutoOp"> AutoOp</label>
      <label><input type="checkbox" id="newAutoVoice"> AutoVoice</label>
      <label><input type="checkbox" id="newAutoHalfOp"> AutoHalfOp</label>
      <button type="submit" class="btn btn-success">Add</button>
    </form>
  </div>
</div>
<?php endif; ?>
