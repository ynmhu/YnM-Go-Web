<?php
// api/users_api.php - Teljes API-alapú felhasználó kezelés

// VÁLTOZÓK INICIALIZÁLÁSA
$currentUser = $_SESSION['username'] ?? 'unknown';
$currentRole = $_SESSION['role'] ?? 'vip';
$currentUserId = $_SESSION['user_id'] ?? 0;

// Engedélyezett mezők frissítéshez
$allowed_fields = ALLOWED_USER_FIELDS;

// Helper függvények
function canModifyUser($currentUser, $currentRole, $targetUser, $targetRole) {
    if ($currentUser === $targetUser) {
        return true; // Mindenki módosíthatja saját magát (de nem szerepkört)
    }
    
    $roleHierarchy = ['owner' => 5, 'admin' => 4, 'mod' => 3, 'vip' => 2, 'user' => 1 ];
    $currentLevel = $roleHierarchy[$currentRole] ?? 0;
    $targetLevel = $roleHierarchy[$targetRole] ?? 0;
    
    return ($currentLevel > $targetLevel);
}

function canViewUser($currentRole, $targetRole) {
    $viewMatrix = [
        'owner' => ['owner', 'admin', 'mod', 'vip', 'user'],
        'admin' => ['admin', 'mod', 'vip', 'user'],
        'mod'   => ['mod', 'vip', 'user'],
        'vip'   => ['vip', 'user'],
		'user'   => ['user']
    ];
    
    return in_array($targetRole, $viewMatrix[$currentRole] ?? []);
}

function filterUsersByRole($users, $currentRole, $currentUser) {
    $filtered = [];
    
    foreach ($users as $user) {
        $targetRole = $user['role'] ?? 'user';
        
        // Szerepkör-alapú szűrés
        if ($currentRole === 'owner') {
            $filtered[] = $user;
        } elseif ($currentRole === 'admin') {
            if (in_array($targetRole, ['admin', 'mod', 'vip', 'user'])) {
                $filtered[] = $user;
            }
        } elseif ($currentRole === 'mod') {
            if (in_array($targetRole, ['mod', 'vip', 'user'])) {
                $filtered[] = $user;
            }
		} elseif ($currentRole === 'vip') {
            if (in_array($targetRole, ['vip', 'user'])) {
                $filtered[] = $user;
            }
        } else { // VIP
            if ($targetRole === 'user' || $user['nick'] === $currentUser) {
                $filtered[] = $user;
            }
        }
    }
    
    return $filtered;
}

try {
    switch ($action) {

        // ✅ Felhasználó hozzáadása
        case 'users_add':
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Kötelező mezők
            $nick = sanitize($input['nick'] ?? '');
            $hostmask = sanitize($input['hostmask'] ?? '');
            
            if (empty($nick) || empty($hostmask)) {
                jsonResponse(['success' => false, 'error' => 'Nick and hostmask are required'], 400);
            }
            
            // JOGOSULTSÁG ELLENŐRZÉS
            $newRole = sanitize($input['role'] ?? 'user');
            $roleHierarchy = ['owner' => 5, 'admin' => 4, 'mod' => 3, 'vip' => 2, 'user' => 1];
            $currentRoleLevel = $roleHierarchy[$currentRole] ?? 0;
            $newRoleLevel = $roleHierarchy[$newRole] ?? 0;
            
            // 1. Nem adhat magasabb szerepkört
            if ($newRoleLevel > $currentRoleLevel) {
                jsonResponse([
                    'success' => false, 
                    'error' => "Nem adhatsz magasabb szerepkört mint a sajátod ($currentRole)"
                ], 403);
            }
            
            // 2. Szerepkör-specifikus szabályok
            if ($currentRole === 'vip') {
                if ($newRole !== 'vip') {
                    jsonResponse(['success' => false, 'error' => 'VIP csak VIP szerepkört adhat'], 403);
                }
            } elseif ($currentRole === 'mod') {
                if (!in_array($newRole, ['vip', 'mod'])) {
                    jsonResponse(['success' => false, 'error' => 'Moderátor csak VIP vagy Mod szerepkört adhat'], 403);
                }
            } elseif ($currentRole === 'admin') {
                if ($newRole === 'owner') {
                    jsonResponse(['success' => false, 'error' => 'Admin nem adhat owner szerepkört'], 403);
                }
            }
            
            // Bot API hívás - user létrehozása
            $userData = [
                'nick' => $nick,
                'email' => sanitize($input['email'] ?? ''),
                'hostmask' => $hostmask,
                'role' => $newRole,
                'lang' => sanitize($input['lang'] ?? 'en'),
                'mychar' => sanitize($input['mychar'] ?? '!'),
                'welcome' => sanitize($input['welcome'] ?? ''),
                'pass' => $input['pass'] ?? '',
                'invites' => intval($input['invites'] ?? 0),
                'discord_id' => sanitize($input['discord_id'] ?? ''),
                'telegram_id' => sanitize($input['telegram_id'] ?? ''),
                'facebook' => sanitize($input['facebook'] ?? ''),
                'added_by' => $currentUser
            ];
            
            $result = callBotAPI('POST', '/users', $userData);
            
            if ($result === null) {
                throw new Exception('Bot API is not responding');
            }
            
            if (!($result['success'] ?? false)) {
                throw new Exception($result['error'] ?? 'Failed to create user');
            }
            
            // Audit log
            logActivity('➕', "New user added: $nick");
            
            jsonResponse([
                'success' => true,
                'message' => $result['message'] ?? 'User added successfully',
                'user_id' => $result['user_id'] ?? null
            ]);
            break;
            
// ✅ USER UPDATE - Felhasználó szerkesztése

case 'users_update':
    // 1. INPUT validálás
    $id = sanitize($_POST['id'] ?? '');
    
    if (empty($id)) {
        jsonResponse(['success' => false, 'error' => 'Missing user ID'], 400);
    }
    
    // 2. Lekérjük a jelenlegi user adatait (jogosultság ellenőrzéshez)
    $userData = callBotAPI('GET', '/users');
    
    if ($userData === null) {
        throw new Exception('Failed to fetch user data');
    }
    
    $rawUsers = $userData['recent_users'] ?? $userData['users'] ?? [];
    
    $targetUser = null;
    foreach ($rawUsers as $u) {
        $userId = intval($u['id'] ?? 0);
        if ($userId == $id) {
            $targetUser = $u;
            break;
        }
    }
    
    if (!$targetUser) {
        jsonResponse(['success' => false, 'error' => 'User not found'], 404);
    }
    
    $targetRole = $targetUser['role'] ?? 'vip';
    $targetNick = $targetUser['username'] ?? $targetUser['nick'] ?? '';
    
    // 3. JOGOSULTSÁG ELLENŐRZÉS - ki mit szerkeszthet?
    $canEdit = false;
    
    if ($currentRole === 'owner') {
        $canEdit = true; // owner mindent szerkeszthet
    } elseif ($currentRole === 'admin') {
        // Admin csak admin/mod/vip-et szerkeszthet (owner-t nem)
        $canEdit = in_array($targetRole, ['admin', 'mod', 'vip']);
    } elseif ($currentRole === 'mod') {
        // Mod csak mod/vip-et szerkeszthet
        $canEdit = in_array($targetRole, ['mod', 'vip']);
    } else {
        // VIP csak saját magát szerkesztheti
        $canEdit = ($targetNick === $currentUser);
    }
    
    if (!$canEdit) {
        jsonResponse([
            'success' => false, 
            'error' => "Nincs jogosultságod szerkeszteni: $targetNick ($targetRole)"
        ], 403);
    }
    
    // 4. ÖSSZEGYŰJTJÜK A MÓDOSÍTANDÓ MEZŐKET
    $updateData = [];
    
    // Mezők, amiket bárki szerkeszthet (saját magán)
    $allowedFields = ['email', 'lang', 'mychar', 'welcome', 'website', 
                      'discord_id', 'telegram_id', 'facebook', 'hostmask'];
    
    foreach ($allowedFields as $field) {
        if (isset($_POST[$field])) {
            $updateData[$field] = sanitize($_POST[$field]);
        }
    }
    
    // ROLE - csak owner/admin változtathatja
    if (isset($_POST['role'])) {
        if ($currentRole === 'owner') {
            // owner bármit beállíthat
            $updateData['role'] = sanitize($_POST['role']);
        } elseif ($currentRole === 'admin') {
            // Admin csak admin/mod/vip-re állíthatja
            $newRole = sanitize($_POST['role']);
            if (in_array($newRole, ['admin', 'mod', 'vip'])) {
                $updateData['role'] = $newRole;
            }
        }
        // Mod és VIP nem változtathat role-t
    }
    
    // INVITES - csak owner/admin változtathatja
    if (isset($_POST['invites']) && in_array($currentRole, ['owner', 'admin'])) {
        $updateData['invites'] = intval($_POST['invites']);
    }
    
    // PASSWORD - ha meg van adva
    if (!empty($_POST['password'])) {
        $updateData['password'] = $_POST['password']; // A Bot API majd hash-eli
    }
    
    if (empty($updateData)) {
        jsonResponse(['success' => false, 'error' => 'No fields to update'], 400);
    }
    
    // 5. KÜLDÉS A BOT API-nak
    $updateData['id'] = intval($id);
    
    $result = callBotAPI('PUT', '/users/' . $id, $updateData);
    
    if ($result === null || !($result['success'] ?? false)) {
        $error = $result['error'] ?? 'Failed to update user';
        jsonResponse(['success' => false, 'error' => $error], 500);
    }
    
    // 6. SIKERES MENTÉS
    jsonResponse([
        'success' => true,
        'message' => 'User updated successfully',
        'user' => $result['user'] ?? []
    ]);
    break;
            
// ✅ JAVÍTOTT - Felhasználó törlése

case 'users_delete':
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id'] ?? 0);
    
    if ($id === 0) {
        jsonResponse(['success' => false, 'error' => 'Missing user ID'], 400);
    }
    
    // 1. Lekérjük a felhasználó adatait
    $userData = callBotAPI('GET', '/users');
    
    if ($userData === null) {
        throw new Exception('Bot API is not responding');
    }
    
    // ✅ JAVÍTVA: recent_users és users is próbáljuk
    $rawUsers = $userData['recent_users'] ?? $userData['users'] ?? [];
    
    if (empty($rawUsers)) {
        throw new Exception('No users data received from Bot API');
    }
    
    // Keresés ID alapján
    $user = null;
    foreach ($rawUsers as $u) {
        $userId = intval($u['id'] ?? 0);
        if ($userId == $id) {
            $user = $u;
            break;
        }
    }
    
    if (!$user) {
        jsonResponse(['success' => false, 'error' => 'User not found'], 404);
    }
    
    $targetUser = $user['username'] ?? $user['nick'] ?? '';
    $targetRole = $user['role'] ?? 'vip';
    
    if (empty($targetUser)) {
        jsonResponse(['success' => false, 'error' => 'Invalid user data'], 400);
    }
    
    // 2. Saját magát nem törlheti
    if ($targetUser === $currentUser) {
        jsonResponse(['success' => false, 'error' => 'Saját fiókodat nem törölheted'], 403);
    }
    
    // 3. JOGOSULTSÁG ELLENŐRZÉS
    $canDelete = false;
    
    if ($currentRole === 'owner') {
        $canDelete = true;
    } elseif ($currentRole === 'admin') {
        $canDelete = in_array($targetRole, ['vip', 'mod']);
    } elseif ($currentRole === 'mod') {
        $canDelete = ($targetRole === 'vip');
    }
    
    if (!$canDelete) {
        jsonResponse([
            'success' => false, 
            'error' => "Nincs jogosultságod törölni: $targetUser ($targetRole)"
        ], 403);
    }
    
    // 4. Bot API hívás - törlés (nick alapján!)
    error_log("🗑️  Deleting user: $targetUser (ID: $id)");
    
    $result = callBotAPI('DELETE', "/users/{$targetUser}");
    
    if ($result === null) {
        throw new Exception('Bot API is not responding');
    }
    
    if (!($result['success'] ?? false)) {
        throw new Exception($result['error'] ?? 'Failed to delete user');
    }
    
    // Audit log
    error_log("✅ User deleted successfully: $targetUser (ID: $id)");
    
    jsonResponse([
        'success' => true,
        'message' => $result['message'] ?? 'User deleted successfully'
    ]);
    break;
            
// ✅ JAVÍTÁS: users_list - ID-t használjuk a Bot API-ból

case 'users_list':
    $usersData = callBotAPI('GET', '/users');
    
    if ($usersData === null) {
        throw new Exception('Bot API is not responding');
    }
    
    $rawUsers = $usersData['recent_users'] ?? $usersData['users'] ?? [];
    
    // ✅ Konvertáljuk a Bot API formátumból a frontend formátumba
    $allUsers = array_map(function($user) {
        return [
            'id' => intval($user['id'] ?? 0),  // ✅ ID az adatbázisból
            'nick' => $user['username'] ?? $user['nick'] ?? '',
            'email' => $user['email'] ?? '',
            'role' => $user['role'] ?? 'vip',
            'hostmask' => $user['hostmask'] ?? '',
            'lang' => $user['lang'] ?? 'en',
            'mychar' => $user['mychar'] ?? '!',
            'welcome' => $user['welcome'] ?? '',
            'website' => $user['website'] ?? '',
            'invites' => intval($user['invites'] ?? 0),
            'discord_id' => $user['discord_id'] ?? '',
            'telegram_id' => $user['telegram_id'] ?? '',
            'facebook' => $user['facebook'] ?? '',
            'created_at' => $user['created_at'] ?? '',
            'last_login' => $user['last_seen'] ?? $user['last_login'] ?? '',
            'added_by' => $user['added_by'] ?? ''
        ];
    }, $rawUsers);
    
    if (!isset($usersData['success'])) {
        $usersData['success'] = !empty($allUsers);
    }
    
    if (!$usersData['success']) {
        throw new Exception($usersData['error'] ?? 'Failed to fetch users');
    }
    
    $filteredUsers = filterUsersByRole($allUsers, $currentRole, $currentUser);
    
    foreach ($filteredUsers as &$user) {
        unset($user['pass']);
        unset($user['password']);
    }
    
    jsonResponse([
        'success' => true,
        'users' => $filteredUsers,
        'count' => count($filteredUsers),
        'current_role' => $currentRole
    ]);
    break;

// ✅ JAVÍTÁS: users_get - ID alapján keresünk

case 'users_get':
    $id = sanitize($_GET['id'] ?? ''); 
    
    if (empty($id)) {
        jsonResponse(['success' => false, 'error' => 'Missing user ID'], 400);
    }
    
    // 1. Lekérjük az összes usert
    $userData = callBotAPI('GET', '/users');
    
    if ($userData === null) {
        throw new Exception('Failed to fetch user data');
    }
    
    $rawUsers = $userData['recent_users'] ?? $userData['users'] ?? [];
    
    // Keresés ID alapján (lehet szám vagy string)
    $user = null;
    foreach ($rawUsers as $u) {
        $userId = intval($u['id'] ?? 0);
        
        // Próbáljuk meg mindkét formátumban (int és string)
        if ($userId == $id || strval($userId) === $id) {
            $user = $u;
            break;
        }
    }
    
    if (!$user) {
        jsonResponse(['success' => false, 'error' => 'User not found'], 404);
    }
    
    // ✅ Konvertáljuk ugyanúgy, mint a users_list-ben
    $user = [
        'id' => intval($user['id'] ?? 0),
        'nick' => $user['username'] ?? $user['nick'] ?? '',
        'email' => $user['email'] ?? '',
        'role' => $user['role'] ?? 'vip',
        'hostmask' => $user['hostmask'] ?? '',
        'lang' => $user['lang'] ?? 'en',
        'mychar' => $user['mychar'] ?? '!',
        'welcome' => $user['welcome'] ?? '',
        'website' => $user['website'] ?? '',
        'invites' => intval($user['invites'] ?? 0),
        'discord_id' => $user['discord_id'] ?? '',
        'telegram_id' => $user['telegram_id'] ?? '',
        'facebook' => $user['facebook'] ?? '',
        'created_at' => $user['created_at'] ?? '',
        'last_login' => $user['last_seen'] ?? $user['last_login'] ?? '',
        'added_by' => $user['added_by'] ?? ''
    ];
    
    $targetUser = $user['nick'];
    $targetRole = $user['role'];
    
    // 2. JOGOSULTSÁG ELLENŐRZÉS
    $canView = false;
    
    if ($currentRole === 'owner') {
        $canView = true;
    } elseif ($currentRole === 'admin') {
        $canView = in_array($targetRole, ['admin', 'mod', 'vip']);
    } elseif ($currentRole === 'mod') {
        $canView = in_array($targetRole, ['mod', 'vip']);
    } else {
        $canView = ($targetUser === $currentUser) || ($targetRole === 'vip');
    }
    
    if (!$canView) {
        jsonResponse([
            'success' => false, 
            'error' => "Nincs jogosultságod megtekinteni: $targetUser ($targetRole)"
        ], 403);
    }
    
    unset($user['pass']);
    unset($user['password']);
    
    jsonResponse([
        'success' => true,
        'user' => $user
    ]);
    break;

            
        default:
            jsonResponse(['success' => false, 'error' => 'Unknown users action: ' . $action], 400);
    }
    
} catch (Exception $e) {
    error_log("Users API error: " . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'API error: ' . $e->getMessage()], 500);
}