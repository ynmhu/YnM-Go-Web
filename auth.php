<?php
if (session_status() === PHP_SESSION_NONE) {
    // Biztonságos session beállítások
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.cookie_samesite', 'Strict');

    // Only enable cookie_secure when connection is HTTPS or forwarded proto is https.
    $isHttps = (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off')
               || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https');

    ini_set('session.cookie_secure', $isHttps ? 1 : 0);

		if (defined('SESSION_LIFETIME')) {
			ini_set('session.gc_maxlifetime', SESSION_LIFETIME);
			
			// ✅ JAVÍTOTT: Domain név tisztítása (port nélkül)
			$domain = $_SERVER['HTTP_HOST'] ?? '';
			// Távolítsd el a portot, ha van
			$domain = preg_replace('/:\d+$/', '', $domain);
			
			session_set_cookie_params([
				'lifetime' => SESSION_LIFETIME,
				'path' => '/',
				'domain' => '', // ✅ VAGY hagyd üresen - automatikus lesz
				'secure' => $isHttps ? true : false,
				'httponly' => true,
				'samesite' => 'Strict'
			]);
		}

    if (defined('SESSION_NAME')) {
        session_name(SESSION_NAME);
    }

    session_start();

    // Session hijacking védelem
    if (!isset($_SESSION['ip_address'])) {
        $_SESSION['ip_address'] = $_SERVER['REMOTE_ADDR'] ?? '';
        $_SESSION['user_agent'] = $_SERVER['HTTP_USER_AGENT'] ?? '';
    }
}

// Bejelentkezés ellenőrzés
function isLoggedIn() {
    return isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
}

// Bejelentkezés - Bot API használattal
function login($username, $password) {
    try {
        $result = callBotAPI('POST', '/auth', [
            'username' => $username,
            'password' => $password
        ]);

        if ($result && isset($result['success']) && $result['success'] === true) {
            // ✅ Session adatok
            $_SESSION['logged_in'] = true;
            $_SESSION['username'] = $result['username'];
            $_SESSION['role'] = $result['role'];
            $_SESSION['user_id'] = $result['user_id'];
            $_SESSION['login_time'] = time();

            if (isset($result['token'])) {
                $_SESSION['api_token'] = $result['token'];
            }

            // ✅ FONTOS: Effective role kiszámítása LOGIN-nál!
            try {
                // Lekérjük a channel users adatokat
                $channelUsersData = callBotAPI('GET', '/channel-users');

                // Effective role számítás
                $effectiveRole = $result['role']; // kezdjük a globális role-lal
                $userChannels = [];
                $hasChannelAdmin = false;

                $roleHierarchy = ['owner' => 5, 'admin' => 4, 'mod' => 3, 'vip' => 2, 'user' => 1];

                if ($channelUsersData && isset($channelUsersData['channel_users'])) {
                    foreach ($channelUsersData['channel_users'] as $cu) {
                        if (($cu['nick'] ?? '') === $username) {
                            $channel = $cu['channel'] ?? '';
                            $channelRole = $cu['role'] ?? 'user';

                            $userChannels[] = [
                                'channel' => $channel,
                                'role' => $channelRole
                            ];

                            if (($roleHierarchy[$channelRole] ?? 0) > ($roleHierarchy[$effectiveRole] ?? 0)) {
                                $effectiveRole = $channelRole;
                            }

                            if ($channelRole === 'admin' || $channelRole === 'owner') {
                                $hasChannelAdmin = true;
                            }
                        }
                    }
                }

                // ✅ Mentsük session-be AZONNAL
                $_SESSION['effective_role'] = $effectiveRole;
                $_SESSION['channel_roles'] = $userChannels;
                $_SESSION['has_channel_admin'] = $hasChannelAdmin;

                error_log("Login - User: $username, Global: {$result['role']}, Effective: $effectiveRole");

            } catch (Exception $e) {
                error_log("Effective role calculation failed: " . $e->getMessage());
                $_SESSION['effective_role'] = $result['role']; // fallback
            }
			session_write_close();
            return [
                'success' => true,
                'message' => 'Login successful'
            ];
        }

        return [
            'success' => false,
            'message' => $result['message'] ?? 'Invalid username or password'
        ];

    } catch (Exception $e) {
        error_log("Login error: " . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Login error: ' . $e->getMessage()
        ];
    }
}

// Kijelentkezés
function logout() {
    if (isLoggedIn()) {
        // ✅ Audit log Bot API-n keresztül
        logActivity('🚪', "User logged out");
    }

    session_unset();
    session_destroy();

    return ['success' => true, 'message' => 'Logged out'];
}

// Jogosultság ellenőrzés oldal eléréséhez
function canAccessPage($page) {
        if (!isLoggedIn()) {
        return false;
    }
    $globalOnlyPages = ['bot_control', 'system_settings'];
    if (in_array($page, $globalOnlyPages)) {
        $globalRole = $_SESSION['role'] ?? 'user';
        return in_array($globalRole, ['owner', 'admin']);
    }

    // Minden más effective role alapján
    return canAccessPageEffective($page);
}

// Role ellenőrzés
function hasRole($requiredRole, $useEffective = true) {
    if (!isLoggedIn()) {
        return false;
    }

    // Döntsük el melyik role-t nézzük
    if ($useEffective) {
        $currentRole = getEffectiveRole();
    } else {
        $currentRole = strtolower($_SESSION['role'] ?? '');
    }

    $requiredRole = strtolower($requiredRole);

    // Role hierarchia
    $hierarchy = ['user' => 1,'vip' => 2, 'mod' => 3, 'admin' => 4, 'owner' => 5];

    $currentLevel = $hierarchy[$currentRole] ?? 0;
    $requiredLevel = $hierarchy[$requiredRole] ?? 0;

    return $currentLevel >= $requiredLevel;
}
function requireEffectiveAccess($page) {
    requireAuth();

    if (!canAccessPageEffective($page)) {
        jsonResponse([
            'success' => false,
            'error' => 'Access denied. Required effective role not met.'
        ], 403);
    }
}

// Új: Globális role alapú middleware
function requireGlobalAccess($page) {
    requireAuth();

    if (!canAccessPageGlobal($page)) {
        jsonResponse([
            'success' => false,
            'error' => 'Access denied. Global role required.'
        ], 403);
    }
}
// Auth middleware API-hoz
function requireAuth() {
    if (!isLoggedIn()) {
        jsonResponse(['success' => false, 'error' => 'Authentication required'], 401);
    }
}

// Oldal hozzáférés ellenőrzés middleware
function requirePageAccess($page) {
    requireAuth();

    if (!canAccessPage($page)) {
        jsonResponse(['success' => false, 'error' => 'Access denied'], 403);
    }
}
// Új: Effective role lekérése
function getEffectiveRole() {
    // Ha már kiszámoltuk, használjuk
    if (isset($_SESSION['effective_role'])) {
        return $_SESSION['effective_role'];
    }

    // Alapértelmezetten globális role
    $globalRole = $_SESSION['role'] ?? 'user';
    $effectiveRole = $globalRole;

    // Megpróbáljuk kiszámolni ha van channel users adat
    if (isset($_SESSION['channel_roles']) && is_array($_SESSION['channel_roles'])) {
        $roleHierarchy = ['owner' => 5, 'admin' => 4, 'mod' => 3, 'vip' => 2, 'user' => 1];

        foreach ($_SESSION['channel_roles'] as $cr) {
            $channelRole = $cr['role'] ?? 'user';
            if (($roleHierarchy[$channelRole] ?? 0) > ($roleHierarchy[$effectiveRole] ?? 0)) {
                $effectiveRole = $channelRole;
            }
        }

        $_SESSION['effective_role'] = $effectiveRole;
    }

    return $effectiveRole;
}

// Új: Effective role alapú ellenőrzés
function canAccessPageEffective($page) {
    if (!isLoggedIn()) {
        return false;
    }

    $effectiveRole = getEffectiveRole();

    // Permission matrix effective role alapján
    $effectivePermissions = [
        'owner' => [
            'users' => true, 'dashboard' =>  true, 'channels' => true, 'channel_users' => true, 'logs' => true, 'bot_control' => true, 'database' => true, 'settings' => true,  'profile' => true
        ],
        'admin' => [
            'users' => true, 'dashboard' =>  true, 'channels' => true, 'channel_users' => true, 'logs' => true, 'bot_control' => true, 'database' => true, 'settings' => true,  'profile' => true
        ],
        'mod' => [
            'users' => true, 'dashboard' =>  true, 'channels' => true, 'channel_users' => true, 'logs' => true, 'bot_control' => true, 'database' => true, 'settings' => true,  'profile' => true
        ],
        'vip' => [
            'users' => true, 'dashboard' =>  true, 'channels' => true, 'channel_users' => true, 'logs' => true, 'bot_control' => true, 'database' => true, 'settings' => true,  'profile' => true
        ],
        'user' => [
            'users' => true, 'dashboard' =>  true, 'channels' => true, 'channel_users' => true, 'logs' => true, 'bot_control' => true, 'database' => true, 'settings' => true,  'profile' => true
        ]
    ];
     return $effectivePermissions[$effectiveRole][$page] ?? false;
}

// Új: Globális role csak (bot control, system settings)
function canAccessPageGlobal($page) {
    if (!isLoggedIn()) {
        return false;
    }

    $globalRole = $_SESSION['role'] ?? 'user';

    // CSAK globális role-okhoz
    $globalOnlyPages = ['bot_control', 'system_settings'];

    if (in_array($page, $globalOnlyPages)) {
        $globalPermissions = [
            'owner' => ['bot_control' => true, 'system_settings' => true],
            'admin' => ['bot_control' => true, 'system_settings' => true],
            'mod' => ['bot_control' => true, 'system_settings' => true],
            'vip' => ['bot_control' => false, 'system_settings' => false],
            'user' => ['bot_control' => false, 'system_settings' => false]
        ];

        return $globalPermissions[$globalRole][$page] ?? true;
    }

    // Más oldalak effective role alapján
    return canAccessPageEffective($page);
}

// Session timeout ellenőrzés
function checkSessionTimeout() {
    if (isLoggedIn()) {
        $loginTime = $_SESSION['login_time'] ?? 0;
        $currentTime = time();

        // Ha lejárt a session
        if (($currentTime - $loginTime) > SESSION_LIFETIME) {
            error_log("Session timeout for user: " . ($_SESSION['username'] ?? 'unknown'));

            // Csak logout-oljunk, de ne dobjunk hibát az API-nak
            if (defined('API_CALL') && API_CALL === true) {
                return false;
            }

            // Web oldalon logout
            logout();
            header('Location: index.php');
            exit;
        }

        // Session refresh (ha a felénél járunk)
        $shouldRefresh = ($currentTime - $loginTime) > (SESSION_LIFETIME / 2);

        if ($shouldRefresh) {
            $_SESSION['login_time'] = $currentTime;
            error_log("Session refreshed for user: " . ($_SESSION['username'] ?? 'unknown'));
        }

        return true;
    }

    return false;
}

// Auto session timeout check - de ne logout-oljon minden kérésnél
if (isLoggedIn() && !defined('API_CALL')) {
    checkSessionTimeout();
}
?>