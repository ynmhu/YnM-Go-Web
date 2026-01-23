<?php
session_start();

if (!isset($_SESSION['username']) || $_SESSION['username'] === 'Guest') {
    // ÜRES VÁLASZ - SEMMIT SEM KÜLDÜNK VISSZA
    echo '';
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
<button id="showAddChannelBtn" class="btn btn-info">➕ Add Channel</button>

<!-- Modal (can be <div class="modal" ...> as usual) -->
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
