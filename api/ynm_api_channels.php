<?php
// api/channels_api.php - Teljes API-alapú Channels kezelés

// VÁLTOZÓK INICIALIZÁLÁSA
$currentUser = $_SESSION['username'] ?? 'unknown';
$currentRole = $_SESSION['role'] ?? 'vip';

try {
    switch ($action) {
        
        // ✅ Csatornák listázása (alap)
case 'channels_list':
    $channelsData = callBotAPI('GET', '/channels');
    
    if ($channelsData === null) {
        throw new Exception('Bot API is not responding');
    }
    
    if (!($channelsData['success'] ?? false)) {
        throw new Exception($channelsData['error'] ?? 'Failed to fetch channels');
    }
    
    $channels = $channelsData['channels'] ?? [];
    
    // ✅ MOD/VIP SZŰRÉS: csak azokat a csatornákat látja, ahol benne van
    if ($currentRole !== 'owner' && $currentRole !== 'admin') {
        $channelUsersData = callBotAPI('GET', '/channel-users');
        
        if ($channelUsersData === null || !($channelUsersData['success'] ?? false)) {
            // Ha nem sikerül lekérni a channel users-t, üres listát adunk
            $channels = [];
        } else {
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
            $channels = array_filter($channels, function($ch) use ($myChannelNames) {
                return in_array($ch['name'] ?? '', $myChannelNames);
            });
            
            $channels = array_values($channels); // Re-index
        }
    }
    
    $stats = [
        'total' => count($channels),
        'current_role' => $currentRole
    ];
    
    jsonResponse([
        'success' => true,
        'channels' => $channels,
        'stats' => $stats
    ]);
    break;
            
        // ✅ Csatornák listázása TELJES statisztikákkal
        case 'channels_list_full':
            // 1. Channels lekérése
            $channelsData = callBotAPI('GET', '/channels');
            
            if ($channelsData === null || !($channelsData['success'] ?? false)) {
                throw new Exception('Failed to fetch channels');
            }
            
            // 2. Channel Users lekérése
            $channelUsersData = callBotAPI('GET', '/channel-users');
            
            if ($channelUsersData === null || !($channelUsersData['success'] ?? false)) {
                throw new Exception('Failed to fetch channel users');
            }
            
            $channels = $channelsData['channels'] ?? [];
            $channelUsers = $channelUsersData['channel_users'] ?? [];
            
            // 3. Statisztikák számítása csatornánként
            $channelsWithStats = [];
            
            foreach ($channels as $channel) {
                $channelName = $channel['name'] ?? '';
                
                // Számoljuk meg a usereket szerepkör szerint
                $userCount = 0;
                $ownerCount = 0;
                $adminCount = 0;
                $modCount = 0;
                $vipCount = 0;
                
                foreach ($channelUsers as $cu) {
                    if (($cu['channel'] ?? $cu['channel_name'] ?? '') === $channelName) {
                        $userCount++;
                        
                        $role = $cu['role'] ?? $cu['user_role'] ?? 'vip';
                        switch ($role) {
                            case 'owner': $ownerCount++; break;
                            case 'admin': $adminCount++; break;
                            case 'mod': $modCount++; break;
                            case 'vip': $vipCount++; break;
                        }
                    }
                }
                
                $channelsWithStats[] = array_merge($channel, [
                    'user_count' => $userCount,
                    'owner_count' => $ownerCount,
                    'admin_count' => $adminCount,
                    'mod_count' => $modCount,
                    'vip_count' => $vipCount
                ]);
            }
            
            jsonResponse([
                'success' => true,
                'channels' => $channelsWithStats,
                'count' => count($channelsWithStats)
            ]);
            break;
            
        // ✅ Csatorna részletes adatai (channel + modes + users)
        case 'channels_detail':
            $channelName = $_GET['channel'] ?? $_POST['channel'] ?? '';
            
            if (empty($channelName)) {
                jsonResponse(['success' => false, 'error' => 'Channel name required'], 400);
            }
            
            // 1. Channels lekérése
            $channelsData = callBotAPI('GET', '/channels');
            
            if ($channelsData === null || !($channelsData['success'] ?? false)) {
                throw new Exception('Failed to fetch channels');
            }
            
            // Keresés név szerint
            $channel = null;
            foreach ($channelsData['channels'] ?? [] as $ch) {
                if (strcasecmp($ch['name'] ?? '', $channelName) === 0) {
                    $channel = $ch;
                    break;
                }
            }
            
            if (!$channel) {
                jsonResponse(['success' => false, 'error' => 'Channel not found'], 404);
            }
            
            // 2. Channel Modes lekérése
            $modesData = callBotAPI('GET', '/channel-modes?channel=' . urlencode($channelName));
            $modes = $modesData['modes'] ?? [];
            
            // 3. Channel Users lekérése
            $channelUsersData = callBotAPI('GET', '/channel-users');
            
            $users = [];
            if ($channelUsersData && ($channelUsersData['success'] ?? false)) {
                foreach ($channelUsersData['channel_users'] ?? [] as $cu) {
                    if (strcasecmp($cu['channel'] ?? $cu['channel_name'] ?? '', $channelName) === 0) {
                        $users[] = $cu;
                    }
                }
            }
            
            // Szerepkör szerinti rendezés
            usort($users, function($a, $b) {
                $roleOrder = ['owner' => 1, 'admin' => 2, 'mod' => 3, 'vip' => 4];
                $aRole = $roleOrder[$a['role'] ?? $a['user_role'] ?? 'vip'] ?? 5;
                $bRole = $roleOrder[$b['role'] ?? $b['user_role'] ?? 'vip'] ?? 5;
                
                if ($aRole !== $bRole) {
                    return $aRole - $bRole;
                }
                
                return strcasecmp($a['nick'] ?? $a['user_nick'] ?? '', $b['nick'] ?? $b['user_nick'] ?? '');
            });
            
            jsonResponse([
                'success' => true,
                'channel' => $channel,
                'modes' => $modes,
                'users' => $users,
                'stats' => [
                    'total_users' => count($users),
                    'total_modes' => count($modes)
                ]
            ]);
            break;
            
        // ✅ Csatorna hozzáadása + Bot JOIN
        case 'channels_add':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                $input = $_POST;
            }
            
            $name = sanitize($input['name'] ?? '');
            $owner = sanitize($input['owner'] ?? '');
            $owner_hostmask = sanitize($input['owner_hostmask'] ?? '');
            
            if (empty($name) || empty($owner) || empty($owner_hostmask)) {
                jsonResponse(['success' => false, 'error' => 'Hiányzó kötelező mezők'], 400);
            }
            
            // Jogosultság ellenőrzés
            if (!in_array($currentRole, ['owner', 'admin'])) {
                jsonResponse(['success' => false, 'error' => 'Csak owner/admin hozhat létre csatornát'], 403);
            }
            
            // Bot API hívás
            $channelData = [
                'name' => $name,
                'owner' => $owner,
                'owner_hostmask' => $owner_hostmask,
                // Channels tábla beállítások (új userek számára)
                'auto_op' => 0,
                'auto_voice' => 0,
                'auto_halfop' => 0,
                // Owner jogosultságok (channel_users táblába)
                'owner_auto_op' => 1,
                'owner_auto_voice' => 0,
                'owner_auto_halfop' => 0
            ];
            
            $result = callBotAPI('POST', '/channels', $channelData);
            
            if ($result === null) {
                throw new Exception('Bot API is not responding');
            }
            
            if (!($result['success'] ?? false)) {
                throw new Exception($result['error'] ?? 'Failed to create channel');
            }
            
            // Audit log
            logActivity('➕', "Channel added via BOT API: $name (owner: $owner)");
            
            jsonResponse([
                'success' => true,
                'message' => '✅ Csatorna sikeresen létrehozva',
                'channel_name' => $name,
                'owner' => $owner,
                'channel_id' => $result['channel_id'] ?? null,
                'bot_action' => $result['bot_action'] ?? null
            ]);
            break;
            
        // ✅ Csatorna frissítése
	case 'channels_update':
		$input = json_decode(file_get_contents('php://input'), true);
		if (!$input) {
			$input = $_POST;
		}
		
		$id = intval($input['id'] ?? 0);
		$field = sanitize($input['field'] ?? '');
		$value = $input['value'] ?? '';
		
		if ($id === 0 || empty($field)) {
			jsonResponse(['success' => false, 'error' => 'Missing required fields'], 400);
		}
		
		$allowed_fields = ['name', 'owner', 'owner_hostmask', 'auto_op', 'auto_voice', 'auto_halfop'];
		
		if (!in_array($field, $allowed_fields)) {
			jsonResponse(['success' => false, 'error' => 'Invalid field'], 400);
		}
		
		// Jogosultság ellenőrzés
		if (!in_array($currentRole, ['owner', 'admin'])) {
			jsonResponse(['success' => false, 'error' => 'Csak owner/admin módosíthat csatornát'], 403);
		}
		
		// Bool mezők kezelése
		if (in_array($field, ['auto_op', 'auto_voice', 'auto_halfop'])) {
			$value = ($value === true || $value === 'true' || $value === '1' || $value === 1) ? 1 : 0;
		}
		
		// ✅ Bot API hívás - FIX: Töröld a "/" végéről
		$updateData = [
			'id' => $id,
			'field' => $field,
			'value' => $value
		];
		
		$result = callBotAPI('PUT', '/channels', $updateData);
		
		if ($result === null) {
			throw new Exception('Bot API is not responding');
		}
		
		if (!($result['success'] ?? false)) {
			throw new Exception($result['error'] ?? 'Failed to update channel');
		}
		
		// Audit log
		logActivity('🔄', "Channel #$id updated: $field");
		
		jsonResponse([
			'success' => true,
			'message' => 'Channel updated successfully'
		]);
		break;

            
        // ✅ Csatorna törlése + Bot PART
case 'channels_delete':
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }
    
    $id = intval($input['id'] ?? $_GET['id'] ?? 0);
    
    if ($id === 0) {
        jsonResponse(['success' => false, 'error' => 'Missing channel ID'], 400);
    }
    
    // Jogosultság ellenőrzés
    if (!in_array($currentRole, ['owner', 'admin'])) {
        jsonResponse(['success' => false, 'error' => 'Csak owner/admin törölhet csatornát'], 403);
    }
    
    // 1. Lekérjük a csatorna adatait
    $channelsData = callBotAPI('GET', '/channels');
    
    if ($channelsData === null || !($channelsData['success'] ?? false)) {
        throw new Exception('Failed to fetch channels');
    }
    
    $channel = null;
    foreach ($channelsData['channels'] ?? [] as $ch) {
        if (($ch['id'] ?? 0) == $id) {
            $channel = $ch;
            break;
        }
    }
    
    if (!$channel) {
        jsonResponse(['success' => false, 'error' => 'Channel not found'], 404);
    }
    
    $channelName = $channel['name'] ?? '';
    
    // 2. VÉDETT CSATORNA ELLENŐRZÉS
    if (defined('CONSOLE_CHANNEL') && strcasecmp($channelName, CONSOLE_CHANNEL) === 0) {
        error_log("Blocked attempt to delete console channel: $channelName");
        logActivity('🛡️', "BLOCKED: Attempted to delete console channel: $channelName");
        jsonResponse([
            'success' => false,
            'error' => "A '$channelName' csatorna védett (console channel), nem törölhető!"
        ], 403);
    }
    
    // ✅ 3. Bot API hívás - FIX: Töröld a "/" végéről
    $result = callBotAPI('DELETE', '/channels', [
        'id' => $id,
        'name' => $channelName
    ]);
    
    if ($result === null) {
        throw new Exception('Bot API is not responding');
    }
    
    if (!($result['success'] ?? false)) {
        $errorMsg = $result['error'] ?? 'Failed to delete channel';
        error_log("Bot API failed: $errorMsg");
        jsonResponse([
            'success' => false,
            'error' => $errorMsg,
            'bot_action' => $result['bot_action'] ?? null
        ], 500);
    }
    
    // Audit log
    logActivity('🗑️', "Channel deleted: $channelName (ID: $id) via bot");
    
    $botMessage = $result['bot_action']['message'] ?? 
                 $result['message'] ?? 
                 'Channel deleted successfully';
    
    jsonResponse([
        'success' => true,
        'message' => $botMessage,
        'bot_action' => $result['bot_action'] ?? null,
        'bot_success' => true
    ]);
    break;
            
        // ✅ Csatorna statisztikák
        case 'channels_stats':
            $channelsData = callBotAPI('GET', '/channels');
            
            if ($channelsData === null || !($channelsData['success'] ?? false)) {
                throw new Exception('Failed to fetch channels');
            }
            
            $channels = $channelsData['channels'] ?? [];
            
            $stats = [
                'total' => count($channels),
                'newest' => 'N/A',
                'with_bots' => 0
            ];
            
            // Legújabb csatorna
            if (!empty($channels)) {
                usort($channels, function($a, $b) {
                    return strtotime($b['created_at'] ?? '0') - strtotime($a['created_at'] ?? '0');
                });
                
                $stats['newest'] = $channels[0]['name'] ?? 'N/A';
            }
            
            // Csatornák bot beállításokkal
            foreach ($channels as $ch) {
                if (($ch['auto_op'] ?? 0) == 1 || ($ch['auto_voice'] ?? 0) == 1 || ($ch['auto_halfop'] ?? 0) == 1) {
                    $stats['with_bots']++;
                }
            }
            
            jsonResponse([
                'success' => true,
                'stats' => $stats
            ]);
            break;
            
        default:
            jsonResponse(['success' => false, 'error' => 'Unknown channels action'], 400);
    }
    
} catch (Exception $e) {
    error_log("Channels API error: " . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'API error: ' . $e->getMessage()], 500);
}
?>