<?php
// api/profile_api.php - Teljes API-alapú Profil kezelés

// VÁLTOZÓK INICIALIZÁLÁSA
$currentUser = $_SESSION['username'] ?? 'unknown';
$currentUserId = $_SESSION['user_id'] ?? 0;
$currentRole = $_SESSION['role'] ?? 'vip';

try {
    switch ($action) {
        
        // ✅ Profil lekérése
case 'profile_get':
    $profileData = callBotAPI('GET', '/profile');
    
    if ($profileData === null || !($profileData['success'] ?? false)) {
        error_log("❌ Failed to fetch profile from Go API");
        throw new Exception('Failed to fetch profile data');
    }
    
    $user = $profileData['user'];
    
    // ✅ DEBUG: Avatar info
    error_log("🖼️ Avatar info - Type: " . ($user['avatar_type'] ?? 'none') . ", URL: " . ($user['avatar_url'] ?? 'none'));
    
    // ✅ Ellenőrizd, hogy az avatar URL létezik-e a fájlrendszerben
    if (!empty($user['avatar_url']) && $user['avatar_type'] === 'upload') {
        $avatarPath = __DIR__ . '/..' . $user['avatar_url'];
        error_log("🔍 Checking file: {$avatarPath}");
        
        if (file_exists($avatarPath)) {
            error_log("✅ Avatar file exists");
        } else {
            error_log("❌ Avatar file NOT found!");
            // Ha nem létezik, reset
            $user['avatar_type'] = 'initials';
            $user['avatar_url'] = null;
        }
    }
    
    // 2. Aktivitás statisztikák - Audit Logs API-ból
    $activityData = callBotAPI('GET', "/audit-logs?username={$currentUser}");
    
    $activityCount = 0;
    $recentActivity = [];
    
    if ($activityData && ($activityData['success'] ?? false)) {
        $logs = $activityData['logs'] ?? [];
        $activityCount = count($logs);
        $recentActivity = array_slice($logs, 0, 10);
    }
    
    // 3. Session információk
    $sessionInfo = [
        'login_time' => date('Y-m-d H:i:s', $_SESSION['login_time'] ?? time()),
        'session_duration' => time() - ($_SESSION['login_time'] ?? time()),
        'session_duration_formatted' => gmdate('H:i:s', time() - ($_SESSION['login_time'] ?? time()))
    ];
    
    jsonResponse([
        'success' => true,
        'user' => $user,
        'activity_count' => $activityCount,
        'recent_activity' => $recentActivity,
        'session_info' => $sessionInfo
    ]);
    break;
            
        // ✅ Profil frissítése
case 'profile_update':
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }
    
    // Avatar mezőket KIHAGYJUK innen - azok külön endpointon mennek
    $allowedFields = ['email', 'lang', 'mychar', 'welcome', 'website', 'discord_id', 'telegram_id', 'facebook'];
    $updateData = [];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updateData[$field] = sanitize($input[$field]);
        }
    }
    
    if (empty($updateData)) {
        jsonResponse(['success' => false, 'error' => 'No valid fields to update'], 400);
        break;
    }
    
    error_log("🔄 Updating profile (non-avatar) for {$currentUser} with data: " . json_encode($updateData));
    
    // Normál profil frissítés
    $result = callBotAPI('PUT', '/profile', $updateData);
    
    if ($result === null) {
        throw new Exception('Bot API is not responding');
    }
    
    if (!($result['success'] ?? false)) {
        throw new Exception($result['error'] ?? 'Failed to update profile');
    }
    
    // Session frissítése
    foreach ($updateData as $key => $value) {
        if (in_array($key, ['email', 'lang', 'website'])) {
            $_SESSION[$key] = $value;
        }
    }
    
    // Audit log
    logActivity('🔄', "Updated own profile");
    
    jsonResponse([
        'success' => true,
        'message' => 'Profile updated successfully'
    ]);
    break;
case 'profile_upload_avatar':
    error_log("=== AVATAR UPLOAD START ===");
    error_log("User: {$currentUser}");
    
    // Fájl ellenőrzés
    if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
        error_log("❌ No file or upload error");
        jsonResponse(['success' => false, 'error' => 'No file uploaded'], 400);
        break;
    }
    
    $file = $_FILES['avatar'];
    error_log("✅ File: {$file['name']}, size: {$file['size']}, type: {$file['type']}");
    
    // Validáció
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $maxSize = 5 * 1024 * 1024;
    
    if (!in_array($file['type'], $allowedTypes)) {
        error_log("❌ Invalid type: {$file['type']}");
        jsonResponse(['success' => false, 'error' => 'Invalid file type'], 400);
        break;
    }
    
    if ($file['size'] > $maxSize) {
        error_log("❌ Too large: {$file['size']}");
        jsonResponse(['success' => false, 'error' => 'File too large'], 400);
        break;
    }
    
    // Mappa
    $uploadDir = __DIR__ . '/../uploads/avatars/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Fájlnév
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $filename = 'avatar_' . $currentUser . '_' . time() . '.' . $extension;
    $targetPath = $uploadDir . $filename;
    
    error_log("📝 Target: {$targetPath}");
    
    // Régi avatárok törlése
    $oldAvatars = glob($uploadDir . 'avatar_' . $currentUser . '_*');
    foreach ($oldAvatars as $old) {
        if (file_exists($old)) {
            unlink($old);
            error_log("🗑️ Deleted: {$old}");
        }
    }
    
    // Feltöltés
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        error_log("❌ Failed to save file");
        jsonResponse(['success' => false, 'error' => 'Failed to save file'], 500);
        break;
    }
    
    error_log("✅ File saved: {$targetPath}");
    
    // Avatar URL (relatív)
    $avatarUrl = '/uploads/avatars/' . $filename;
    error_log("🔗 Avatar URL: {$avatarUrl}");
    
    // ✅ JAVÍTVA: Bot API hívás az /profile/avatar endpointra
    $updateData = [
        'avatar_url' => $avatarUrl,
        'avatar_type' => 'upload'
    ];
    
    error_log("🔄 Calling Bot API PUT /profile/avatar with: " . json_encode($updateData));
    
    // ✅ Fontos: Az /profile/avatar endpointot használd!
    $result = callBotAPI('PUT', '/profile/avatar', $updateData);
    
    error_log("📥 Bot API response: " . json_encode($result));
    
    if ($result === null) {
        error_log("❌ Bot API returned NULL");
        
        // Rollback
        if (file_exists($targetPath)) {
            unlink($targetPath);
        }
        
        jsonResponse(['success' => false, 'error' => 'Bot API not responding'], 500);
        break;
    }
    
    if (!($result['success'] ?? false)) {
        error_log("❌ Bot API failed: " . ($result['error'] ?? 'unknown'));
        
        // Rollback
        if (file_exists($targetPath)) {
            unlink($targetPath);
        }
        
        jsonResponse(['success' => false, 'error' => $result['error'] ?? 'Failed to update database'], 500);
        break;
    }
    
    error_log("✅ Bot API success!");
    
    // Session frissítés
    $_SESSION['avatar_url'] = $avatarUrl;
    $_SESSION['avatar_type'] = 'upload';
    
    // Audit log
    logActivity('🖼️', "Uploaded new avatar");
    
    error_log("=== AVATAR UPLOAD COMPLETE ===");
    
    jsonResponse([
        'success' => true,
        'avatar_url' => $avatarUrl,
        'avatar_type' => 'upload',
        'message' => 'Avatar uploaded successfully'
    ]);
    break;
   // =====================
// PROFILE AVATAR UPDATE (csak avatar_type)
// =====================
case 'profile_update_avatar':
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }
    
    // Csak avatar_type-t veszünk figyelembe
    $avatarType = sanitize($input['avatar_type'] ?? '');
    
    if (empty($avatarType)) {
        jsonResponse(['success' => false, 'error' => 'Avatar type is required'], 400);
        break;
    }
    
    // Valid avatar types
    $allowedTypes = ['initials', 'gravatar', 'upload'];
    if (!in_array($avatarType, $allowedTypes)) {
        jsonResponse(['success' => false, 'error' => 'Invalid avatar type'], 400);
        break;
    }
    
    // Bot API hívás - CSAK avatar_type frissítése
    $updateData = [
        'avatar_type' => $avatarType
    ];
    
    error_log("🖼️ Updating avatar type for {$currentUser} to: {$avatarType}");
    
    $result = callBotAPI('PUT', '/profile/avatar', $updateData);
    
    if ($result === null) {
        throw new Exception('Bot API is not responding');
    }
    
    if (!($result['success'] ?? false)) {
        throw new Exception($result['error'] ?? 'Failed to update avatar type');
    }
    
    // Session frissítése
    $_SESSION['avatar_type'] = $avatarType;
    
    // Ha az avatar_type "upload"-ről másra vált, akkor avatar_url-t töröljük
    if ($avatarType !== 'upload') {
        $_SESSION['avatar_url'] = null;
    }
    
    logActivity('🖼️', "Changed avatar type to: {$avatarType}");
    
    jsonResponse([
        'success' => true,
        'avatar_type' => $avatarType,
        'message' => 'Avatar type updated successfully'
    ]);
    break;         
        // ✅ Jelszó módosítása
        case 'profile_change_password':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                $input = $_POST;
            }
            
            $currentPassword = $input['current_password'] ?? '';
            $newPassword = $input['new_password'] ?? '';
            
            if (empty($currentPassword) || empty($newPassword)) {
                jsonResponse(['success' => false, 'error' => 'All password fields are required'], 400);
                break;
            }
            
            if (strlen($newPassword) < 8) {
                jsonResponse(['success' => false, 'error' => 'Password must be at least 8 characters'], 400);
                break;
            }
            
            // Bot API hívás - jelszó változtatás
            $result = callBotAPI('POST', "/users/{$currentUser}/change-password", [
                'current_password' => $currentPassword,
                'new_password' => $newPassword
            ]);
            
            if ($result === null) {
                throw new Exception('Bot API is not responding');
            }
            
            if (!($result['success'] ?? false)) {
                throw new Exception($result['error'] ?? 'Failed to change password');
            }
            
            // Audit log
            logActivity('🔒', "Changed own password");
            
            // Session törlése - újra be kell jelentkezni
            session_destroy();
            
            jsonResponse([
                'success' => true,
                'message' => 'Password changed successfully. Please log in again.'
            ]);
            break;
            
        // ✅ Ideiglenes jelszó generálás saját magának
        case 'profile_generate_password':
            // Jelszó generálás (6 számjegyű)
            $password = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            
            // Bot API hívás - ideiglenes jelszó létrehozása
            $result = callBotAPI('POST', '/passwords', [
                'username' => $currentUser,
                'password' => $password,
                'expires_at' => date('Y-m-d H:i:s', strtotime('+30 minutes')),
                'expires_in' => 30,
                'max_uses' => 1,
                'generated_by' => $currentUser
            ]);
            
            if ($result === null) {
                throw new Exception('Bot API is not responding');
            }
            
            if (!($result['success'] ?? false)) {
                throw new Exception($result['error'] ?? 'Failed to generate password');
            }
            
            // Audit log
            logActivity('🔑', "Generated own temporary password");
            
            jsonResponse([
                'success' => true,
                'password' => $password,
                'expires_in' => 30,
                'expires_at' => date('Y-m-d H:i:s', strtotime('+30 minutes')),
                'max_uses' => 1
            ]);
            break;
            
        // ✅ Aktivitás előzmények
        case 'profile_activity':
            $limit = intval($_GET['limit'] ?? 50);
            
            // Bot API hívás - audit logs lekérése
            $activityData = callBotAPI('GET', "/audit-logs?username={$currentUser}&limit={$limit}");
            
            if ($activityData === null || !($activityData['success'] ?? false)) {
                throw new Exception('Failed to fetch activity logs');
            }
            
            $activity = $activityData['logs'] ?? [];
            
            jsonResponse([
                'success' => true,
                'activity' => $activity,
                'total' => count($activity)
            ]);
            break;
            
        // ✅ Csatorna jogosultságok (melyik csatornában van benne)
        case 'profile_channels':
            // Bot API hívás - channel users lekérése
            $channelUsersData = callBotAPI('GET', '/channel-users');
            
            if ($channelUsersData === null || !($channelUsersData['success'] ?? false)) {
                throw new Exception('Failed to fetch channel data');
            }
            
            // Szűrés saját user szerint
            $myChannels = [];
            foreach ($channelUsersData['channel_users'] ?? [] as $cu) {
                $cuNick = $cu['nick'] ?? $cu['user_nick'] ?? '';
                
                if ($cuNick === $currentUser) {
                    $myChannels[] = [
                        'channel' => $cu['channel'] ?? $cu['channel_name'] ?? '',
                        'role' => $cu['role'] ?? 'vip',
                        'auto_op' => ($cu['auto_op'] ?? 0) == 1,
                        'auto_voice' => ($cu['auto_voice'] ?? 0) == 1,
                        'auto_halfop' => ($cu['auto_halfop'] ?? 0) == 1,
                        'created_at' => $cu['created_at'] ?? '',
                        'added_by' => $cu['added_by'] ?? ''
                    ];
                }
            }
            
            jsonResponse([
                'success' => true,
                'channels' => $myChannels,
                'total' => count($myChannels)
            ]);
            break;
            
        // ✅ Profil statisztikák
        case 'profile_stats':
            // 1. User csatornák száma
            $channelUsersData = callBotAPI('GET', '/channel-users');
            $myChannelsCount = 0;
            
            if ($channelUsersData && ($channelUsersData['success'] ?? false)) {
                foreach ($channelUsersData['channel_users'] ?? [] as $cu) {
                    $cuNick = $cu['nick'] ?? $cu['user_nick'] ?? '';
                    if ($cuNick === $currentUser) {
                        $myChannelsCount++;
                    }
                }
            }
            
            // 2. Aktivitások száma
            $activityData = callBotAPI('GET', "/audit-logs?username={$currentUser}");
            $activityCount = 0;
            
            if ($activityData && ($activityData['success'] ?? false)) {
                $activityCount = count($activityData['logs'] ?? []);
            }
            
            // 3. Jelszavak száma (ha van)
            $passwordsData = callBotAPI('GET', "/passwords?username={$currentUser}");
            $passwordsCount = 0;
            
            if ($passwordsData && ($passwordsData['success'] ?? false)) {
                $passwordsCount = count($passwordsData['passwords'] ?? []);
            }
            
            // 4. Session idő
            $sessionDuration = time() - ($_SESSION['login_time'] ?? time());
            
            jsonResponse([
                'success' => true,
                'stats' => [
                    'channels_count' => $myChannelsCount,
                    'activity_count' => $activityCount,
                    'passwords_count' => $passwordsCount,
                    'session_duration' => $sessionDuration,
                    'session_duration_formatted' => gmdate('H:i:s', $sessionDuration),
                    'last_login' => $_SESSION['login_time'] ? date('Y-m-d H:i:s', $_SESSION['login_time']) : 'N/A',
                    'current_role' => $currentRole
                ]
            ]);
            break;
            
        default:
            jsonResponse(['success' => false, 'error' => 'Unknown profile action'], 400);
    }
    
} catch (Exception $e) {
    error_log("Profile API error: " . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'API error: ' . $e->getMessage()], 500);
}
?>