<?php
// api/database_api.php - Teljes API-alapú Database (Password) kezelés

// VÁLTOZÓK INICIALIZÁLÁSA
$currentUser = $_SESSION['username'] ?? 'unknown';
$currentUserId = $_SESSION['user_id'] ?? 0;
$currentRole = $_SESSION['role'] ?? 'vip';

// Helper függvények
function generateSecurePassword($length = 12) {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    $password = '';
    for ($i = 0; $i < $length; $i++) {
        $password .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $password;
}

try {
    switch ($action) {
        
        // ✅ Jelszavak listázása (users táblából szűrve)
		case 'database_list':
			// ✅ Használd a /database/passwords endpoint-ot, NEM a /users-t!
			$passwordsData = callBotAPI('GET', '/database/passwords');
			
			if ($passwordsData === null) {
				throw new Exception('Bot API is not responding');
			}
			
			if (!($passwordsData['success'] ?? false)) {
				throw new Exception($passwordsData['error'] ?? 'Failed to fetch passwords');
			}
			
			// ✅ A Go bot már jó formátumban adja vissza!
			jsonResponse([
				'success' => true,
				'passwords' => $passwordsData['passwords'] ?? [],
				'stats' => $passwordsData['stats'] ?? []
			]);
			break;
					
				// ✅ Statisztikák
		case 'database_stats':
			// ✅ Használd a /database/stats endpoint-ot
			$statsData = callBotAPI('GET', '/database/stats');
			
			if ($statsData === null) {
				throw new Exception('Bot API is not responding');
			}
			
			if (!($statsData['success'] ?? false)) {
				throw new Exception($statsData['error'] ?? 'Failed to fetch stats');
			}
			
			jsonResponse([
				'success' => true,
				'stats' => $statsData['stats'] ?? []
			]);
			break;
					
        // ✅ Jelszó generálás (user UPDATE)
		case 'database_generate':
			$input = json_decode(file_get_contents('php://input'), true);
			if (!$input) {
				$input = $_POST;
			}
			
			$username = sanitize($input['username'] ?? '');
			$expiresIn = (int)($input['expires_in'] ?? 30);
			$maxUses = isset($input['max_uses']) && $input['max_uses'] !== '' ? (int)$input['max_uses'] : 10;
			
			if (empty($username)) {
				jsonResponse(['success' => false, 'error' => 'Username required'], 400);
			}
			
			// Jogosultság ellenőrzés
			if (!in_array($currentRole, ['owner', 'admin'])) {
				jsonResponse(['success' => false, 'error' => 'Csak owner/admin generálhat jelszót'], 403);
			}
			
			// Jelszó generálás
			$password = generateSecurePassword(12);
			
			// Max uses
			$maxUsesForDB = ($maxUses == 0) ? 999999 : $maxUses;
			
			// ✅ Bot API hívás - /password/add endpoint
			// A Go bot struct szerint: Username, Password, ExpiryMinutes, MaxUses
			$passwordData = [
				'username' => $username,           // ← Username (csupa kicsi)
				'password' => $password,           // ← Password (csupa kicsi)
				'expiry_minutes' => $expiresIn,    // ← ExpiryMinutes (snake_case JSON)
				'max_uses' => $maxUsesForDB        // ← MaxUses (snake_case JSON)
			];
			
			$result = callBotAPI('POST', '/password/add', $passwordData);
			
			if ($result === null || !($result['success'] ?? false)) {
				throw new Exception($result['error'] ?? 'Failed to add password');
			}
			
			// Expiry text
			$expiresText = $expiresIn == 0 ? 'Never expires' : "{$expiresIn} minutes";
			
			// Audit log
			logActivity('🔑', "Generated password for: $username (expires $expiresText)");
			
			jsonResponse([
				'success' => true,
				'username' => $username,
				'password' => $password,
				'expires_in' => $expiresIn,
				'expiry_text' => $expiresText,
				'max_uses' => $maxUses,
				'max_uses_display' => $maxUses == 0 ? "unlimited" : (string)$maxUses,
				'generated_by' => $currentUser,
				'created_at' => date('Y-m-d H:i:s')
			]);
			break;
            
        // ✅ Jelszó törlése (user password mezők nullázása)
		case 'database_delete':
			$input = json_decode(file_get_contents('php://input'), true);
			if (!$input) {
				$input = $_POST;
			}
			
			$username = sanitize($input['username'] ?? '');
			
			if (empty($username)) {
				jsonResponse(['success' => false, 'error' => 'Username required'], 400);
			}
			
			// ✅ VÉDELEM - de NE 403, hanem sima success: false
			if (strtolower($username) === 'owner') {
				jsonResponse(['success' => false, 'error' => 'Owner password is protected', 'protected' => true], 200);
			}
			
			if ($username !== $currentUser && $currentRole !== 'owner') {
				jsonResponse([
					'success' => false,
					'error' => 'Nincs jogosultság más jelszavának törlésére'
				], 403);
			}
			
			// Jogosultság

			
			// Bot API hívás
			$result = callBotAPI('POST', '/password/delete', ['username' => $username]);
			
			if ($result === null || !($result['success'] ?? false)) {
				throw new Exception($result['error'] ?? 'Failed to delete password');
			}
			
			logActivity('🗑️', "Deleted password for: $username");
			
			jsonResponse([
				'success' => true,
				'message' => 'Password deleted successfully'
			]);
			break;
            
        // ✅ Export CSV
        case 'database_export':
            if (!in_array($currentRole, ['owner', 'admin'])) {
                jsonResponse(['success' => false, 'error' => 'Csak owner/admin exportálhat'], 403);
            }
            
            $filterType = $_GET['filter'] ?? 'all';
            
            $usersData = callBotAPI('GET', '/users');
            
            if ($usersData === null || !($usersData['success'] ?? false)) {
                throw new Exception('Failed to fetch users for export');
            }
            
            $allUsers = $usersData['users'] ?? [];
            $passwords = array_filter($allUsers, function($user) {
                return !empty($user['pass']);
            });
            
            // Szűrés
            $now = time();
            if ($filterType === 'active') {
                $passwords = array_filter($passwords, function($user) use ($now) {
                    return empty($user['password_expires']) || strtotime($user['password_expires']) >= $now;
                });
            } elseif ($filterType === 'expired') {
                $passwords = array_filter($passwords, function($user) use ($now) {
                    return !empty($user['password_expires']) && strtotime($user['password_expires']) < $now;
                });
            }
            
            // CSV
            $csv = "Username,Password,Expires At,Created At,Uses,Max Uses,Status\n";
            
            foreach ($passwords as $user) {
                $expiresAt = $user['password_expires'] ?? 'Never';
                $createdAt = $user['password_created'] ?? $user['created_at'] ?? '';
                $uses = $user['password_uses'] ?? 0;
                $maxUses = $user['password_max_uses'] ?? 10;
                
                $status = 'Active';
                if (!empty($user['password_expires']) && strtotime($user['password_expires']) < $now) {
                    $status = 'Expired';
                }
                
                $csv .= sprintf(
                    "\"%s\",\"%s\",\"%s\",\"%s\",%d,%d,\"%s\"\n",
                    addslashes($user['nick'] ?? ''),
                    addslashes($user['pass'] ?? ''),
                    $expiresAt,
                    $createdAt,
                    $uses,
                    $maxUses,
                    $status
                );
            }
            
            logActivity('📤', "Exported passwords ($filterType) to CSV");
            
            jsonResponse([
                'success' => true,
                'data' => $csv,
                'filename' => 'passwords_export_' . $filterType . '_' . date('Y-m-d_His') . '.csv',
                'filter' => $filterType,
                'row_count' => count($passwords)
            ]);
            break;
            
        default:
            jsonResponse(['success' => false, 'error' => 'Unknown database action'], 400);
    }
    
} catch (Exception $e) {
    error_log("Database API error: " . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'API error: ' . $e->getMessage()], 500);
}
?>