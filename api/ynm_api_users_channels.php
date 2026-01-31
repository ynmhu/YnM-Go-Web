<?php
// api/channel_users_api.php - Teljes API-alapú Channel Users kezelés
// (Optimized: fetch /users once, fix delete variable bug)

// VÁLTOZÓK INICIALIZÁLÁSA
$currentUser = $_SESSION['username'] ?? 'unknown';
$currentRole = $_SESSION['role'] ?? 'vip';

// Helper függvények
function canModifyChannelUser($currentRole, $currentUser, $targetNick, $targetRole, $channel) {
    // Saját magát mindenki módosíthatja
    if ($targetNick === $currentUser) {
        return true;
    }
    
    $roleHierarchy = ['owner' => 5, 'admin' => 4, 'mod' => 3, 'vip' => 2,  'user' => 1];
    $currentLevel = $roleHierarchy[$currentRole] ?? 0;
    $targetLevel = $roleHierarchy[$targetRole] ?? 0;
    
    // Owner mindent módosíthat
    if ($currentRole === 'owner') {
        return true;
    }
    
    // Admin csak VIP, Mod és saját Admin
    if ($currentRole === 'admin') {
        return in_array($targetRole, ['vip', 'mod', 'admin']);
    }
    
    // Mod csak VIP
    if ($currentRole === 'mod') {
        return $targetRole === 'vip';
    }
    
    // VIP csak saját magát
    return false;
}


function filterChannelUsersByRole($channelUsers, $currentRole, $currentUser) {
    $currentRole = strtolower(trim($currentRole));
    $currentUser = trim($currentUser);

    $roleHierarchy = ['owner'=>5, 'admin'=>4, 'mod'=>3, 'vip'=>2, 'user'=>1];

    // 1) Mely csatornákban milyen a currentUser szerepe?
    $myChannelRole = []; // channel => role
    foreach ($channelUsers as $cu) {
        $nick = $cu['user_nick'] ?? $cu['nick'] ?? '';
        $channel = $cu['channel_name'] ?? $cu['channel'] ?? '';
        if ($nick !== $currentUser || $channel === '') continue;

        // itt a LOCAL role érdekel (channel_role), nem a global/effective
        $r = strtolower(trim($cu['channel_role'] ?? ($cu['role'] ?? 'user')));

        // ha több sorból jönne, a magasabbat tartsuk meg
        $old = $myChannelRole[$channel] ?? 'user';
        if (($roleHierarchy[$r] ?? 0) > ($roleHierarchy[$old] ?? 0)) {
            $myChannelRole[$channel] = $r;
        }
    }

    // 2) Szűrés
    $filtered = [];

    foreach ($channelUsers as $cu) {
        $targetNick = $cu['user_nick'] ?? $cu['nick'] ?? '';
        $channel = $cu['channel_name'] ?? $cu['channel'] ?? '';
        if ($channel === '') continue;

        $targetRole = strtolower(trim($cu['channel_role'] ?? ($cu['role'] ?? 'vip')));

        // Owner globálisan mindent lát (ha így akarod)
        if ($currentRole === 'owner') {
            $filtered[] = $cu;
            continue;
        }

        // VIP/user: csak saját maga (és csak a saját csatornáiban)
        if ($currentRole === 'vip' || $currentRole === 'user') {
            if ($targetNick === $currentUser) {
                $filtered[] = $cu;
            }
            continue;
        }

        // Admin/Mod: csak azokban a csatornákban láthat, ahol ő is benne van megfelelő role-lal
        $myRoleHere = $myChannelRole[$channel] ?? null;
        if ($myRoleHere === null) {
            // nincs ebben a csatornában -> ne lássa
            continue;
        }

        if ($currentRole === 'admin') {
            // local admin: admin/mod/vip látható
            if (in_array($targetRole, ['admin', 'mod', 'vip'], true)) {
                $filtered[] = $cu;
            }
            continue;
        }

        if ($currentRole === 'mod') {
            // local mod: mod/vip látható
            if (in_array($targetRole, ['mod', 'vip'], true)) {
                $filtered[] = $cu;
            }
            continue;
        }

        // fallback
        if ($targetNick === $currentUser) {
            $filtered[] = $cu;
        }
    }

    return $filtered;
}

try {
    switch ($action) {
        
        // ✅ Saját csatornák listázása
        case 'my_channels':
            $channelsData = callBotAPI('GET', '/channels');
            
            if ($channelsData === null) {
                throw new Exception('Bot API is not responding');
            }
            
            $allChannels = $channelsData['channels'] ?? [];
            
            if (!($channelsData['success'] ?? false)) {
                throw new Exception($channelsData['error'] ?? 'Failed to fetch channels');
            }
            
            // Owner mindent lát
            if ($currentRole === 'owner') {
                jsonResponse([
                    'success' => true,
                    'my_channels' => $allChannels,
                    'count' => count($allChannels),
                    'note' => 'Owner sees ALL channels',
                    'current_role' => $currentRole
                ]);
                break;
            }
            
            // Nem owner: csak azok a csatornák, ahol benne van
            $channelUsersData = callBotAPI('GET', '/channel-users');
            
            if ($channelUsersData === null || !($channelUsersData['success'] ?? false)) {
                throw new Exception('Failed to fetch channel users');
            }
            
            $myChannelNames = [];
            foreach ($channelUsersData['channel_users'] ?? [] as $cu) {
                if (($cu['nick'] ?? '') === $currentUser) {
                    $channelName = $cu['channel'] ?? '';
                    if (!in_array($channelName, $myChannelNames)) {
                        $myChannelNames[] = $channelName;
                    }
                }
            }
            
            // Szűrjük le a csatornákat
            $myChannels = array_filter($allChannels, function($ch) use ($myChannelNames) {
                return in_array($ch['name'] ?? '', $myChannelNames);
            });
            
            sort($myChannels);
            
            jsonResponse([
                'success' => true,
                'my_channels' => array_values($myChannels),
                'count' => count($myChannels),
                'current_role' => $currentRole
            ]);
            break;
            
        // ✅ Összes csatorna (csak owner és admin)
        case 'all_channels':
            if (!in_array($currentRole, ['owner', 'admin'])) {
                jsonResponse(['success' => false, 'error' => 'Nincs jogosultságod'], 403);
            }
            
            $channelsData = callBotAPI('GET', '/channels');
            
            if ($channelsData === null) {
                throw new Exception('Bot API is not responding');
            }
            
            if (!($channelsData['success'] ?? false)) {
                throw new Exception($channelsData['error'] ?? 'Failed to fetch channels');
            }
            
            $channels = $channelsData['channels'] ?? [];
            
            jsonResponse([
                'success' => true,
                'channels' => $channels,
                'count' => count($channels),
                'current_role' => $currentRole
            ]);
            break;
            
     // ✅ Channel Users listázása
 case 'channel_users_list':
    // 1) Bot API: összes channel_users
    $channelUsersData = callBotAPI('GET', '/channel-users');

    if ($channelUsersData === null) {
        throw new Exception('Bot API is not responding');
    }
    if (!($channelUsersData['success'] ?? false)) {
        throw new Exception($channelUsersData['error'] ?? 'Failed to fetch channel users');
    }

    $allChannelUsers = $channelUsersData['channel_users'] ?? [];

    // 2) Bot API: globális users (role + hostmask stb.) – egyszer
    $usersData = callBotAPI('GET', '/users');
    $userRoleMap = [];
    if ($usersData && isset($usersData['users'])) {
        foreach ($usersData['users'] as $u) {
            $nick = $u['username'] ?? $u['nick'] ?? '';
            if ($nick !== '') {
                $userRoleMap[$nick] = strtolower($u['role'] ?? 'user');
            }
        }
    }

    // 3) Enhanced lista összeállítása (global_role + channel_role + effective_role)
    $roleHierarchy = ['owner' => 5, 'admin' => 4, 'mod' => 3, 'vip' => 2, 'user' => 1];

    $enhancedChannelUsers = [];
    foreach ($allChannelUsers as $cu) {
        $nick = $cu['nick'] ?? '';
        $channelName = $cu['channel'] ?? '';

        $channelRole = strtolower($cu['role'] ?? 'vip');
        $globalRole  = $userRoleMap[$nick] ?? 'user';

        $globalLevel  = $roleHierarchy[$globalRole] ?? 0;
        $channelLevel = $roleHierarchy[$channelRole] ?? 0;
        $effectiveRole = ($channelLevel > $globalLevel) ? $channelRole : $globalRole;

        $enhancedChannelUsers[] = array_merge($cu, [
            'user_nick'      => $nick,
            'channel_name'   => $channelName,
            'global_role'    => $globalRole,
            'channel_role'   => $channelRole,
            'effective_role' => $effectiveRole,
            'role'           => $effectiveRole, // backward compatibility
        ]);
    }

    // 4) Current user "local max role" kiszámítása a listából (dashboard nélkül)
    $effectiveRoleForFiltering = strtolower(trim($currentRole)); // globál fallback
    $maxLevel = $roleHierarchy[$effectiveRoleForFiltering] ?? 0;

    foreach ($enhancedChannelUsers as $row) {
        $rowNick = $row['user_nick'] ?? $row['nick'] ?? '';
        if ($rowNick !== $currentUser) continue;

        // itt kifejezetten a channel_role érdekel (LOCAL jog)
        $rowRole = strtolower(trim($row['channel_role'] ?? 'user'));
        $lvl = $roleHierarchy[$rowRole] ?? 0;

        if ($lvl > $maxLevel) {
            $maxLevel = $lvl;
            $effectiveRoleForFiltering = $rowRole;
        }
    }

    // 5) Szerepkör alapú szűrés (a filter függvényed marad)
    $filteredChannelUsers = filterChannelUsersByRole(
        $enhancedChannelUsers,
        $effectiveRoleForFiltering,
        $currentUser
    );

    jsonResponse([
        'success' => true,
        'channel_users' => $filteredChannelUsers,
        'stats' => [
            'total' => count($filteredChannelUsers),
            'user_role' => $effectiveRoleForFiltering
        ]
    ]);
    break;
            
        // ✅ Channel User hozzáadása
        case 'channel_users_add':
            $input = json_decode(file_get_contents('php://input'), true);
            
            $nick = sanitize($input['nick'] ?? '');
            $hostmask = sanitize($input['hostmask'] ?? '');
            $channel = sanitize($input['channel'] ?? '');
            $role = sanitize($input['role'] ?? 'vip');
            $autoOp = isset($input['auto_op']) ? (bool)$input['auto_op'] : false;
            $autoVoice = isset($input['auto_voice']) ? (bool)$input['auto_voice'] : false;
            $autoHalfop = isset($input['auto_halfop']) ? (bool)$input['auto_halfop'] : false;
            
            if (empty($nick) || empty($channel)) {
                jsonResponse(['success' => false, 'error' => 'Nick and Channel are required'], 400);
            }
            
            // JOGOSULTSÁG ELLENŐRZÉS
            if ($currentRole === 'vip') {
                if ($nick !== $currentUser) {
                    jsonResponse(['success' => false, 'error' => 'VIP csak saját magát adhatja hozzá'], 403);
                }
                
                if ($autoOp || $autoHalfop) {
                    jsonResponse(['success' => false, 'error' => 'VIP csak Auto Voice-ot kaphat'], 403);
                }
            } elseif ($currentRole === 'mod') {
                // Mod csak VIP-et adhat hozzá (vagy saját magát)
                if ($nick !== $currentUser) {
                    // Ellenőrizzük a cél user szerepét
                    $usersData = callBotAPI('GET', '/users');
                    $targetUser = null;
                    
                    foreach ($usersData['users'] ?? [] as $u) {
                        if (($u['nick'] ?? '') === $nick) {
                            $targetUser = $u;
                            break;
                        }
                    }
                    
                    $targetRole = $targetUser['role'] ?? 'vip';
                    
                    if ($targetRole !== 'vip') {
                        jsonResponse(['success' => false, 'error' => 'Moderátor csak VIP felhasználókat adhat csatornához'], 403);
                    }
                }
            }
            
            // Bot API hívás
            $channelUserData = [
                'nick' => $nick,
                'hostmask' => $hostmask,
                'channel' => $channel,
                'role' => $role,
				'auto_op' => (bool)$autoOp,
				'auto_voice' => (bool)$autoVoice,
				'auto_halfop' => (bool)$autoHalfop,
                'added_by' => $currentUser
            ];
            
            $result = callBotAPI('POST', '/channel-users/add', $channelUserData);
            
            if ($result === null) {
                throw new Exception('Bot API is not responding');
            }
            
            if (!($result['success'] ?? false)) {
                throw new Exception($result['error'] ?? 'Failed to add user to channel');
            }
            
            // Audit log
            logActivity('➕', "User $nick added to channel $channel");
            
            jsonResponse([
                'success' => true,
                'message' => $result['message'] ?? 'User added to channel successfully',
                'id' => $result['id'] ?? null
            ]);
            break;
            
        // ✅ Channel User frissítése
case 'channel_users_update':
    // Több helyről próbáljuk meg beolvasni az adatokat
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Ha nincs JSON, akkor próbáljuk $_POST-ból
    if (!$input) {
        $input = $_POST;
    }
    
    // Debug log
    error_log("channel_users_update input: " . json_encode($input));
    error_log("POST data: " . json_encode($_POST));
    error_log("GET data: " . json_encode($_GET));
    
    $id = intval($input['id'] ?? $_POST['id'] ?? $_GET['id'] ?? 0);
    $field = sanitize($input['field'] ?? $_POST['field'] ?? $_GET['field'] ?? '');
    $value = $input['value'] ?? $_POST['value'] ?? $_GET['value'] ?? '';
    
    error_log("Parsed - ID: $id, Field: $field, Value: $value");
    
    if ($id === 0 || empty($field)) {
        error_log("Validation failed - ID: $id, Field: '$field'");
        jsonResponse(['success' => false, 'error' => 'Hiányzó kötelező mezők'], 400);
    }
            
            $allowed_fields = ['auto_op', 'auto_voice', 'auto_halfop'];
            if (!in_array($field, $allowed_fields)) {
                jsonResponse(['success' => false, 'error' => 'Csak auto módok módosíthatók'], 400);
            }
            
            // 1. Lekérjük a channel user adatait
            $channelUsersData = callBotAPI('GET', '/channel-users');
            
            if ($channelUsersData === null || !($channelUsersData['success'] ?? false)) {
                throw new Exception('Failed to fetch channel users');
            }
            
            $channelUser = null;
            foreach ($channelUsersData['channel_users'] ?? [] as $cu) {
                if (($cu['id'] ?? 0) == $id) {
                    $channelUser = $cu;
                    break;
                }
            }
            
            if (!$channelUser) {
                jsonResponse(['success' => false, 'error' => 'Csatorna felhasználó nem található'], 404);
            }
            
            $targetNick = $channelUser['nick'] ?? $channelUser['user_nick'] ?? '';
            $targetChannel = $channelUser['channel'] ?? $channelUser['channel_name'] ?? '';
            $targetRole = $channelUser['user_role'] ?? 'vip';
            
     // 2. JOGOSULTSÁG ELLENŐRZÉS
    if ($currentRole === 'vip') {
        if ($targetNick !== $currentUser) {
            jsonResponse(['success' => false, 'error' => 'VIP felhasználóként csak a saját beállításaidat módosíthatod'], 403);
        }
        if ($field !== 'auto_voice') {
            jsonResponse(['success' => false, 'error' => 'VIP felhasználóként csak az "Auto Voice" beállítást módosíthatod'], 403);
        }
    } elseif ($currentRole === 'mod') {
    // ✅ KÖZÖS CSATORNA ELLENŐRZÉS MOD-NAL
    if ($targetNick !== $currentUser) {
        // ✅ JAVÍTVA: nick és channel mezőket használunk (bot API formátum)
        $modInChannel = false;
        
        error_log("🔍 MOD CHECK: currentUser=$currentUser, targetChannel=$targetChannel");
        
        foreach ($channelUsersData['channel_users'] ?? [] as $cu) {
            $cuNick = $cu['nick'] ?? '';
            $cuChannel = $cu['channel'] ?? '';
            
            error_log("  Checking: nick=$cuNick, channel=$cuChannel");
            
            if ($cuNick === $currentUser && $cuChannel === $targetChannel) {
                $modInChannel = true;
                error_log("  ✅ FOUND! Mod IS in channel");
                break;
            }
        }
        
        error_log("modInChannel result: " . ($modInChannel ? 'true' : 'false'));
        
        if (!$modInChannel) {
            jsonResponse(['success' => false, 'error' => 'Nincs közös csatornád ezzel a felhasználóval'], 403);
        }
        
        if ($targetRole !== 'vip') {
            jsonResponse(['success' => false, 'error' => 'Moderátorként csak VIP felhasználók beállításait módosíthatod'], 403);
        }
        
        if ($field !== 'auto_voice') {
            $fieldName = ($field === 'auto_op') ? 'Auto OP (+o)' : 'Auto Halfop (+h)';
            jsonResponse(['success' => false, 'error' => "Moderátorként VIP felhasználóknál csak az 'Auto Voice' engedélyezhető. ($fieldName nem módosítható)"], 403);
        }
    }
} elseif ($currentRole === 'admin') {
    // ✅ KÖZÖS CSATORNA ELLENŐRZÉS ADMIN-NAL
    if ($targetNick !== $currentUser) {
        // ✅ JAVÍTVA: nick és channel mezőket használunk (bot API formátum)
        $adminInChannel = false;
        
        error_log("🔍 ADMIN CHECK: currentUser=$currentUser, targetChannel=$targetChannel");
        
        foreach ($channelUsersData['channel_users'] ?? [] as $cu) {
            $cuNick = $cu['nick'] ?? '';
            $cuChannel = $cu['channel'] ?? '';
            
            error_log("  Checking: nick=$cuNick, channel=$cuChannel");
            
            if ($cuNick === $currentUser && $cuChannel === $targetChannel) {
                $adminInChannel = true;
                error_log("  ✅ FOUND! Admin IS in channel");
                break;
            }
        }
        
        error_log("adminInChannel result: " . ($adminInChannel ? 'true' : 'false'));
        
        if (!$adminInChannel) {
            jsonResponse(['success' => false, 'error' => 'Nincs közös csatornád ezzel a felhasználóval'], 403);
        }
        
        if (!in_array($targetRole, ['vip', 'mod', 'admin'])) {
            jsonResponse(['success' => false, 'error' => 'Adminisztrátorként csak VIP, Moderátor és Admin felhasználók beállításait módosíthatod'], 403);
        }
        
        if ($targetRole === 'admin' && $field === 'auto_op' && $value) {
            jsonResponse(['success' => false, 'error' => 'Adminisztrátornak csak a tulajdonos adhat OP jogot (+o)'], 403);
        }
    }
}
    // Owner: mindent módosíthat, nincs korlátozás
            
            // 3. Bot API hívás - frissítés
			$numericValue = ($value === true || $value === 'true' || $value === '1' || $value === 1) ? 1 : 0;

			$updateData = [
			  'id' => $id,
			  'field' => $field,
			  'value' => $numericValue,

			  // ✅ Go API által elvárt auth mezők
			  'current_user' => $_SESSION['username'] ?? $currentUser ?? 'unknown',
			  'current_role' => $_SESSION['role'] ?? $currentRole ?? 'vip',
			];

			// POST /channel-users/update endpoint használata (Go bot API)
			$result = callBotAPI('POST', '/channel-users/update', $updateData);
            
            if ($result === null) {
                throw new Exception('Bot API is not responding');
            }
            
			if (!($result['success'] ?? false)) {
				// ✅ a bot API küld error + message + details mezőket → add vissza őket
				$status = 400;

				if (($result['error'] ?? '') === 'Permission denied') {
					$status = 403;
				} elseif (($result['error'] ?? '') === 'User authentication required') {
					$status = 401;
				}

				jsonResponse([
					'success' => false,
					'error'   => $result['error'] ?? 'Update failed',
					'message' => $result['message'] ?? null,
					'details' => $result['details'] ?? null,
				], $status);
			}
            
            $fieldName = ($field === 'auto_op') ? 'Auto OP (+o)' : 
                         (($field === 'auto_voice') ? 'Auto Voice (+v)' : 'Auto Halfop (+h)');
            $statusText = $value ? 'bekapcsolva' : 'kikapcsolva';
            
            // Audit log
            logActivity('🔄', "Channel user #$id updated: $field = $numericValue");
            
			jsonResponse([
			  'success' => true,
			  'message' => "✅ {$fieldName} sikeresen {$statusText}",
			  'id'      => $id,
			  'field'   => $field,
			  'value'   => $numericValue,
			  'target'  => [
				  'nick'    => $targetNick,
				  'channel' => $targetChannel,
			  ],
			  // opcionális: a Go válaszból is visszaadhatod
			  'bot_action' => $result['bot_action'] ?? null
			]);
            break;
            
        // ✅ Channel User törlése
        case 'channel_users_delete':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                $input = $_POST;
            }
            
            // Read ID robustly from multiple sources
            $id = intval($input['id'] ?? $_POST['id'] ?? $_GET['id'] ?? 0);
            error_log("channel_users_delete - ID: $id - request by: " . ($currentUser));
            
            if ($id === 0) {
                jsonResponse(['success' => false, 'error' => 'Missing ID'], 400);
            }
            
            // 1. Lekérjük a channel user adatait
            $channelUsersData = callBotAPI('GET', '/channel-users');
            
            if ($channelUsersData === null || !($channelUsersData['success'] ?? false)) {
                throw new Exception('Failed to fetch channel users');
            }
            
            $channelUser = null;
            foreach ($channelUsersData['channel_users'] ?? [] as $cu) {
                if (intval($cu['id'] ?? 0) === $id) {
                    $channelUser = $cu;
                    break;
                }
            }
            
            if (!$channelUser) {
                jsonResponse(['success' => false, 'error' => 'Channel user not found'], 404);
            }
            
            $targetNick = $channelUser['nick'] ?? $channelUser['user_nick'] ?? '';
            $targetChannel = $channelUser['channel'] ?? $channelUser['channel_name'] ?? '';
            $targetRole = $channelUser['user_role'] ?? $channelUser['role'] ?? 'vip';
            
            // 2. Saját magát nem törölheti (opcionális védelem)
            if ($targetNick === $currentUser) {
                jsonResponse(['success' => false, 'error' => 'Saját bejegyzésedet nem törölheted'], 403);
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
                    'error' => "Nincs jogosultságod törölni: $targetNick ($targetRole)"
                ], 403);
            }
            
            // 4. Bot API hívás - küldjük az ID-t és a törlő user adatait JSON body-ként
            $result = callBotAPI('DELETE', '/channel-users', [
                'id' => $id,
                'deleted_by' => $currentUser,
                'deleted_by_role' => $currentRole
            ]);
            
            if ($result === null) {
                throw new Exception('Bot API is not responding');
            }
            
            if (!($result['success'] ?? false)) {
                throw new Exception($result['error'] ?? 'Failed to delete channel user');
            }
            
            // Audit log
            logActivity('🗑️', "User $targetNick removed from $targetChannel (ID: $id)");
            
            jsonResponse([
                'success' => true,
                'message' => $result['message'] ?? 'User removed from channel successfully'
            ]);
            break;
            
        // ✅ Channel Users statisztikák
        case 'channel_users_stats':
            $channelUsersData = callBotAPI('GET', '/channel-users');
            
            if ($channelUsersData === null || !($channelUsersData['success'] ?? false)) {
                throw new Exception('Failed to fetch channel users');
            }
            
            $allChannelUsers = $channelUsersData['channel_users'] ?? [];
            
            // Szerepkör alapú szűrés
            $filteredChannelUsers = filterChannelUsersByRole($allChannelUsers, $currentRole, $currentUser);
            
            // Statisztikák számítása
            $stats = [
                'total' => count($filteredChannelUsers),
                'auto_op' => 0,
                'auto_voice' => 0,
                'auto_halfop' => 0,
                'most_active_channel' => 'N/A',
                'most_active_count' => 0
            ];
            
            $channelCounts = [];
            
            foreach ($filteredChannelUsers as $cu) {
                if (($cu['auto_op'] ?? 0) == 1) $stats['auto_op']++;
                if (($cu['auto_voice'] ?? 0) == 1) $stats['auto_voice']++;
                if (($cu['auto_halfop'] ?? 0) == 1) $stats['auto_halfop']++;
                
                $channel = $cu['channel'] ?? $cu['channel_name'] ?? '';
                if (!isset($channelCounts[$channel])) {
                    $channelCounts[$channel] = 0;
                }
                $channelCounts[$channel]++;
            }
            
            // Legaktívabb csatorna
            if (!empty($channelCounts)) {
                arsort($channelCounts);
                $mostActive = array_key_first($channelCounts);
                $stats['most_active_channel'] = $mostActive;
                $stats['most_active_count'] = $channelCounts[$mostActive];
            }
            
            jsonResponse([
                'success' => true,
                'stats' => $stats,
                'user_role' => $currentRole
            ]);
            break;
            
        default:
            jsonResponse(['success' => false, 'error' => 'Unknown channel_users action'], 400);
    }
    
} catch (Exception $e) {
    error_log("Channel Users API error: " . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'API error: ' . $e->getMessage()], 500);
}
?>