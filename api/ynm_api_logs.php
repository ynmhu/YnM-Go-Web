<?php
// api/logs_api.php - Teljes API-alapú Audit Logs kezelés

// VÁLTOZÓK INICIALIZÁLÁSA
$currentUser = $_SESSION['username'] ?? 'unknown';
$currentUserId = $_SESSION['user_id'] ?? 0;
$currentRole = $_SESSION['role'] ?? 'vip';


// Helper függvény - szerepkör alapú szűrés
function filterLogsByRole($logs, $currentRole, $currentUser) {
    if ($currentRole === 'owner') {
        return $logs; // Owner mindent lát
    }
    
    $filtered = [];
    
    foreach ($logs as $log) {
        $logUsername = $log['username'] ?? '';
        $logUserRole = $log['user_role'] ?? 'vip';
        
        $canView = false;
        
        if ($currentRole === 'admin') {
            // Admin lát: vip, mod, admin és saját tevékenységeket
            $canView = in_array($logUserRole, ['vip', 'mod', 'admin']) || $logUsername === $currentUser;
        } elseif ($currentRole === 'mod') {
            // Mod csak VIP-eket és saját tevékenységét látja
            $canView = ($logUserRole === 'vip') || $logUsername === $currentUser;
        } else {
            // VIP csak a saját tevékenységét látja
            $canView = ($logUsername === $currentUser);
        }
        
        if ($canView) {
            $filtered[] = $log;
        }
    }
    
    return $filtered;
}


try {
    switch ($action) {
        
		
	case 'logs_delete':
		// CSAK OWNER szerepkör törölhet!
		if ($currentRole !== 'owner') {
			jsonResponse(['success' => false, 'error' => 'Permission denied. Only owners can delete logs.'], 403);
			break;
		}
		
		$rawInput = file_get_contents('php://input');
		$input = json_decode($rawInput, true);
		
		if (json_last_error() !== JSON_ERROR_NONE) {
			jsonResponse(['success' => false, 'error' => 'Invalid JSON'], 400);
			break;
		}
		
		$ids = $input['ids'] ?? [];
		
		if (empty($ids) || !is_array($ids)) {
			jsonResponse(['success' => false, 'error' => 'No IDs provided'], 400);
			break;
		}
		
		$ids = array_filter($ids, 'is_numeric');
		$ids = array_map('intval', $ids);
		
		if (empty($ids)) {
			jsonResponse(['success' => false, 'error' => 'Invalid IDs'], 400);
			break;
		}
		
		try {
			// 🚨 JAVÍTOTT RESZ 🚨
			// Egyetlen DELETE kérés az összes ID-vel
			
			$botResponse = callBotAPI('DELETE', '/audit-logs', [
				'ids' => $ids  // Ez küldődik JSON body-ként
			]);
			
			if ($botResponse === null) {
				throw new Exception('Bot API is not responding');
			}
			
			if (!($botResponse['success'] ?? false)) {
				$error = $botResponse['error'] ?? 'Unknown error from Go API';
				throw new Exception($error);
			}
			
			$deletedCount = $botResponse['deleted_count'] ?? 0;
			
			// Audit log bejegyzés
			logActivity('🗑️', "Deleted {$deletedCount} audit logs via Go API");
			
			jsonResponse([
				'success' => true,
				'deleted_count' => $deletedCount,
				'requested' => count($ids),
				'message' => "Deleted {$deletedCount} log(s) successfully"
			]);
			
		} catch (Exception $e) {
			error_log("❌ Delete logs via API error: " . $e->getMessage());
			jsonResponse(['success' => false, 'error' => 'Delete via API failed: ' . $e->getMessage()], 500);
		}
		break;
        // ✅ Logok listázása - SZEREPKÖR ALAPJÁN SZŰRVE
        case 'logs_list':
            $limit = intval($_GET['limit'] ?? $_POST['limit'] ?? 100);
            $action_filter = $_GET['action_filter'] ?? $_POST['action_filter'] ?? '';
            $user_filter = $_GET['user_filter'] ?? $_POST['user_filter'] ?? '';
            
            // Bot API hívás - minden log lekérése
            $queryParams = "?limit={$limit}";
            
            if (!empty($action_filter)) {
                $queryParams .= "&action=" . urlencode($action_filter);
            }
            
            if (!empty($user_filter)) {
                $queryParams .= "&username=" . urlencode($user_filter);
            }
            
            $logsData = callBotAPI('GET', "/audit-logs{$queryParams}");
            
            if ($logsData === null) {
                throw new Exception('Bot API is not responding');
            }
            
            if (!($logsData['success'] ?? false)) {
                throw new Exception($logsData['error'] ?? 'Failed to fetch logs');
            }
            
            $allLogs = $logsData['logs'] ?? [];
            
            // Szerepkör alapú szűrés
            $filteredLogs = filterLogsByRole($allLogs, $currentRole, $currentUser);
            
            jsonResponse([
                'success' => true,
                'logs' => $filteredLogs,
                'total' => count($filteredLogs),
                'user_role' => $currentRole
            ]);
            break;
            
        // ✅ Logok statisztikái - SZŰRT ADATOKBÓL
        case 'logs_stats':
            // Bot API hívás - minden log lekérése
            $logsData = callBotAPI('GET', '/audit-logs?limit=10000');
            
            if ($logsData === null || !($logsData['success'] ?? false)) {
                throw new Exception('Failed to fetch logs for stats');
            }
            
            $allLogs = $logsData['logs'] ?? [];
            
            // Szerepkör alapú szűrés
            $filteredLogs = filterLogsByRole($allLogs, $currentRole, $currentUser);
            
            // Statisztikák számítása
            $stats = [
                'total' => count($filteredLogs),
                'successful_logins' => 0,
                'failed_logins' => 0,
                'today' => 0,
                'most_active_user' => 'N/A',
                'action_breakdown' => []
            ];
            
            $userCounts = [];
            $actionCounts = [];
            $today = date('Y-m-d');
            
            foreach ($filteredLogs as $log) {
                $action = $log['action'] ?? '';
                $username = $log['username'] ?? 'unknown';
                $timestamp = $log['timestamp'] ?? '';
                
                // Sikeres/sikertelen bejelentkezések
                if ($action === '✅') {
                    $stats['successful_logins']++;
                } elseif ($action === '❌') {
                    $stats['failed_logins']++;
                }
                
                // Mai nap
                if (strpos($timestamp, $today) === 0) {
                    $stats['today']++;
                }
                
                // User számok
                if (!isset($userCounts[$username])) {
                    $userCounts[$username] = 0;
                }
                $userCounts[$username]++;
                
                // Action típusok
                if (!isset($actionCounts[$action])) {
                    $actionCounts[$action] = 0;
                }
                $actionCounts[$action]++;
            }
            
            // Legaktívabb felhasználó
            if (!empty($userCounts)) {
                arsort($userCounts);
                $mostActiveUser = array_key_first($userCounts);
                $stats['most_active_user'] = $mostActiveUser . ' (' . $userCounts[$mostActiveUser] . ')';
            }
            
            // Action megoszlás
            $stats['action_breakdown'] = $actionCounts;
            
            jsonResponse([
                'success' => true,
                'stats' => $stats
            ]);
            break;
            
        // ✅ Logok exportálása - SZŰRT ADATOKBÓL
        case 'logs_export':
            $limit = intval($_GET['limit'] ?? $_POST['limit'] ?? 1000);
            
            // Bot API hívás
            $logsData = callBotAPI('GET', "/audit-logs?limit={$limit}");
            
            if ($logsData === null || !($logsData['success'] ?? false)) {
                throw new Exception('Failed to fetch logs for export');
            }
            
            $allLogs = $logsData['logs'] ?? [];
            
            // Szerepkör alapú szűrés
            $filteredLogs = filterLogsByRole($allLogs, $currentRole, $currentUser);
            
            // CSV készítés
            $csv = "ID,Username,Action,IP Address,Details,Timestamp\n";
            
            foreach ($filteredLogs as $log) {
                $csv .= sprintf(
                    "%d,\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                    $log['id'] ?? 0,
                    addslashes($log['username'] ?? ''),
                    addslashes($log['action'] ?? ''),
                    addslashes($log['ip_address'] ?? ''),
                    str_replace(["\n", "\r", "\""], [" ", " ", "'"], $log['details'] ?? ''),
                    $log['timestamp'] ?? ''
                );
            }
            
            // Audit log
            logActivity('📤', "Exported " . count($filteredLogs) . " audit logs");
            
            jsonResponse([
                'success' => true,
                'data' => $csv,
                'filename' => 'audit_logs_' . date('Y-m-d_His') . '.csv',
                'count' => count($filteredLogs)
            ]);
            break;

case 'logs_cleanup':
    // Check permission
    if (!in_array($_SESSION['role'] ?? 'vip', ['owner'])) {
        jsonResponse(['success' => false, 'error' => 'Only owners can cleanup logs'], 403);
        break;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $days = intval($input['days'] ?? 90);
    $deleteAll = $input['delete_all'] ?? ($days === 0);
    
    try {
        // 1. Get all logs from Go API
        $logsData = callBotAPI('GET', '/audit-logs?limit=10000');
        
        if ($logsData === null || !($logsData['success'] ?? false)) {
            throw new Exception('Failed to fetch logs from Go API');
        }
        
        $allLogs = $logsData['logs'] ?? [];
        
        // 2. If "Everything" mode, get all IDs
        if ($deleteAll) {
            $logIds = [];
            foreach ($allLogs as $log) {
                if (isset($log['id'])) {
                    $logIds[] = $log['id'];
                }
            }
            
            logActivity('⚠️', "Starting deletion of ALL logs (" . count($logIds) . " total)");
            
        } else {
            // 3. Otherwise filter by date
            $cutoffTimestamp = strtotime("-$days days");
            $logIds = [];
            
            foreach ($allLogs as $log) {
                $timestamp = $log['timestamp'] ?? '';
                $id = $log['id'] ?? 0;
                
                // Parse the Go timestamp
                $logTimestamp = false;
                if (preg_match('/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/', $timestamp, $matches)) {
                    $logTimestamp = strtotime($matches[1]);
                }
                
                if ($logTimestamp !== false && $logTimestamp < $cutoffTimestamp) {
                    $logIds[] = $id;
                }
            }
            
            logActivity('🔍', "Found " . count($logIds) . " logs older than $days days");
        }
        
        $totalDeleted = 0;
        
        // 4. Delete logs in batches
        if (!empty($logIds)) {
            $chunks = array_chunk($logIds, 100); // Max 100 IDs per request
            
            foreach ($chunks as $chunk) {
                // ✅ JAVÍTOTT RÉSZ - DELETE body helyesen átadva
                $result = callBotAPI('DELETE', '/audit-logs', ['ids' => $chunk]);
                
                if ($result && ($result['success'] ?? false)) {
                    $deleted = $result['deleted_count'] ?? 0;
                    $totalDeleted += $deleted;
                    
                    if ($deleteAll) {
                        logActivity('🗑️', "Deleted batch of $deleted logs (Everything cleanup)");
                    } else {
                        logActivity('🗑️', "Deleted batch of $deleted logs (older than $days days)");
                    }
                }
            }
        }
        
        // 5. Final audit log
        if ($deleteAll) {
            logActivity('🧹', "COMPLETED: Deleted ALL logs ($totalDeleted total)");
            $message = "Deleted ALL logs ($totalDeleted total)";
        } else {
            logActivity('🧹', "COMPLETED: Cleaned up $totalDeleted logs older than $days days");
            $message = "Deleted $totalDeleted logs older than $days days";
        }
        
        jsonResponse([
            'success' => true,
            'message' => $message,
            'deleted_count' => $totalDeleted,
            'total_found' => count($logIds),
            'delete_all_mode' => $deleteAll
        ]);
        
    } catch (Exception $e) {
        error_log("Cleanup error: " . $e->getMessage());
        jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
    break; 
        // ✅ Specifikus log részletei - JOGOSULTSÁG ALAPJÁN
        case 'logs_detail':
            $id = intval($_GET['id'] ?? $_POST['id'] ?? 0);
            
            if ($id === 0) {
                jsonResponse(['success' => false, 'error' => 'Missing log ID'], 400);
            }
            
            // Bot API hívás - egy log lekérése
            $logData = callBotAPI('GET', "/audit-logs/{$id}");
            
            if ($logData === null || !($logData['success'] ?? false)) {
                jsonResponse(['success' => false, 'error' => 'Log not found'], 404);
            }
            
            $log = $logData['log'] ?? [];
            
            if (empty($log)) {
                jsonResponse(['success' => false, 'error' => 'Log not found'], 404);
            }
            
            // Jogosultság ellenőrzés
            $logUsername = $log['username'] ?? '';
            $logUserRole = $log['user_role'] ?? 'vip';
            
            $canView = false;
            
            if ($currentRole === 'owner') {
                $canView = true;
            } elseif ($currentRole === 'admin') {
                $canView = in_array($logUserRole, ['vip', 'mod', 'admin']) || $logUsername === $currentUser;
            } elseif ($currentRole === 'mod') {
                $canView = ($logUserRole === 'vip') || $logUsername === $currentUser;
            } else {
                $canView = ($logUsername === $currentUser);
            }
            
            if (!$canView) {
                jsonResponse(['success' => false, 'error' => 'Nincs jogosultságod megtekinteni ezt a logot'], 403);
            }
            
            jsonResponse([
                'success' => true,
                'log' => $log
            ]);
            break;
           
            
        // ✅ Mai logok - SZŰRT
        case 'logs_today':
            // Bot API hívás
            $logsData = callBotAPI('GET', '/audit-logs?limit=1000');
            
            if ($logsData === null || !($logsData['success'] ?? false)) {
                throw new Exception('Failed to fetch logs');
            }
            
            $allLogs = $logsData['logs'] ?? [];
            
            // Szerepkör alapú szűrés
            $filteredLogs = filterLogsByRole($allLogs, $currentRole, $currentUser);
            
            // Mai nap szűrés
            $today = date('Y-m-d');
            $todayLogs = array_filter($filteredLogs, function($log) use ($today) {
                $timestamp = $log['timestamp'] ?? '';
                return strpos($timestamp, $today) === 0;
            });
            
            jsonResponse([
                'success' => true,
                'logs' => array_values($todayLogs),
                'total' => count($todayLogs),
                'date' => $today
            ]);
            break;
            
        default:
            jsonResponse(['success' => false, 'error' => 'Unknown logs action'], 400);
    }
    
} catch (Exception $e) {
    error_log("Logs API error: " . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'API error: ' . $e->getMessage()], 500);
}
?>