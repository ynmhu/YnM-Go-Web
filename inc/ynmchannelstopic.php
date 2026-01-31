<?php
//inc/ynmchannelstopic.php
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

<div class="dashboard-section" id="channels-topic-section">
    <h3>📝 Channel Topics</h3>
    <div class="section-header">
        <span>Channels with Topic: <span id="channelsWithTopicCount">0 / 0</span></span>
        <button id="refreshTopicsBtn" class="btn btn-secondary">🔄 Refresh</button>
    </div>

    <table id="channelsTopicTable" class="channels-table">
        <thead>
            <tr>
                <th>ID</th>
                <th>Channel</th>
                <th>Current Topic</th>
                <th>Set By</th>
                <th>Set At</th>
            </tr>
        </thead>
        <tbody id="channelsTopicTableBody">
            <tr><td colspan="5">Loading...</td></tr>
        </tbody>
    </table>
</div>

<?php if (hasRole('vip')): ?>
  <button id="showClearTopicBtn" class="btn btn-warning">🗑️ Clear Topic</button>
<?php endif; ?>

<!-- Clear Topic Modal -->
<?php if (hasRole('vip')): ?>
<div id="clearTopicModal" class="modal">
    <div class="modal-content modal-content-wide">
        <span class="close" onclick="closeModal('clearTopicModal')">&times;</span>
        <h3>Clear Channel Topic</h3>
        <form id="clearTopicForm">
            <label>Select Channel:
                <select id="clearTopicChannelSelect" name="channel_id" required>
                    <option value="">-- Select Channel --</option>
                </select>
            </label>
            <p style="color: #ff6b6b; margin-top: 10px;">
                ⚠️ This will clear the topic for the selected channel.
            </p>
            <button type="submit" class="btn btn-danger">Clear Topic</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal('clearTopicModal')">Cancel</button>
        </form>
    </div>
</div>
<?php endif; ?>


<?php if (hasRole('vip')): ?>
<div id="editTopicModal" class="modal" aria-hidden="true">
  <div class="modal-content">
    <span class="close" onclick="closeModal('editTopicModal')">&times;</span>
    <h3>Topic szerkesztése</h3>

    <form id="editTopicForm">
      <input type="hidden" id="editTopicChannelId" name="id" value="">

      <div style="margin-bottom:10px;">
        <label>Csatorna:</label>
        <div id="editTopicChannelName" style="font-weight:600;"></div>
      </div>

      <label for="editTopicTextarea">Új topic:</label>
      <textarea id="editTopicTextarea" name="topic" rows="4" maxlength="500"
                placeholder="Írd ide a topicot..."></textarea>

      <div style="display:flex; gap:10px; margin-top:12px;">
        <button type="submit" class="btn btn-primary">💾 Mentés</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal('editTopicModal')">Mégse</button>
        <button type="button" id="clearTopicInlineBtn" class="btn btn-danger">🗑️ Topic törlése</button>
      </div>
    </form>
  </div>
</div>
<?php endif; ?>