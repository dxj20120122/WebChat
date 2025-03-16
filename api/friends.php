<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

define('FRIENDS_FILE', '../data/friends.json');
define('USERS_FILE', '../data/users.json');
define('MESSAGES_FILE', '../data/messages.json');
define('REQUESTS_FILE', '../data/requests.json');

if (!file_exists(FRIENDS_FILE)) {
    file_put_contents(FRIENDS_FILE, json_encode([]));
}

if (!file_exists(MESSAGES_FILE)) {
    file_put_contents(MESSAGES_FILE, json_encode([]));
}

if (!file_exists(REQUESTS_FILE)) {
    file_put_contents(REQUESTS_FILE, json_encode([]));
}

$data = json_decode(file_get_contents('php://input'), true);
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'search_users':
        searchUsers($data);
        break;
    case 'get_all_users':
        getAllUsers($data);
        break;
    case 'add_friend':
        addFriend($data);
        break;
    case 'get_friends':
        getFriends($data);
        break;
    case 'get_friend_requests':
        getFriendRequests($data);
        break;
    case 'handle_friend_request':
        handleFriendRequest($data);
        break;
    case 'send_message':
        sendMessage($data);
        break;
    case 'get_messages':
        getMessages($data);
        break;
    default:
        echo json_encode(['success' => false, 'message' => '无效的请求']);
}

// 获取所有用户
function getAllUsers($data) {
    if (!isset($data['username'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }

    $currentUser = $data['username'];
    $users = json_decode(file_get_contents(USERS_FILE), true);
    $friends = json_decode(file_get_contents(FRIENDS_FILE), true);
    $requests = json_decode(file_get_contents(REQUESTS_FILE), true);
    
    $userList = [];
    $friendList = [];
    $pendingList = [];
    
    // 获取当前用户的好友列表
    foreach ($friends as $friendship) {
        if ($friendship['user1'] === $currentUser) {
            $friendList[] = $friendship['user2'];
        } else if ($friendship['user2'] === $currentUser) {
            $friendList[] = $friendship['user1'];
        }
    }
    
    // 获取已发送请求的用户列表
    foreach ($requests as $request) {
        if ($request['from'] === $currentUser) {
            $pendingList[] = $request['to'];
        } else if ($request['to'] === $currentUser) {
            $pendingList[] = $request['from'];
        }
    }
    
    // 过滤掉当前用户、已经是好友的用户和已发送请求的用户
    foreach ($users as $user) {
        if ($user['username'] !== $currentUser && 
            !in_array($user['username'], $friendList) && 
            !in_array($user['username'], $pendingList)) {
            $userList[] = $user['username'];
        }
    }
    
    echo json_encode(['success' => true, 'users' => $userList]);
}

// 添加好友功能（发送好友请求）
function addFriend($data) {
    if (!isset($data['username']) || !isset($data['friend_username'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }

    $friends = json_decode(file_get_contents(FRIENDS_FILE), true);
    $requests = json_decode(file_get_contents(REQUESTS_FILE), true);
    
    // 检查是否已经是好友
    foreach ($friends as $friendship) {
        if (($friendship['user1'] === $data['username'] && $friendship['user2'] === $data['friend_username']) ||
            ($friendship['user1'] === $data['friend_username'] && $friendship['user2'] === $data['username'])) {
            echo json_encode(['success' => false, 'message' => '已经是好友关系']);
            return;
        }
    }
    
    // 检查是否已经发送过请求
    foreach ($requests as $request) {
        if ($request['from'] === $data['username'] && $request['to'] === $data['friend_username']) {
            echo json_encode(['success' => false, 'message' => '已经发送过好友请求']);
            return;
        }
        
        // 如果对方已经向你发送请求，则自动接受
        if ($request['from'] === $data['friend_username'] && $request['to'] === $data['username']) {
            // 删除请求
            $newRequests = array_filter($requests, function($r) use ($data) {
                return !($r['from'] === $data['friend_username'] && $r['to'] === $data['username']);
            });
            
            // 添加好友关系
            $friends[] = [
                'user1' => $data['username'],
                'user2' => $data['friend_username']
            ];
            
            file_put_contents(REQUESTS_FILE, json_encode(array_values($newRequests)));
            file_put_contents(FRIENDS_FILE, json_encode($friends));
            
            echo json_encode(['success' => true, 'message' => '已接受对方的好友请求']);
            return;
        }
    }

    // 添加好友请求
    $requests[] = [
        'from' => $data['username'],
        'to' => $data['friend_username'],
        'timestamp' => time()
    ];

    file_put_contents(REQUESTS_FILE, json_encode($requests));
    echo json_encode(['success' => true, 'message' => '好友请求已发送，等待对方接受']);
}

// 获取好友列表
function getFriends($data) {
    if (!isset($data['username'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }

    $friends = json_decode(file_get_contents(FRIENDS_FILE), true);
    $friendList = [];
    
    foreach ($friends as $friendship) {
        if ($friendship['user1'] === $data['username']) {
            $friendList[] = $friendship['user2'];
        } else if ($friendship['user2'] === $data['username']) {
            $friendList[] = $friendship['user1'];
        }
    }

    echo json_encode(['success' => true, 'friends' => $friendList]);
}

// 获取好友请求
function getFriendRequests($data) {
    if (!isset($data['username'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }

    $requests = json_decode(file_get_contents(REQUESTS_FILE), true);
    $requestsList = [];
    
    foreach ($requests as $request) {
        if ($request['to'] === $data['username']) {
            $requestsList[] = [
                'from' => $request['from'],
                'timestamp' => $request['timestamp']
            ];
        }
    }

    echo json_encode(['success' => true, 'requests' => $requestsList]);
}

// 处理好友请求
function handleFriendRequest($data) {
    if (!isset($data['username']) || !isset($data['from']) || !isset($data['action'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }

    $requests = json_decode(file_get_contents(REQUESTS_FILE), true);
    $friends = json_decode(file_get_contents(FRIENDS_FILE), true);
    
    // 查找请求
    $requestFound = false;
    $newRequests = [];
    
    foreach ($requests as $request) {
        if ($request['from'] === $data['from'] && $request['to'] === $data['username']) {
            $requestFound = true;
        } else {
            $newRequests[] = $request;
        }
    }
    
    if (!$requestFound) {
        echo json_encode(['success' => false, 'message' => '未找到该好友请求']);
        return;
    }
    
    // 处理请求
    if ($data['action'] === 'accept') {
        // 添加好友关系
        $friends[] = [
            'user1' => $data['username'],
            'user2' => $data['from']
        ];
        
        file_put_contents(FRIENDS_FILE, json_encode($friends));
        file_put_contents(REQUESTS_FILE, json_encode($newRequests));
        
        echo json_encode(['success' => true, 'message' => '已接受好友请求']);
    } else if ($data['action'] === 'reject') {
        // 仅删除请求
        file_put_contents(REQUESTS_FILE, json_encode($newRequests));
        
        echo json_encode(['success' => true, 'message' => '已拒绝好友请求']);
    } else {
        echo json_encode(['success' => false, 'message' => '无效的操作']);
    }
}

// 发送消息
function sendMessage($data) {
    if (!isset($data['from']) || !isset($data['to']) || !isset($data['content'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }

    $messages = json_decode(file_get_contents(MESSAGES_FILE), true);
    
    // 添加新消息
    $messages[] = [
        'from' => $data['from'],
        'to' => $data['to'],
        'content' => $data['content'],
        'timestamp' => time()
    ];

    file_put_contents(MESSAGES_FILE, json_encode($messages));
    echo json_encode(['success' => true, 'message' => '发送成功']);
}

// 获取消息记录
function getMessages($data) {
    if (!isset($data['user1']) || !isset($data['user2'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }

    $messages = json_decode(file_get_contents(MESSAGES_FILE), true);
    $chatMessages = [];
    
    foreach ($messages as $message) {
        if (($message['from'] === $data['user1'] && $message['to'] === $data['user2']) ||
            ($message['from'] === $data['user2'] && $message['to'] === $data['user1'])) {
            $chatMessages[] = $message;
        }
    }

    echo json_encode(['success' => true, 'messages' => $chatMessages]);
}

// 搜索用户
function searchUsers($data) {
    if (!isset($data['keyword'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }

    $keyword = $data['keyword'];
    $users = json_decode(file_get_contents(USERS_FILE), true);
    $matchedUsers = [];
    
    foreach ($users as $user) {
        if (strpos($user['username'], $keyword) !== false) {
            $matchedUsers[] = $user['username'];
        }
    }

    echo json_encode(['success' => true, 'users' => $matchedUsers]);
}