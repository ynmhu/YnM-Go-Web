<?php 
// config.php - JAVÍTOTT VERZIÓ

error_reporting(E_ALL);
ini_set('display_errors', 1);

date_default_timezone_set('Europe/Budapest');
define('BOT_API_SERVICE_TOKEN', 'NemtudomMiLegyen2025benMikorMarMindentLehet');
define('API_BASE_URL', 'https://ynm-go.ynm.hu/');
define('BOT_API_URL', 'http://192.168.0.150:4466/api');
define('CONSOLE_CHANNEL', '#YnM');

// Session konfiguráció
define('SESSION_LIFETIME', 3600);
define('SESSION_NAME', 'YNM_ADMIN_SESSION');

// Szerepkörök és jogosultságok
define('ROLES', [
    'owner' => [
        'dashboard' => true,
        'users' => true,
        'channels' => true,
        'channel_users' => true, 
        'database' => true,
        'logs' =>true,
        'plugins' => true,
        'ynmprofile' => true
    ],
    'admin' => [
        'dashboard' => true,
        'users' => true,
        'channels' => true,
        'channel_users' => true, 
        'database' => true,
        'logs' => true,
        'plugins' => true,
        'ynmprofile' => true
    ],
    'mod' => [
        'dashboard' => true,
        'users' => true,
        'channels' =>true,
        'channel_users' => true, 
        'database' => true,
        'logs' => true,
        'plugins' => true,
        'ynmprofile' => true
    ],
    'vip' => [
        'dashboard' => true,
        'users' => true,
        'channels' => true,
        'channel_users' => true, 
        'database' => true,
        'logs' => true,
        'plugins' => true,
        'ynmprofile' => true
    
     ],
    'user' => [
        'dashboard' => true,
        'users' => true,
        'channels' => true,
        'channel_users' => true, 
        'database' => true,
        'logs' => true,
        'plugins' => true,
        'ynmprofile' => true
    ]
]);

// Engedélyezett mezők frissítéshez
define('ALLOWED_USER_FIELDS', ['nick', 'email', 'hostmask', 'role', 'added_by', 'lang', 'mychar', 'welcome', 'pass', 'invites', 'discord_id', 'telegram_id', 'facebook']);

// Helper függvények
function sanitize($data) {
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function getClientIP() {
    if (isset($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        return $_SERVER['HTTP_CF_CONNECTING_IP'];
    }
    
    $headers = [
        'HTTP_X_FORWARDED_FOR',
        'HTTP_X_REAL_IP',
        'HTTP_CLIENT_IP',
        'REMOTE_ADDR'
    ];
    
    foreach ($headers as $header) {
        if (isset($_SERVER[$header])) {
            $ips = explode(',', $_SERVER[$header]);
            return trim($ips[0]);
        }
    }
    
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

// ✅ Bot API helper függvény - JAVÍTOTT VERZIÓ
function callBotAPI($method, $endpoint, $data = null) {
	
	
    // Endpoint már tartalmazza az /api/ prefix-et (pl. /api/users) or starts with '/'
    $base = rtrim(BOT_API_URL, '/');
    $path = ltrim($endpoint, '/');
    $url = $base . '/' . $path;
    
    error_log("🔵 Bot API Call: $method $url");
    if ($data) {
        error_log("📦 Request Data: " . json_encode($data));
    }
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_FORBID_REUSE, false);
    curl_setopt($ch, CURLOPT_FRESH_CONNECT, false);

    // Choose SSL verification depending on scheme
    $isSecure = stripos($url, 'https://') === 0;
    if ($isSecure) {
        // In production you should keep VERIFYPEER = true and configure proper CA bundle.
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
    } else {
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    }
    
    $headers = [
        'Content-Type: application/json',
        'X-Username: ' . ($_SESSION['username'] ?? 'system'),
        'User-Agent: YnM-Web-Admin/3.0'
    ];
    

		// ✅ Token: session token vagy service token fallback
		$token = $_SESSION['api_token'] ?? BOT_API_SERVICE_TOKEN ?? null;

		if (!empty($token)) {
			$headers[] = 'Authorization: Bearer ' . $token;
			error_log("🔑 Using token (first 20): " . substr($token, 0, 20) . "...");
		} else {
			error_log("❌ No token available (no session api_token AND no BOT_API_SERVICE_TOKEN)");
		}
    // If there's payload, send as JSON body (works for POST/PUT/DELETE)
    if ($data !== null) {
        $jsonData = json_encode($data);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);
        $headers[] = 'Content-Length: ' . strlen($jsonData);
    }
    error_log("➡️ Outgoing headers: " . json_encode($headers));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    $curlErrno = curl_errno($ch);
    
    error_log("📊 HTTP Code: $httpCode");
    
    if ($curlErrno !== 0) {
        error_log("❌ CURL Error [$curlErrno]: $curlError");
        error_log("🔍 Bot API URL was: $url");
        curl_close($ch);
        return null;
    }
    
    if ($response === false) {
        error_log("❌ CURL failed, no response");
        curl_close($ch);
        return null;
    }
    
    error_log("✅ Response received: " . strlen($response) . " bytes");
    if (strlen($response) > 200) {
        error_log("📄 Response preview: " . substr($response, 0, 200));
    } else {
        error_log("📄 Response: $response");
    }
    
    curl_close($ch);
    
    $decoded = json_decode($response, true);
    
    if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
        error_log("❌ JSON decode error: " . json_last_error_msg());
        error_log("📄 Raw response: $response");
        return null;
    }
    
    error_log("✅ Bot API response decoded successfully");
    
    return $decoded;
}

// ✅ Audit log - Bot API-n keresztül
function logActivity($action, $details = '') {
    try {
        callBotAPI('POST', '/audit-logs', [
            'username' => $_SESSION['username'] ?? 'system',
            'action' => $action,
            'ip_address' => getClientIP(),
            'details' => $details
        ]);
    } catch (Exception $e) {
        error_log("Failed to log activity: " . $e->getMessage());
    }
}