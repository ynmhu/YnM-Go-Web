<?php
// api/dashboard_api.php - API alapú dashboard adatok (EFFECTIVE ROLE ALAPJÁN)
// Improved: fetch actual counts, caching, better error handling.

try {
    $currentUser = $_SESSION['username'] ?? 'unknown';
    $globalRole = $_SESSION['role'] ?? 'user';

    // Cache: keep counts for a short while to reduce Bot API calls
    $cacheTtl = 15; // seconds
    $cached = $_SESSION['dashboard_cache'] ?? null;
    $now = time();

    // Basic structure we'll always return; we'll fill it below
    $stats = [
        'global_role' => $globalRole,
        'effective_role' => $_SESSION['effective_role'] ?? $globalRole,
        'user_channels' => $_SESSION['channel_roles'] ?? [],
        'has_channel_admin' => $_SESSION['has_channel_admin'] ?? false,
        'admin_channels' => $_SESSION['admin_channels'] ?? [],
        'total_users' => 0,
        'total_channels' => 0,
        'total_logs' => 0,
        'recent_activity' => []
    ];

    // Use cached counts when available and fresh
    if ($cached && isset($cached['ts']) && ($now - $cached['ts']) < $cacheTtl) {
        // restore
        $stats = array_replace($stats, $cached['stats'] ?? []);
        error_log("Dashboard API: Using cached stats (age: " . ($now - $cached['ts']) . "s)");
    } else {
        // Fetch users
        $usersCount = 0;
        $usersData = callBotAPI('GET', '/users');
        if ($usersData && is_array($usersData)) {
            // bot may return users in 'users' or 'recent_users'
            $rawUsers = $usersData['users'] ?? $usersData['recent_users'] ?? [];
            if (is_array($rawUsers)) {
                $usersCount = count($rawUsers);
            }
        } else {
            error_log("Dashboard API: callBotAPI /users returned null or non-array");
        }

        // Fetch channels
        $channelsCount = 0;
        $channelsData = callBotAPI('GET', '/channels');
        if ($channelsData && is_array($channelsData)) {
            $channels = $channelsData['channels'] ?? [];
            if (is_array($channels)) {
                $channelsCount = count($channels);
            }
        } else {
            error_log("Dashboard API: callBotAPI /channels returned null or non-array");
        }

        // Fetch recent logs (limit reasonably to avoid huge transfers)
        $logsCount = 0;
        $recentActivity = [];
        $logsData = callBotAPI('GET', '/audit-logs?limit=1000'); // limit to 1000 for stats
        if ($logsData && is_array($logsData)) {
            $allLogs = $logsData['logs'] ?? $logsData['audit_logs'] ?? [];
            if (is_array($allLogs)) {
                $logsCount = count($allLogs);
                // build recent activity (limit 10)
                usort($allLogs, function($a, $b) {
                    $at = $a['timestamp'] ?? ($a['created_at'] ?? '');
                    $bt = $b['timestamp'] ?? ($b['created_at'] ?? '');
                    return strcmp($bt, $at);
                });
                $recentActivity = array_slice($allLogs, 0, 10);
            }
        } else {
            error_log("Dashboard API: callBotAPI /audit-logs returned null or non-array");
        }

        // Fill stats
        $stats['total_users'] = $usersCount;
        $stats['total_channels'] = $channelsCount;
        $stats['total_logs'] = $logsCount;
        $stats['recent_activity'] = $recentActivity;

        // Save to cache
        $_SESSION['dashboard_cache'] = [
            'ts' => $now,
            'stats' => $stats
        ];
    }

    // Ensure session is updated with effective role info (already done elsewhere, but keep consistent)
    if (!isset($_SESSION['effective_role'])) {
        // attempt to compute from channel users if available
        $channelUsersData = callBotAPI('GET', '/channel-users');
        $effectiveRole = $globalRole;
        $roleHierarchy = ['owner' => 5, 'admin' => 4, 'mod' => 3, 'vip' => 2, 'user' => 1];

        if ($channelUsersData && isset($channelUsersData['channel_users'])) {
            foreach ($channelUsersData['channel_users'] as $cu) {
                if (($cu['nick'] ?? '') === $currentUser) {
                    $channelRole = $cu['role'] ?? 'vip';
                    if (($roleHierarchy[$channelRole] ?? 0) > ($roleHierarchy[$effectiveRole] ?? 0)) {
                        $effectiveRole = $channelRole;
                    }
                }
            }
        }
        $_SESSION['effective_role'] = $effectiveRole;
        $stats['effective_role'] = $effectiveRole;
    }

    // Debug logging
    error_log("Dashboard API - User: $currentUser, Global: {$stats['global_role']}, Effective: {$stats['effective_role']}, Totals: users={$stats['total_users']}, channels={$stats['total_channels']}, logs={$stats['total_logs']}");

    // Response
    jsonResponse([
        'success' => true,
        'stats' => $stats,
        'user_info' => [
            'username' => $currentUser,
            'global_role' => $stats['global_role'],
            'effective_role' => $stats['effective_role']
        ]
    ]);
} catch (Exception $e) {
    error_log("Dashboard API error: " . $e->getMessage());
    jsonResponse([
        'success' => false,
        'error' => 'Failed to load dashboard data: ' . $e->getMessage()
    ], 500);
}