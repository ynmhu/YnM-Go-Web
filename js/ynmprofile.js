// js/ynmprofile.js - Profile oldal logika
(function() {
  'use strict';
  
  // ✅ AZONNALI ELLENŐRZÉS
  function checkIfProfilePageExists() {
    // Nézzük meg van-e a profil oldal bármilyen eleme
    const profileElements = [
      '.page-header h2',
      '.profile-container',
      '#profileForm',
      '#profileUsername'
    ];
    
    for (const selector of profileElements) {
      if (document.querySelector(selector)) {
        return true;
      }
    }
    
    // Ha van "Access Denied" üzenet
    if (document.querySelector('.alert.alert-warning')) {
      return false;
    }
    
    return false;
  }
  
  // ✅ HA NINCS PROFIL OLDAL, KILÉPÜNK
  if (!checkIfProfilePageExists()) {
    console.log('Profile page not found or user not logged in');
    return;
  }
  
  // ✅ CSAK HA VAN PROFIL OLDAL FOLYTATJUK
  console.log('Initializing profile page...');
  // =====================
  // PRIVATE VARIABLES
  // =====================
  let passwordChangeData = null;
  let isInitialized = false;
  let sessionDurationInterval = null;

  // =====================
  // INIT
  // =====================
  function init() {
    if (isInitialized) {
      console.log('🔄 Profile already initialized, reloading data only');
      loadProfile();
      return;
    }
    
    isInitialized = true;
    console.log('✅ Initializing profile page');
    
    setupEventListeners();
    initPasswordStrengthChecker();
    loadProfile();
    
    // Start session duration timer
    if (sessionDurationInterval) clearInterval(sessionDurationInterval);
    sessionDurationInterval = setInterval(updateSessionDuration, 1000);
  }

  // =====================
  // EVENT LISTENERS
  // =====================
  function setupEventListeners() {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
      profileForm.removeEventListener('submit', handleProfileUpdate); // Remove old
      profileForm.addEventListener('submit', handleProfileUpdate);
    }

    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
      changePasswordForm.removeEventListener('submit', handlePasswordChange);
      changePasswordForm.addEventListener('submit', handlePasswordChange);
    }

    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
      newPasswordInput.removeEventListener('input', checkPasswordStrength);
      newPasswordInput.addEventListener('input', checkPasswordStrength);
    }

    const avatarFile = document.getElementById('avatarFile');
    if (avatarFile) {
      avatarFile.removeEventListener('change', previewAvatarImage);
      avatarFile.addEventListener('change', previewAvatarImage);
    }
  }

  // =====================
  // PASSWORD STRENGTH CHECKER
  // =====================
  function initPasswordStrengthChecker() {
    const strengthBar = document.querySelector('.strength-bar');
    if (strengthBar && !strengthBar.querySelector('.strength-fill')) {
      strengthBar.innerHTML = '<div class="strength-fill"></div>';
    }
  }

  function checkPasswordStrength(e) {
    const password = e.target.value || '';
    const strengthBar = document.querySelector('.strength-bar .strength-fill');
    const strengthText = document.querySelector('.strength-text');
    if (!strengthBar || !strengthText) return;

    let score = 0;
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 20;
    score = Math.min(100, score);

    let color = '#dc3545', text = 'Very weak';
    if (score >= 80) { color = '#28a745'; text = 'Strong'; }
    else if (score >= 60) { color = '#17a2b8'; text = 'Good'; }
    else if (score >= 40) { color = '#ffc107'; text = 'Fair'; }
    else if (score >= 20) { color = '#fd7e14'; text = 'Weak'; }

    strengthBar.style.width = score + '%';
    strengthBar.style.backgroundColor = color;
    strengthText.textContent = `Password strength: ${text}`;
    strengthText.style.color = color;
  }

  // =====================
  // HANDLE PASSWORD CHANGE
  // =====================
  async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword) {
      showNotification('Please enter your current password', 'error');
      return;
    }
    
    if (newPassword.length < 8) {
      showNotification('New password must be at least 8 characters long', 'error');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showNotification('New passwords do not match', 'error');
      return;
    }
    
    const strengthBar = document.querySelector('.strength-bar .strength-fill');
    const strengthPercent = strengthBar ? parseInt(strengthBar.style.width) || 0 : 0;
    
    if (strengthPercent < 40) {
      if (!confirm('Your password is weak. Are you sure you want to use it?')) {
        return;
      }
    }
    
    openConfirmPasswordModal({
      current_password: currentPassword,
      new_password: newPassword
    });
  }

  // =====================
  // PASSWORD CHANGE CONFIRMATION
  // =====================
  function openConfirmPasswordModal(data) {
    passwordChangeData = data;
    const modal = document.getElementById('confirmPasswordChangeModal');
    if (modal) modal.style.display = 'block';
  }

  function closeConfirmPasswordModal() {
    const modal = document.getElementById('confirmPasswordChangeModal');
    if (modal) modal.style.display = 'none';
    passwordChangeData = null;
  }

  async function confirmPasswordChange() {
    if (!passwordChangeData) return;
    
    try {
      showNotification('Changing password...', 'info');
      
      const result = await apiCall('profile_change_password', passwordChangeData, 'POST');
      
      if (result.success) {
        showNotification('Password changed successfully! Please log in again.', 'success');
        resetPasswordForm();
        closeConfirmPasswordModal();
        setTimeout(() => {
          window.location.href = 'login.php?message=password_changed';
        }, 3000);
      } else {
        showNotification(result.error || 'Failed to change password', 'error');
      }
    } catch (error) {
      showNotification('Error changing password: ' + error.message, 'error');
    }
  }

  // =====================
  // HANDLE PROFILE UPDATE
  // =====================
  async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const profileData = {
      email: document.getElementById('profileEmail').value,
      lang: document.getElementById('profileLang').value,
      mychar: document.getElementById('profileMyChar').value,
      welcome: document.getElementById('profileWelcome').value,
      website: document.getElementById('profileWebsite').value,
      discord_id: document.getElementById('profileDiscordID').value,
      telegram_id: document.getElementById('profileTelegramID').value,
      facebook: document.getElementById('profileFacebook').value
    };
    
    if (profileData.email && !isValidEmail(profileData.email)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }
    
    if (profileData.website && !isValidUrl(profileData.website)) {
      showNotification('Please enter a valid website URL', 'error');
      return;
    }
    
    try {
      showNotification('Updating profile...', 'info');
      const result = await apiCall('profile_update', profileData, 'PUT');
      
      if (result.success) {
        showNotification('Profile updated successfully!', 'success');
        setTimeout(() => loadProfile(), 500);
      } else {
        showNotification(result.error || 'Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      showNotification('Failed to update profile: ' + error.message, 'error');
    }
  }

  // =====================
  // HELPER FUNCTIONS
  // =====================
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  function resetPasswordForm() {
    const form = document.getElementById('changePasswordForm');
    if (form) {
      form.reset();
      const strengthBar = document.querySelector('.strength-bar .strength-fill');
      const strengthText = document.querySelector('.strength-text');
      
      if (strengthBar) {
        strengthBar.style.width = '0%';
        strengthBar.style.backgroundColor = '#dc3545';
      }
      if (strengthText) {
        strengthText.textContent = 'Password strength: very weak';
        strengthText.style.color = '#666';
      }
    }
  }

  // =====================
  // GENERATE PASSWORD
  // =====================
  async function generateOwnPassword() {
    try {
      const result = await apiCall('profile_generate_password', {});
      
      if (result.success) {
        document.getElementById('generatedPassword').textContent = result.password;
        document.getElementById('generatedPasswordExpiry').textContent = result.expires_in;
        openModal('generatedPasswordModal');
        showNotification('Password generated successfully', 'success');
      } else {
        showNotification(result.error || 'Failed to generate password', 'error');
      }
    } catch (error) {
      showNotification('Failed to generate password', 'error');
    }
  }

  function closeGeneratedPasswordModal() {
    closeModal('generatedPasswordModal');
  }

  function copyGeneratedPassword() {
    const password = document.getElementById('generatedPassword').textContent;
    copyToClipboard(password);
    showNotification('Password copied to clipboard', 'success');
  }

  // =====================
  // RECENT ACTIVITY
  // =====================
  function renderRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    
    if (!activities || activities.length === 0) {
      container.innerHTML = '<p style="color: #666;">No recent activity</p>';
      return;
    }
    
    container.innerHTML = '';
    
    activities.forEach(activity => {
      const item = document.createElement('div');
      item.className = 'activity-item';
      
      item.innerHTML = `
        <span class="activity-icon">${activity.action}</span>
        <span class="activity-details">${sanitizeInput(activity.details || 'No details')}</span>
        <span class="activity-time">${formatDate(activity.timestamp)}</span>
      `;
      
      container.appendChild(item);
    });
  }

  // =====================
  // SESSION DURATION
  // =====================
  function updateSessionDuration() {
    const loginTime = document.getElementById('loginTime')?.textContent;
    if (!loginTime || loginTime === '-') return;
    
    try {
      const loginDate = new Date(loginTime);
      const now = new Date();
      const diff = Math.floor((now - loginDate) / 1000);
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      const durationEl = document.getElementById('sessionDuration');
      if (durationEl) {
        if (hours > 0) {
          durationEl.textContent = `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
          durationEl.textContent = `${minutes}m ${seconds}s`;
        } else {
          durationEl.textContent = `${seconds}s`;
        }
      }
    } catch (error) {
      console.error('Failed to update session duration:', error);
    }
  }

  // =====================
  // LOAD PROFILE
  // =====================
  async function loadProfile() {
    try {
      const result = await apiCall('profile_get', {}, 'GET');
      
      if (result.success) {
        const user = result.user;
        const sessionInfo = result.session_info;
        
        // Basic info
        const usernameEl = document.getElementById('profileUsername');
        const roleEl = document.getElementById('profileRole');
        
        if (usernameEl) usernameEl.textContent = user.nick;
        if (roleEl) roleEl.textContent = 'Role: ' + user.role.toUpperCase();
        
        // Avatar
        updateAvatarDisplay(user.avatar_url, user.avatar_type, user.nick);
        
        // Form fields
        const fields = {
          profileNick: user.nick,
          profileEmail: user.email || '',
          profileLang: user.lang || 'En',
          profileMyChar: user.mychar || '!',
          profileWelcome: user.welcome || '',
          profileWebsite: user.website || '',
          profileDiscordID: user.discord_id || '',
          profileTelegramID: user.telegram_id || '',
          profileFacebook: user.facebook || ''
        };
        
        Object.entries(fields).forEach(([id, value]) => {
          const el = document.getElementById(id);
          if (el) el.value = value;
        });
        
        // Privacy info
        const privacyFields = {
          profileHostmask: user.hostmask,
          profileAddedBy: user.added_by || 'N/A',
          profileCreatedAt: formatDate(user.created_at)
        };
        
        Object.entries(privacyFields).forEach(([id, value]) => {
          const el = document.getElementById(id);
          if (el) el.textContent = value;
        });
        
        // Statistics
        const statFields = {
          totalActivities: result.activity_count || 0,
          loginTime: formatDate(sessionInfo.login_time),
          accessLevel: user.role.toUpperCase()
        };
        
        Object.entries(statFields).forEach(([id, value]) => {
          const el = document.getElementById(id);
          if (el) el.textContent = value;
        });
        
        // Recent activity
        if (result.recent_activity && result.recent_activity.length > 0) {
          renderRecentActivity(result.recent_activity);
        }
      } else {
        showNotification('Failed to load profile', 'error');
      }
    } catch (error) {
      console.error('Profile load error:', error);
      showNotification('Failed to load profile', 'error');
    }
  }

  // =====================
  // AVATAR DISPLAY
  // =====================
  function updateAvatarDisplay(avatarUrl, avatarType, userNick) {
    const avatarContainer = document.getElementById('profileAvatar');
    if (!avatarContainer) return;

    const timestamp = new Date().getTime();

    if (avatarType === 'upload' && avatarUrl) {
      const fullUrl = avatarUrl.startsWith('http') 
        ? avatarUrl 
        : `${window.location.origin}${avatarUrl}`;
      
      const urlWithCache = `${fullUrl}?t=${timestamp}`;
      
      avatarContainer.innerHTML = `
        <img src="${urlWithCache}" 
             alt="${userNick}" 
             style="width:100%;height:100%;border-radius:50%;object-fit:cover;" 
             onerror="this.onerror=null;this.style.display='none';this.parentElement.textContent='${getInitials(userNick)}';">
      `;
    } else {
      avatarContainer.textContent = getInitials(userNick);
    }
  }

  function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  // =====================
  // AVATAR UPLOAD
  // =====================
  async function uploadAvatar() {
    const fileInput = document.getElementById('avatarFile');
    const file = fileInput?.files?.[0];
    
    if (!file) {
      showNotification('Please select an image file', 'error');
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showNotification('Invalid file type. Only JPG, PNG, GIF, WEBP allowed', 'error');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showNotification('File too large. Maximum 5MB allowed', 'error');
      return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      showNotification('Uploading avatar...', 'info');
      
      const response = await fetch('/api/api.php?action=profile_upload_avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      const text = await response.text();
      let result;
      
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error('Invalid JSON:', text);
        throw new Error('Server returned invalid JSON');
      }
      
      if (result.success) {
        showNotification('Avatar uploaded successfully!', 'success');
        closeAvatarModal();
        
        if (result.avatar_url) {
          const currentUser = document.getElementById('profileUsername')?.textContent || '';
          updateAvatarDisplay(result.avatar_url, 'upload', currentUser);
        }
        
        setTimeout(() => loadProfile(), 500);
      } else {
        showNotification(result.error || 'Failed to upload avatar', 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showNotification('Failed to upload avatar: ' + error.message, 'error');
    }
  }

  // =====================
  // AVATAR MODAL
  // =====================
  function openAvatarModal() {
    const modal = document.getElementById('avatarModal');
    if (modal) {
      modal.style.display = 'flex';
      
      document.querySelectorAll('input[name="avatarType"]').forEach(radio => {
        radio.removeEventListener('change', handleAvatarTypeChange);
        radio.addEventListener('change', handleAvatarTypeChange);
      });
      
      const fileInput = document.getElementById('avatarFile');
      if (fileInput) {
        fileInput.removeEventListener('change', previewAvatarImage);
        fileInput.addEventListener('change', previewAvatarImage);
      }
    }
  }

  function closeAvatarModal() {
    const modal = document.getElementById('avatarModal');
    if (modal) {
      modal.style.display = 'none';
      
      const form = document.getElementById('avatarUploadForm');
      if (form) form.reset();
      
      const preview = document.getElementById('imagePreview');
      if (preview) preview.innerHTML = '';
      
      const uploadSection = document.getElementById('uploadSection');
      if (uploadSection) uploadSection.style.display = 'none';
    }
  }

  function handleAvatarTypeChange(e) {
    const uploadSection = document.getElementById('uploadSection');
    if (uploadSection) {
      uploadSection.style.display = e.target.value === 'upload' ? 'block' : 'none';
    }
  }

  function previewAvatarImage(e) {
    const file = e.target.files?.[0];
    const preview = document.getElementById('imagePreview');
    if (!preview) return;
    if (!file) {
      preview.innerHTML = '';
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showNotification('Invalid file type', 'error');
      e.target.value = '';
      preview.innerHTML = '';
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showNotification('File too large', 'error');
      e.target.value = '';
      preview.innerHTML = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function(ev) {
      preview.innerHTML = `<img src="${ev.target.result}" alt="Preview" style="max-width:200px;max-height:200px;border-radius:8px;border:2px solid #e0e0e0;">`;
    };
    reader.readAsDataURL(file);
  }

  async function saveAvatar() {
    const avatarTypeEl = document.querySelector('input[name="avatarType"]:checked');
    const avatarType = avatarTypeEl?.value || 'initials';
    
    if (avatarType === 'upload') {
      await uploadAvatar();
    } else {
      try {
        showNotification('Updating avatar type...', 'info');
        const result = await apiCall('profile_update_avatar', { avatar_type: avatarType }, 'PUT');
        
        if (result.success) {
          showNotification('Avatar type updated successfully', 'success');
          closeAvatarModal();
          setTimeout(() => loadProfile(), 300);
        } else {
          showNotification(result.error || 'Failed to update avatar type', 'error');
        }
      } catch (e) {
        showNotification('Failed to update avatar type: ' + e.message, 'error');
      }
    }
  }

  // =====================
  // EXPORT TO WINDOW
  // =====================
  window.initProfilePage = init;
  window.loadProfile = loadProfile;
  window.openAvatarModal = openAvatarModal;
  window.closeAvatarModal = closeAvatarModal;
  window.saveAvatar = saveAvatar;
  window.generateOwnPassword = generateOwnPassword;
  window.closeGeneratedPasswordModal = closeGeneratedPasswordModal;
  window.copyGeneratedPassword = copyGeneratedPassword;
  window.closeConfirmPasswordModal = closeConfirmPasswordModal;
  window.confirmPasswordChange = confirmPasswordChange;
  window.resetPasswordForm = resetPasswordForm;

  // =====================
  // AUTO-INIT
  // =====================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }

})();