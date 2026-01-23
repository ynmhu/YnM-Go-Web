<?php
session_start();

if (!isset($_SESSION['username']) || $_SESSION['username'] === 'Guest') {
    // ÜRES VÁLASZ - SEMMIT SEM KÜLDÜNK VISSZA
    echo '';
    exit;
}
?>
<div class="page-header">
    <h2>👥 Global Access</h2>
    <button class="btn btn-primary" onclick="showAddUserModal()">➕ Add User</button>
</div>

<!-- Keresés és szűrés -->
<div class="filters">
    <input type="text" id="userSearch" placeholder="🔍 Search users..." class="search-input">
    
    <select id="roleFilter" class="filter-select">
        <option value="">All Roles</option>
        <option value="user">User</option>
        <option value="vip">VIP</option>
        <option value="mod">Moderator</option>
        <option value="admin">Admin</option>
        <option value="owner">Owner</option>
    </select>
    
    <button class="btn btn-secondary" onclick="refreshUsers()">🔄 Refresh</button>
    <button class="btn btn-warning" onclick="exportUsers()">📤 Export CSV</button>
</div>

<!-- Felhasználók táblázat -->
<div class="table-container">
    <table id="usersTable" class="data-table">
<thead>
  <tr>
    <th>ID</th>
    <th>Nick</th>
    <th>Email</th>
    <th>Role</th>
    <th>Hostmask</th>
    <th>Lang</th>
    <th>MyChar</th>
    <th>Actions</th>
  </tr>
</thead>

        <tbody id="usersTableBody">
            <tr>
                <td colspan="10" style="text-align: center; color: #666;">Loading users...</td>
            </tr>
        </tbody>
    </table>
</div>
<!-- Felhasználó adatai szerkesztő MODÁL -->
<!-- Felhasználó adatai szerkesztő MODÁL -->
<div id="userEditModal" class="modal">
  <div class="modal-content modal-large">
    <span class="close" onclick="closeUserEditModal()">&times;</span>
    <h2 id="modalEditTitle">👤 Felhasználó szerkesztése</h2>
    <form id="userEditForm">
      <input type="hidden" id="editUserIdModal" name="id">

      <div class="form-row">
        <div class="form-group">
          <label>Nick</label>
          <input type="text" id="editNick" name="nick" autocomplete="username">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="editEmail" name="email" autocomplete="email">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Szerepkör</label>
          <select id="editRole" name="role">
            <option value="user">User</option>
            <option value="vip">VIP</option>
            <option value="mod">Mod</option>
            <option value="admin">Admin</option>
            <option value="owner">owner</option>
          </select>
        </div>
        <div class="form-group">
          <label>Hostmask</label>
          <input type="text" id="editHostmask" name="hostmask" autocomplete="off">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Added By</label>
          <input type="text" id="editAddedBy" name="added_by" autocomplete="off">
        </div>
        <div class="form-group">
          <label>Language</label>
          <select id="editLang" name="lang" autocomplete="off">
            <option value="En">English</option>
            <option value="Hu">Hungarian</option>
            <option value="Ro">Romanian</option>
          </select>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>MyChar</label>
          <select id="editMychar" name="mychar" autocomplete="off">
            <option value="!">! (Exclamation mark)</option>
            <option value="-">- (Dash/hyphen)</option>
            <option value=".">. (Dot/period)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Invites</label>
          <input type="number" id="editInvites" name="invites" autocomplete="off">
        </div>
      </div>
      
      <div class="form-group">
        <label>Welcome Message</label>
        <textarea id="editWelcome" name="welcome" rows="2" autocomplete="off"></textarea>
      </div>
      
      <div class="form-row">
	  
			         <div class="form-group">
					<label>Website</label>
				<input type="url" id="editWebsite" name="website" placeholder="https://example.com" autocomplete="off">
			</div>
        <div class="form-group">
          <label>Discord ID</label>
          <input type="text" id="editDiscord" name="discord_id" autocomplete="off">
        </div>
        <div class="form-group">
          <label>Telegram ID</label>
          <input type="text" id="editTelegram" name="telegram_id" autocomplete="off">
        </div>
        <div class="form-group">
          <label>Facebook</label>
          <input type="text" id="editFacebook" name="facebook" autocomplete="off">
        </div>
      </div>
      
      <div class="form-group">
        <label>Password Change (optional)</label>
        <input type="password" id="editPass" name="pass" 
               placeholder="New password (leave empty to keep current)"
               autocomplete="new-password">
      </div>
      
      <!-- Read-only information -->
      <div class="form-row">
        <div class="form-group">
          <label>Created At:</label>
          <input type="text" id="editCreatedAt" disabled autocomplete="off">
        </div>
        <div class="form-group">
          <label>Last Login:</label>
          <input type="text" id="editLastLogin" disabled autocomplete="off">
        </div>
      </div>

      <button type="submit" class="btn btn-primary">Save</button>
      <button type="button" class="btn btn-secondary" onclick="closeUserEditModal()">Cancel</button>
    </form>
  </div>
</div>

<!-- Add/Edit User Modal -->
<div id="addUserModal" class="modal">
    <div class="modal-content modal-large">
        <span class="close" onclick="closeAddUserModal()">&times;</span>
        <h2 id="modalTitle">➕ Add New User</h2>
        
        <form id="addUserForm">
            <input type="hidden" id="editUserId" name="id">
            
            <div class="form-row">
                <div class="form-group">
                    <label for="newNick">Nick: *</label>
                    <input type="text" id="newNick" name="nick" required autocomplete="username">
                </div>
                
                <div class="form-group">
                    <label for="newEmail">Email:</label>
                    <input type="email" id="newEmail" name="email" 
                           placeholder="user@example.com" autocomplete="email">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="newHostmask">Hostmask: *</label>
                    <input type="text" id="newHostmask" name="hostmask" required 
                           placeholder="*!*@host.domain" autocomplete="off">
                </div>
                
                <div class="form-group">
                    <label for="newRole">Role:</label>
                    <select id="newRole" name="role" required autocomplete="off">
                        <option value="user">User</option>
                        <option value="vip">VIP</option>
                        <option value="mod">Moderator</option>
                        <?php if (hasRole('admin')): ?>
                        <option value="admin">Admin</option>
                        <?php endif; ?>
                        <?php if (hasRole('owner')): ?>
                        <option value="owner">owner</option>
                        <?php endif; ?>
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="newLang">Language:</label>
                    <select id="newLang" name="lang" autocomplete="off">
                        <option value="en">🇬🇧 English</option>
                        <option value="hu">🇭🇺 Hungarian</option>
                        <option value="ro">🇷🇴 Romanian</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="newMyChar">Command Char:</label>
                    <select id="newMyChar" name="mychar" autocomplete="off">
                        <option value="!">! (Exclamation)</option>
                        <option value="-">- (Dash)</option>
                        <option value=".">. (Dot)</option>
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="newPass">Password (optional):</label>
                    <input type="password" id="newPass" name="pass" 
                           placeholder="Leave empty for none"
                           autocomplete="new-password">
                </div>
                
                <div class="form-group">
                    <label for="newInvites">Invites:</label>
                    <input type="number" id="newInvites" name="invites" value="0" min="0" autocomplete="off">
                </div>
            </div>
            
            <div class="form-group">
                <label for="newWelcome">Welcome Message:</label>
                <textarea id="newWelcome" name="welcome" rows="2" 
                          placeholder="Custom welcome message..." autocomplete="off"></textarea>
            </div>
   
<div class="form-row">
    <!-- ✅ JAVÍTVA: id="newWebsite" (nem editWebsite!) -->
    <div class="form-group">
        <label for="newWebsite">Website:</label>
        <input type="url" id="newWebsite" name="website" placeholder="https://example.com" autocomplete="off">
    </div>
    
    <div class="form-group">
        <label for="newDiscord">Discord ID:</label>
        <input type="text" id="newDiscord" name="discord_id" 
               placeholder="123456789012345678" autocomplete="off">
    </div>
    
    <div class="form-group">
        <label for="newTelegram">Telegram ID:</label>
        <input type="text" id="newTelegram" name="telegram_id" 
               placeholder="@username" autocomplete="off">
    </div>
</div>

<div class="form-group">
    <label for="newFacebook">Facebook:</label>
    <input type="text" id="newFacebook" name="facebook" 
           placeholder="facebook.com/username" autocomplete="off">
</div>
            
            <button type="submit" class="btn btn-primary" id="submitBtn">Add User</button>
            <button type="button" class="btn btn-secondary" onclick="closeAddUserModal()">Cancel</button>
        </form>
    </div>
</div>

<!-- View User Details Modal -->
<div id="viewUserModal" class="modal">
    <div class="modal-content">
        <span class="close" onclick="closeViewUserModal()">&times;</span>
        <h2>👤 User Details</h2>
        <div id="userDetailsContent">
            Loading...
        </div>
    </div>
</div>