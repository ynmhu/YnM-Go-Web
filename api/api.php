<?php
// api/api.php - API Router és központi endpoint
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
session_start();
require_once '../config.php';
require_once '../auth.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

error_log('API SESSION at start: ' . print_r($_SESSION, true));

// OPTIONS request kezelése (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Action paraméter
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// JSON input kezelése
$input = json_decode(file_get_contents('php://input'), true);
if ($input && is_array($input)) {
    $_POST = array_merge($_POST, $input);
    if (isset($input['action'])) {
        $action = $input['action'];
    }
}

// Router
switch ($action) {
    
    // ===== AUTH MŰVELETEK =====
    case 'login':
        $input = json_decode(file_get_contents('php://input'), true);
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';
        
        if (empty($username) || empty($password)) {
            jsonResponse(['success' => false, 'message' => 'Username and password required'], 400);
        }
        
        $result = login($username, $password);
        jsonResponse($result);
        break;
        
    case 'logout':
        $result = logout();
        jsonResponse($result);
        break;
        
    case 'check_session':
        jsonResponse([
            'success' => true,
            'logged_in' => isLoggedIn(),
            'username' => $_SESSION['username'] ?? null,
            'role' => $_SESSION['role'] ?? null,
            'email' => $_SESSION['email'] ?? null
        ]);
        break;
    
    // ===== DASHBOARD =====
    case 'dashboard':
        requireAuth();
        include 'ynm_api_dashboard.php';
        break;
    
    // ===== USERS =====
    case 'users_list':
    case 'users_get':
    case 'users_add':
    case 'users_update':
    case 'users_delete':
        requirePageAccess('users');
        include 'ynm_api_users.php';
        break;
    
    // ===== CHANNELS =====
    case 'channels_list':
    case 'channels_list_full':
    case 'channels_detail':
    case 'channels_add':
    case 'channels_update':
    case 'channels_delete':
    case 'channels_stats':
        requirePageAccess('channels');
        include 'ynm_api_channels.php';
        break;
    
    // ===== CHANNEL USERS =====
    case 'my_channels':
    case 'all_channels':
    case 'channel_users_list':
    case 'channel_users_add':
    case 'channel_users_update':
    case 'channel_users_delete':
    case 'channel_users_stats':
        requirePageAccess('channel_users');
        include 'ynm_api_users_channels.php';
        break;
    
    // ===== BOT CONTROL =====
    case 'bot_restart':
    case 'bot_status':
    case 'bot_reconnect':
    case 'bot_reload':
        requireAuth();
        if ($_SESSION['role'] !== 'owner') {
            jsonResponse(['success' => false, 'error' => 'Only owners can control the bot'], 403);
        }
        $_POST['command'] = str_replace('bot_', '', $action);
        include 'ynm_api_botcontrol.php';
        break;
    
    // ===== DATABASE (PASSWORDS) =====
    case 'database_list':
    case 'database_stats':
    case 'database_generate':
    case 'database_delete':
    case 'database_cleanup':
    case 'database_auto_cleanup':
    case 'database_check_expired':
    case 'database_increment_use':
    case 'database_delete_old_expired':
    case 'database_export':
    case 'database_info':
        requirePageAccess('database');
        include 'ynm_api_database.php';
        break;
    
		// ===== LOGS =====
		case 'logs_list':
		case 'logs_export':
		case 'logs_delete':
		case 'logs_stats':
		case 'logs_cleanup':  
		case 'logs_detail': 
		case 'logs_today':   
			requirePageAccess('logs');
			include 'ynm_api_logs.php';
			break;
    
		// ===== PROFILE =====
		case 'profile_get':
		case 'profile_update':
		case 'profile_upload_avatar':
		case 'profile_change_password':
		case 'profile_generate_password':
		case 'profile_activity':
		case 'profile_channels':
		case 'profile_stats':
			requireAuth();
			include 'ynm_api_profile.php';
			break;
    
    // ===== SYSTEM STATUS =====
    case 'status':
        jsonResponse([
            'success' => true,
            'status' => 'online',
            'timestamp' => date('Y-m-d H:i:s'),
            'version' => '3.1.0',
            'api_mode' => 'bot_api',
            'bot_api_url' => defined('BOT_API_URL') ? BOT_API_URL : 'not configured'
        ]);
        break;
    // ===== BOT STATS =====
	case 'bot_stats':
    include 'ynm_api_bot.php';
    break;
    // ===== HEALTH CHECK =====
    case 'health':
        requireAuth();
        
        // Bot API elérhetőség ellenőrzése
        $botApiStatus = 'unknown';
        $botApiUrl = defined('BOT_API_URL') ? BOT_API_URL : null;
        
        if ($botApiUrl) {
            try {
                $healthCheck = callBotAPI('GET', 'health');
                $botApiStatus = ($healthCheck && ($healthCheck['success'] ?? false)) ? 'online' : 'offline';
            } catch (Exception $e) {
                $botApiStatus = 'offline';
            }
        } else {
            $botApiStatus = 'not configured';
        }
        
        // DATABASE health: only check if DB_PATH is defined
        $dbHealth = 'unknown';
        if (defined('DB_PATH')) {
            $dbHealth = file_exists(DB_PATH) ? 'online' : 'offline';
        } else {
            $dbHealth = 'not configured';
        }
        
        jsonResponse([
            'success' => true,
            'timestamp' => date('Y-m-d H:i:s'),
            'services' => [
                'web_api' => 'online',
                'bot_api' => $botApiStatus,
                'database' => $dbHealth,
                'session' => session_status() === PHP_SESSION_ACTIVE ? 'online' : 'offline'
            ],
            'bot_api_url' => $botApiUrl
        ]);
        break;
    
    // ===== API INFO =====
    case 'info':
        jsonResponse([
            'success' => true,
            'api_version' => '3.2.0',
            'endpoints' => [
                'auth' => ['login', 'logout', 'check_session'],
                'users' => ['users_list', 'users_get', 'users_add', 'users_update', 'users_delete'],
                'channels' => ['channels_list', 'channels_list_full', 'channels_detail', 'channels_add', 'channels_update', 'channels_delete', 'channels_stats'],
                'channel_users' => ['my_channels', 'all_channels', 'channel_users_list', 'channel_users_add', 'channel_users_update', 'channel_users_delete', 'channel_users_stats'],
                'bot_control' => ['bot_restart', 'bot_status', 'bot_reconnect', 'bot_reload'],
                'database' => ['database_list', 'database_stats', 'database_generate', 'database_delete', 'database_cleanup', 'database_export'],
                'logs' => ['logs_list', 'logs_export'],
                'profile' => ['profile_get', 'profile_update', 'profile_change_password', 'profile_activity', 'profile_channels', 'profile_stats'],
                'system' => ['status', 'health', 'info']
            ],
            'authentication' => 'session-based',
            'bot_api_integration' => true
        ]);
        break;
    
    // ===== ISMERETLEN ACTION =====
    default:
        jsonResponse([
            'success' => false,
            'error' => 'Unknown action: ' . $action,
            'hint' => 'Use action=info to see available endpoints'
        ], 400);
}
?>