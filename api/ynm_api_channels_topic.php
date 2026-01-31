<?php
// api/ynm_api_channels_topic.php - Channel Topics API kezelés

// VÁLTOZÓK INICIALIZÁLÁSA
$currentUser = $_SESSION['username'] ?? 'unknown';
$currentRole = $_SESSION['role'] ?? 'user';

// Helper függvények
function canModifyChannelTopic($currentRole, $currentUser, $channel) {
    $roleHierarchy = ['owner' => 5, 'admin' => 4, 'mod' => 3, 'vip' => 2, 'user' => 1];
    $currentLevel = $roleHierarchy[$currentRole] ?? 0;
    
    // VIP+ módosíthat topic-ot
    return $currentLevel >= 2;
}

function filterTopicsByRole($topics, $currentRole, $currentUser) {
    $currentRole = strtolower(trim($currentRole));
    
    // Owner és Admin mindent lát
    if (in_array($currentRole, ['owner', 'admin'])) {
        return $topics;
    }
    
    // VIP és Mod csak a saját csatornáit látja
    $channelUsersData = callBotAPI('GET', '/channel-users');
    
    if (!$channelUsersData || !($channelUsersData['success'] ?? false)) {
        return [];
    }
    
    $myChannels = [];
    foreach ($channelUsersData['channel_users'] ?? [] as $cu) {
        if (($cu['nick'] ?? '') === $currentUser) {
            $myChannels[] = $cu['channel'] ?? '';
        }
    }
    
    // Szűrés: csak a saját csatornák
    return array_filter($topics, function($topic) use ($myChannels) {
        return in_array($topic['name'] ?? '', $myChannels);
    });
}

try {
    switch ($action) {
        
        // ✅ Channel Topics listázása
        case 'channels_topic':
            // Bot API hívás - topics lekérése
            $topicsData = callBotAPI('GET', '/channels/topic');
            
            if ($topicsData === null) {
                throw new Exception('Bot API is not responding');
            }
            
            if (!($topicsData['success'] ?? false)) {
                throw new Exception($topicsData['error'] ?? 'Failed to fetch channel topics');
            }
            
            $allTopics = $topicsData['topics'] ?? [];
            
            // Szerepkör alapú szűrés
            $filteredTopics = filterTopicsByRole($allTopics, $currentRole, $currentUser);
            
            // Statisztikák
            $withTopicCount = 0;
            foreach ($filteredTopics as $topic) {
                if (!empty($topic['current_topic'])) {
                    $withTopicCount++;
                }
            }
            
            jsonResponse([
                'success' => true,
                'topics' => array_values($filteredTopics),
                'stats' => [
                    'total' => count($filteredTopics),
                    'with_topic' => $withTopicCount,
                    'without_topic' => count($filteredTopics) - $withTopicCount
                ],
                'user_role' => $currentRole
            ]);
            break;
            
        // ✅ Channel Topic frissítése
        case 'channels_topic_update':
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Ha nincs JSON, akkor próbáljuk $_POST-ból
            if (!$input) {
                $input = $_POST;
            }
            
            $id = intval($input['id'] ?? $_POST['id'] ?? $_GET['id'] ?? 0);
            $topic = $input['topic'] ?? $_POST['topic'] ?? $_GET['topic'] ?? '';
            
            error_log("channels_topic_update - ID: $id, Topic: '$topic', User: $currentUser");
            
            if ($id === 0) {
                jsonResponse(['success' => false, 'error' => 'Channel ID is required'], 400);
            }
            
            // 1. Jogosultság ellenőrzése
            if (!canModifyChannelTopic($currentRole, $currentUser, '')) {
                jsonResponse([
                    'success' => false,
                    'error' => 'Csak VIP/Mod/Admin/Owner módosíthatja a topic-ot'
                ], 403);
            }
            
            // 2. Lekérjük a csatorna nevét
            $channelsData = callBotAPI('GET', '/channels');
            
            if ($channelsData === null || !($channelsData['success'] ?? false)) {
                throw new Exception('Failed to fetch channels');
            }
            
            $channelName = null;
            foreach ($channelsData['channels'] ?? [] as $ch) {
                if (intval($ch['id'] ?? 0) === $id) {
                    $channelName = $ch['name'] ?? null;
                    break;
                }
            }
            
            if (!$channelName) {
                jsonResponse(['success' => false, 'error' => 'Channel not found'], 404);
            }
            
            // 3. VIP/Mod csak a saját csatornáit módosíthatja
            if (!in_array($currentRole, ['owner', 'admin'])) {
                $channelUsersData = callBotAPI('GET', '/channel-users');
                
                $hasAccess = false;
                foreach ($channelUsersData['channel_users'] ?? [] as $cu) {
                    if (($cu['nick'] ?? '') === $currentUser && ($cu['channel'] ?? '') === $channelName) {
                        $hasAccess = true;
                        break;
                    }
                }
                
                if (!$hasAccess) {
                    jsonResponse([
                        'success' => false,
                        'error' => 'Nincs jogosultságod ehhez a csatornához'
                    ], 403);
                }
            }
            
            // 4. Bot API hívás - topic frissítése
            $updateData = [
                'id' => $id,
                'topic' => $topic
            ];
            
            $result = callBotAPI('PUT', '/channels/topic', $updateData);
            
            if ($result === null) {
                throw new Exception('Bot API is not responding');
            }
            
            if (!($result['success'] ?? false)) {
                throw new Exception($result['error'] ?? 'Failed to update topic');
            }
            
            // 5. Audit log
            $action_text = empty($topic) ? 'Topic cleared' : 'Topic updated';
            logActivity('📝', "$action_text for $channelName by $currentUser");
            
            jsonResponse([
                'success' => true,
                'message' => $result['message'] ?? 'Topic updated successfully',
                'channel' => $channelName,
                'topic' => $topic,
                'bot_action' => $result['bot_action'] ?? null
            ]);
            break;
            
        // ✅ Channel Topic törlése (clear)
        case 'channels_topic_clear':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                $input = $_POST;
            }
            
            $id = intval($input['id'] ?? $_POST['id'] ?? $_GET['id'] ?? 0);
            
            if ($id === 0) {
                jsonResponse(['success' => false, 'error' => 'Channel ID is required'], 400);
            }
            
            // Jogosultság ellenőrzése
            if (!canModifyChannelTopic($currentRole, $currentUser, '')) {
                jsonResponse([
                    'success' => false,
                    'error' => 'Csak VIP/Mod/Admin/Owner törölheti a topic-ot'
                ], 403);
            }
            
            // Topic törlése = üres string beállítása
            $updateData = [
                'id' => $id,
                'topic' => ''
            ];
            
            $result = callBotAPI('PUT', '/channels/topic', $updateData);
            
            if ($result === null) {
                throw new Exception('Bot API is not responding');
            }
            
            if (!($result['success'] ?? false)) {
                throw new Exception($result['error'] ?? 'Failed to clear topic');
            }
            
            // Audit log
            logActivity('🗑️', "Topic cleared for channel ID: $id by $currentUser");
            
            jsonResponse([
                'success' => true,
                'message' => 'Topic cleared successfully',
                'bot_action' => $result['bot_action'] ?? null
            ]);
            break;
            
        // ✅ Channel Topics statisztikák
        case 'channels_topic_stats':
            $topicsData = callBotAPI('GET', '/channels/topic');
            
            if ($topicsData === null || !($topicsData['success'] ?? false)) {
                throw new Exception('Failed to fetch channel topics');
            }
            
            $allTopics = $topicsData['topics'] ?? [];
            
            // Szerepkör alapú szűrés
            $filteredTopics = filterTopicsByRole($allTopics, $currentRole, $currentUser);
            
            // Statisztikák számítása
            $stats = [
                'total_channels' => count($filteredTopics),
                'with_topic' => 0,
                'without_topic' => 0,
                'recent_updates' => [],
                'longest_topic' => '',
                'longest_topic_length' => 0
            ];
            
            foreach ($filteredTopics as $topic) {
                $currentTopic = $topic['current_topic'] ?? '';
                
                if (!empty($currentTopic)) {
                    $stats['with_topic']++;
                    
                    // Leghosszabb topic
                    $topicLength = mb_strlen($currentTopic);
                    if ($topicLength > $stats['longest_topic_length']) {
                        $stats['longest_topic'] = $currentTopic;
                        $stats['longest_topic_length'] = $topicLength;
                    }
                    
                    // Legutóbbi frissítések
                    if (!empty($topic['topic_set_at'])) {
                        $stats['recent_updates'][] = [
                            'channel' => $topic['name'] ?? '',
                            'topic' => mb_substr($currentTopic, 0, 50) . (mb_strlen($currentTopic) > 50 ? '...' : ''),
                            'set_by' => $topic['topic_set_by'] ?? '',
                            'set_at' => $topic['topic_set_at'] ?? ''
                        ];
                    }
                } else {
                    $stats['without_topic']++;
                }
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
            jsonResponse(['success' => false, 'error' => 'Unknown channels_topic action'], 400);
    }
    
} catch (Exception $e) {
    error_log("Channel Topics API error: " . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'API error: ' . $e->getMessage()], 500);
}
?>