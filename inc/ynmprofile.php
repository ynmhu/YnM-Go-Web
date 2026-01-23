<?php
session_start();

if (!isset($_SESSION['username']) || $_SESSION['username'] === 'Guest') {
    // ÜRES VÁLASZ - SEMMIT SEM KÜLDÜNK VISSZA
    echo '';
    exit;
}
?>

<div class="page-header">
    <h2>👤 <label for="profileNick"></label></h2>
    <button class="btn btn-primary" onclick="generateOwnPassword()">🔑 Generate Web Password</button>
</div>

<!-- Profil információk -->
<div class="profile-container">
    <div class="profile-card">
        <div class="profile-avatar" id="profileAvatarContainer">
            <div class="avatar-circle" id="profileAvatar">
                MA
            </div>
            <button class="avatar-upload-btn" onclick="openAvatarModal()" title="Change Avatar">
                📷
            </button>
        </div>
        
        <div class="profile-info">
            <h2 id="profileUsername">Loading...</h2>
            <p class="profile-role" id="profileRole">Role: Loading...</p>
        </div>
    </div>
    
    <!-- Profil szerkesztő form -->
    <div class="profile-edit">
        <h3>✏️ Edit Profile</h3>
        
 <form id="profileForm">
    <div class="form-group">
        <label for="profileNick">Nick (read-only):</label>
        <input type="text" id="profileNick" readonly disabled>
    </div>
    
    <div class="form-group">
        <label for="profileEmail">Email:</label>
        <input type="email" id="profileEmail" name="email" placeholder="your@email.com">
    </div>
    
    <div class="form-group">
        <label for="profileLang">Language:</label>
        <select id="profileLang" name="lang">
            <option value="En">English</option>
            <option value="Hu">Hungarian</option>
            <option value="Ro">Romanian</option>
        </select>
    </div>
    
		<div class="form-group">
			<label for="profileMyChar">Command Character:</label>
			<select id="profileMyChar" name="mychar">
				<option value="!">! (exclamation mark)</option>
				<option value=".">. (dot/period)</option>
				<option value="-">- (dash/hyphen)</option>
			</select>
			<small class="form-text">The character used for bot commands (e.g., !help)</small>
		</div>
    
    <!-- ✅ ÚJ MEZŐK -->
    <div class="form-group">
        <label for="profileWelcome">Welcome Message:</label>
        <textarea id="profileWelcome" name="welcome" rows="3" 
                  placeholder="Custom welcome message (optional)"></textarea>
        <small class="form-text">This message will be shown when you join a channel</small>
    </div>
    <div class="form-group">
    <label for="profileWebsite">Website / Homepage:</label>
    <input type="url" id="profileWebsite" name="website" 
           placeholder="https://ynm.hu (optional)">
    <small class="form-text">Your personal website or blog</small>
</div>
    <div class="form-group">
        <label for="profileDiscordID">Discord ID:</label>
        <input type="text" id="profileDiscordID" name="discord_id" 
               placeholder="Your Discord User ID (optional)">
    </div>
    
    <div class="form-group">
        <label for="profileTelegramID">Telegram ID:</label>
        <input type="text" id="profileTelegramID" name="telegram_id" 
               placeholder="Your Telegram User ID (optional)">
    </div>
    
    <div class="form-group">
        <label for="profileFacebook">Facebook:</label>
        <input type="text" id="profileFacebook" name="facebook" 
               placeholder="Your Facebook profile URL (optional)">
    </div>
    
    <button type="submit" class="btn btn-primary">💾 Save Changes</button>
</form>
    </div>
</div>

<!-- CHANGE PASSWORD SECTION -->
<div class="dashboard-section">
    <h3>🔐 Change Password</h3>
    <div style="max-width: 600px;">
        <form id="changePasswordForm">
            <div class="form-group">
                <label for="currentPassword">Current Password:</label>
                <input type="password" id="currentPassword" name="current_password" required 
                       placeholder="Enter your current password" autocomplete="current-password">
            </div>
            
            <div class="form-group">
                <label for="newPassword">New Password:</label>
                <input type="password" id="newPassword" name="new_password" required 
                       placeholder="Enter new password" autocomplete="new-password">
                <small class="form-text">Minimum 8 characters, include letters and numbers</small>
            </div>
            
            <div class="form-group">
                <label for="confirmPassword">Confirm New Password:</label>
                <input type="password" id="confirmPassword" name="confirm_password" required 
                       placeholder="Confirm new password" autocomplete="new-password">
            </div>
            
            <div class="password-strength" id="passwordStrength">
                <div class="strength-bar"></div>
                <span class="strength-text">Password strength: weak</span>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-warning">🔑 Change Password</button>
                <button type="button" class="btn btn-secondary" onclick="resetPasswordForm()">Reset</button>
            </div>
            
            <p style="margin-top: 15px; color: #666; font-size: 0.9rem;">
                <strong>⚠️ Important:</strong> This changes your login password for the admin panel.
                Web passwords for bot authentication are generated separately.
            </p>
        </form>
    </div>
</div>

<!-- Statisztikák -->
<div class="stats-grid" style="margin-top: 30px;">
    <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
            <h3>Total Activities</h3>
            <div id="totalActivities" class="stat-value">-</div>
        </div>
    </div>
    
    <div class="stat-card">
        <div class="stat-icon">🕒</div>
        <div class="stat-content">
            <h3>Session Duration</h3>
            <div id="sessionDuration" class="stat-value">-</div>
        </div>
    </div>
    
    <div class="stat-card">
        <div class="stat-icon">📅</div>
        <div class="stat-content">
            <h3>Login Time</h3>
            <div id="loginTime" class="stat-value">-</div>
        </div>
    </div>
    
    <div class="stat-card">
        <div class="stat-icon">🔑</div>
        <div class="stat-content">
            <h3>Access Level</h3>
            <div id="accessLevel" class="stat-value">-</div>
        </div>
    </div>
</div>

<!-- Legutóbbi aktivitások -->
<div class="dashboard-section">
    <h3>📈 Recent Activity</h3>
    <div id="recentActivity" class="activity-list">
        <p style="color: #666;">Loading recent activity...</p>
    </div>
</div>

<!-- Adatvédelem -->
<div class="dashboard-section">
    <h3>🔒 Privacy & Security</h3>
    <div class="info-grid">
        <div class="info-item">
            <span class="info-label">Hostmask:</span>
            <span class="info-value" id="profileHostmask">-</span>
        </div>
        
        <div class="info-item">
            <span class="info-label">Added By:</span>
            <span class="info-value" id="profileAddedBy">-</span>
        </div>
        
        <div class="info-item">
            <span class="info-label">Created At:</span>
            <span class="info-value" id="profileCreatedAt">-</span>
        </div>
    </div>
</div>

<!-- Avatar Upload Modal -->
<div id="avatarModal" class="modal">
    <div class="modal-content" style="max-width: 500px;">
        <span class="close" onclick="closeAvatarModal()">&times;</span>
        <h2>🖼️ Change Avatar</h2>
        
        <div class="avatar-options">
            <div class="avatar-option">
                <input type="radio" name="avatarType" value="initials" id="avatarInitials" checked>
                <label for="avatarInitials">
                    <strong>Initials</strong><br>
                    <small>Use your initials (current)</small>
                </label>
            </div>
            
            <div class="avatar-option">
                <input type="radio" name="avatarType" value="gravatar" id="avatarGravatar">
                <label for="avatarGravatar">
                    <strong>Gravatar</strong><br>
                    <small>Use Gravatar from email</small>
                </label>
            </div>
            
            <div class="avatar-option">
                <input type="radio" name="avatarType" value="upload" id="avatarUpload">
                <label for="avatarUpload">
                    <strong>Upload Image</strong><br>
                    <small>Upload custom image (max 5MB)</small>
                </label>
            </div>
        </div>
        
        <div id="uploadSection" style="display: none; margin-top: 20px;">
            <form id="avatarUploadForm" enctype="multipart/form-data">
                <input type="file" id="avatarFile" name="avatar" accept="image/jpeg,image/png,image/gif,image/webp">
                <div id="imagePreview" style="margin-top: 10px;"></div>
            </form>
        </div>
        
        <div class="modal-actions" style="margin-top: 20px;">
            <button class="btn btn-primary" onclick="saveAvatar()">Save Avatar</button>
            <button class="btn btn-secondary" onclick="closeAvatarModal()">Cancel</button>
        </div>
    </div>
</div>

<!-- Generated Password Modal -->
<div id="generatedPasswordModal" class="modal">
    <div class="modal-content">
        <span class="close" onclick="closeGeneratedPasswordModal()">&times;</span>
        <h2>🔑 Your Web Password</h2>
        
        <div style="padding: 20px; background: #d4edda; border-radius: 8px; text-align: center;">
            <p><strong>Generated Password:</strong></p>
            <div id="generatedPassword" style="font-size: 2.5rem; font-weight: bold; color: #155724; margin: 20px 0; font-family: 'Courier New', monospace;">
                ------
            </div>
            <p><strong>Valid for:</strong> <span id="generatedPasswordExpiry">30</span> minutes</p>
            <button class="btn btn-secondary" onclick="copyGeneratedPassword()">📋 Copy Password</button>
        </div>
        
        <p style="margin-top: 20px; color: #666; font-size: 0.9rem;">
            Use this password to log in to the admin panel. It will expire automatically after 30 minutes or after first use.
        </p>
    </div>
</div>

<!-- Confirmation Modal for Password Change -->
<div id="confirmPasswordChangeModal" class="modal">
    <div class="modal-content" style="max-width: 500px;">
        <span class="close" onclick="closeConfirmPasswordModal()">&times;</span>
        <h2>⚠️ Confirm Password Change</h2>
        
        <div style="padding: 20px; background: #fff3cd; border-radius: 8px; margin: 20px 0;">
            <p><strong>Are you sure you want to change your password?</strong></p>
            <p>You will need to log in again with the new password.</p>
        </div>
        
        <div class="modal-actions">
            <button class="btn btn-warning" onclick="confirmPasswordChange()">Yes, Change Password</button>
            <button class="btn btn-secondary" onclick="closeConfirmPasswordModal()">Cancel</button>
        </div>
    </div>
</div>

