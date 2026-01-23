<?php
// api/bot_control_api.php

// Csak owner szerepkör használhatja
if ($_SESSION['role'] !== 'owner') {
    error_log("Access denied - not owner");
    jsonResponse(['success' => false, 'error' => 'Only owners can control the bot'], 403);
}

// Ellenőrizd van-e API token
if (!isset($_SESSION['api_token'])) {
    error_log("No API token in session");
    jsonResponse(['success' => false, 'error' => 'No API token, please re-login'], 401);
}

$command = $_POST['command'] ?? '';

if (empty($command)) {
    jsonResponse(['success' => false, 'error' => 'Command required'], 400);
}

try {
    // Bot API hívás a config.php-ből
    $botApiUrl = BOT_API_URL . '/control';
    
    $ch = curl_init($botApiUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(['command' => $command]),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $_SESSION['api_token'] // ✅ TOKEN HASZNÁLATA!
        ],
        CURLOPT_TIMEOUT => 5,
        CURLOPT_CONNECTTIMEOUT => 3,
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    error_log("Bot API response: HTTP $httpCode - $response");
    
    if ($httpCode === 200) {
        $result = json_decode($response, true);
        logActivity('🔄 BOT CONTROL', "Command: {$command}");
        
        jsonResponse([
            'success' => true,
            'message' => $result['message'] ?? 'Command executed',
            'command' => $command,
            'data' => $result['data'] ?? null
        ]);
    } else {
        if ($error) {
            logActivity('❌ BOT CONTROL FAILED', "Command: {$command}, Error: {$error}");
            jsonResponse(['success' => false, 'error' => 'Bot connection failed: ' . $error], 503);
        }
        
        logActivity('❌ BOT CONTROL ERROR', "Command: {$command}, HTTP: {$httpCode}");
        jsonResponse(['success' => false, 'error' => 'Bot API error: ' . $httpCode, 'response' => $response], 500);
    }
    
} catch (Exception $e) {
    error_log("Bot control error: " . $e->getMessage());
    logActivity('❌ BOT CONTROL EXCEPTION', "Command: {$command}, Error: " . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'Failed: ' . $e->getMessage()], 500);
}