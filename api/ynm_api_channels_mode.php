<?php
// api/ynm_api_channels_mode.php - Channel Modes API kezelés (Go backend adapter)

$currentUser = $_SESSION['username'] ?? 'unknown';
$currentRole = $_SESSION['role'] ?? 'user';

function canModifyChannelMode($currentRole) {
    $roleHierarchy = ['owner' => 5, 'admin' => 4, 'mod' => 3, 'vip' => 2, 'user' => 1];
    $currentLevel = $roleHierarchy[$currentRole] ?? 0;
    
    // MOD+ módosíthat channel mode-ot
    return $currentLevel >= 3;
}

try {
    switch ($action) {
        
        // ✅ Channel Modes listázása
        case 'channels_mode':
            // Go backend API hívása
            $headers = [
                'X-Username: ' . $currentUser,
                'X-Role: ' . $currentRole
            ];
            
            $botApiUrl = defined('BOT_API_URL') ? BOT_API_URL : '';
            $response = callBotAPI('GET', '/channels/mode', null, $headers);
            
            if ($response === null) {
                throw new Exception('Bot API is not responding');
            }
            
            if (!($response['success'] ?? false)) {
                throw new Exception($response['error'] ?? 'Failed to fetch channel modes');
            }
            
            jsonResponse([
                'success' => true,
                'modes' => $response['modes'] ?? [],
                'can_edit' => canModifyChannelMode($currentRole),
                'total' => count($response['modes'] ?? []),
                'user_role' => $currentRole
            ]);
            break;
            
        // ✅ Channel Mode frissítése
        case 'channels_mode_update':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                $input = $_POST;
            }
            
            $id = intval($input['id'] ?? $_POST['id'] ?? $_GET['id'] ?? 0);
            $channel_name = trim($input['channel_name'] ?? $_POST['channel_name'] ?? $_GET['channel_name'] ?? '');
            $mode = trim($input['mode'] ?? $_POST['mode'] ?? $_GET['mode'] ?? '');
            $param = trim($input['param'] ?? $_POST['param'] ?? $_GET['param'] ?? '');
            
            error_log("channels_mode_update - ID: $id, Channel: '$channel_name', Mode: '$mode', Param: '$param', User: $currentUser");
            
            if ($id === 0 && empty($channel_name)) {
                jsonResponse(['success' => false, 'error' => 'Channel ID or name is required'], 400);
            }
            
            if (empty($mode)) {
                jsonResponse(['success' => false, 'error' => 'Mode is required'], 400);
            }
            
            // 1. Jogosultság ellenőrzése
            if (!canModifyChannelMode($currentRole)) {
                jsonResponse([
                    'success' => false,
                    'error' => 'Only Mod/Admin/Owner can modify channel modes'
                ], 403);
            }
            
            // 2. Go backend API hívása
            $headers = [
                'X-Username: ' . $currentUser,
                'X-Role: ' . $currentRole,
                'Content-Type: application/json'
            ];
            
            $requestData = [
                'id' => $id,
                'channel_name' => $channel_name,
                'mode' => $mode,
                'param' => $param
            ];
            
            $botApiUrl = defined('BOT_API_URL') ? BOT_API_URL : '';
            $response = callBotAPI('PUT', '/channels/mode', $requestData, $headers);
            
            if ($response === null) {
                throw new Exception('Bot API is not responding');
            }
            
            if (!($response['success'] ?? false)) {
                throw new Exception($response['error'] ?? $response['message'] ?? 'Failed to update mode');
            }
            
            // 3. Audit log
            $action_text = "Mode set to $mode" . (!empty($param) ? " ($param)" : "");
            $channel = $response['channel'] ?? $channel_name;
            logActivity('🔧', "$action_text for $channel by $currentUser");
            
            jsonResponse([
                'success' => true,
                'message' => $response['message'] ?? 'Mode updated successfully',
                'modes' => $response['modes'] ?? [],
                'bot_action' => $response['bot_action'] ?? null
            ]);
            break;
            
        // ✅ Channel Mode reset
        case 'channels_mode_reset':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                $input = $_POST;
            }
            
            $id = intval($input['id'] ?? $_POST['id'] ?? $_GET['id'] ?? 0);
            
            if ($id === 0) {
                jsonResponse(['success' => false, 'error' => 'Mode ID is required'], 400);
            }
            
            if (!canModifyChannelMode($currentRole)) {
                jsonResponse([
                    'success' => false,
                    'error' => 'Only Mod/Admin/Owner can reset channel modes'
                ], 403);
            }
            
            // Go backend API hívása (DELETE method)
            $headers = [
                'X-Username: ' . $currentUser,
                'X-Role: ' . $currentRole,
                'Content-Type: application/json'
            ];
            
            $botApiUrl = defined('BOT_API_URL') ? BOT_API_URL : '';
            $response = callBotAPI('DELETE', '/channels/mode', ['id' => $id], $headers);
            
            if ($response === null) {
                throw new Exception('Bot API is not responding');
            }
            
            if (!($response['success'] ?? false)) {
                throw new Exception($response['error'] ?? $response['message'] ?? 'Failed to reset mode');
            }
            
            logActivity('🔄', "Mode reset for channel by $currentUser");
            
            jsonResponse([
                'success' => true,
                'message' => $response['message'] ?? 'Mode reset successfully',
                'bot_action' => $response['bot_action'] ?? null
            ]);
            break;
            
        // ✅ Channel Modes statisztikák
        case 'channels_mode_stats':
            // Először lekérjük a mode-okat
            $headers = [
                'X-Username: ' . $currentUser,
                'X-Role: ' . $currentRole
            ];
            
            $botApiUrl = defined('BOT_API_URL') ? BOT_API_URL : '';
            $response = callBotAPI('GET', '/channels/mode', null, $headers);
            
            if ($response === null || !($response['success'] ?? false)) {
                throw new Exception('Failed to fetch channel modes');
            }
            
            $modes = $response['modes'] ?? [];
            
            // Statisztikák számítása
            $stats = [
                'total_channels' => count($modes),
                'mode_distribution' => [],
                'most_common_mode' => '',
                'recent_updates' => []
            ];
            
            foreach ($modes as $mode) {
                $currentModes = $mode['modes'] ?? '';
                
                if (!empty($currentModes)) {
                    // Több mode lehet egy stringben, szétválasztjuk
                    $modeList = explode(' ', $currentModes);
                    foreach ($modeList as $singleMode) {
                        if (!empty($singleMode)) {
                            $stats['mode_distribution'][$singleMode] = 
                                ($stats['mode_distribution'][$singleMode] ?? 0) + 1;
                        }
                    }
                }
                
                if (!empty($mode['updated_at'])) {
                    $stats['recent_updates'][] = [
                        'channel' => $mode['channel'] ?? '',
                        'modes' => $currentModes,
                        'set_by' => $mode['set_by'] ?? '',
                        'set_at' => $mode['updated_at'] ?? ''
                    ];
                }
            }
            
            // Leggyakoribb mode
            if (!empty($stats['mode_distribution'])) {
                arsort($stats['mode_distribution']);
                $stats['most_common_mode'] = key($stats['mode_distribution']);
            }
            
            // Legutóbbi 5 frissítés
            usort($stats['recent_updates'], function($a, $b) {
                return strtotime($b['set_at']) - strtotime($a['set_at']);
            });
            $stats['recent_updates'] = array_slice($stats['recent_updates'], 0, 5);
            
            jsonResponse([
                'success' => true,
                'stats' => $stats,
                'user_role' => $currentRole
            ]);
            break;
            
        default:
            jsonResponse(['success' => false, 'error' => 'Unknown channels_mode action'], 400);
    }
    
} catch (Exception $e) {
    error_log("Channel Modes API error: " . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'API error: ' . $e->getMessage()], 500);
}
?>