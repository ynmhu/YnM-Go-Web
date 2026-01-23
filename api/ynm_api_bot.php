<?php
// api/bot_stats_api.php

switch ($action) {
    case 'bot_stats':
        try {
            $result = callBotAPI('GET', '/bot-stats');
            
            if ($result && isset($result['success']) && $result['success']) {
                jsonResponse([
                    'success' => true,
                    'stats' => $result['stats'],
                    'server_uptime' => $result['stats']['server_uptime'] ?? '0d 0h 0m',
                    'network_traffic' => $result['stats']['network_traffic'] ?? '↑ 0.0 MB ↓ 0.0 MB'
                ]);
            } else {
                jsonResponse([
                    'success' => false,
                    'error' => $result['error'] ?? 'Failed to fetch bot stats'
                ], 500);
            }
        } catch (Exception $e) {
            jsonResponse([
                'success' => false,
                'error' => 'Bot API error: ' . $e->getMessage()
            ], 500);
        }
        break;
        
    default:
        jsonResponse([
            'success' => false,
            'error' => 'Unknown bot_stats action'
        ], 400);
}
?>