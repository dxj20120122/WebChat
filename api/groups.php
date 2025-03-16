<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

define('GROUPS_FILE', '../data/groups.json');
define('GROUP_MEMBERS_FILE', '../data/group_members.json');
define('MESSAGES_FILE', '../data/messages.json');

if (!file_exists(GROUPS_FILE)) {
    file_put_contents(GROUPS_FILE, json_encode([]));
}

if (!file_exists(GROUP_MEMBERS_FILE)) {
    file_put_contents(GROUP_MEMBERS_FILE, json_encode([]));
}

$data = json_decode(file_get_contents('php://input'), true);
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'create_group':
        createGroup($data);
        break;
    case 'get_groups':
        getGroups($data);
        break;
    case 'join_group':
        joinGroup($data);
        break;
    case 'leave_group':
        leaveGroup($data);
        break;
    case 'get_group_members':
        getGroupMembers($data);
        break;
    case 'send_group_message':
        sendGroupMessage($data);
        break;
    case 'get_group_messages':
        getGroupMessages($data);
        break;
    default:
        echo json_encode(['success' => false, 'message' => '无效的请求']);
}

// 创建群组
function createGroup($data) {
    if (!isset($data['creator']) || !isset($data['group_name'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }

    $groups = json_decode(file_get_contents(GROUPS_FILE), true);
    $groupMembers = json_decode(file_get_contents(GROUP_MEMBERS_FILE), true);
    
    // 生成唯一的群组ID
    $groupId = uniqid('group_');
    
    // 创建群组信息
    $groups[] = [
        'group_id' => $groupId,
        'group_name' => $data['group_name'],
        'creator' => $data['creator'],
        'created_at' => time()
    ];
    
    // 添加创建者为群组成员和管理员
    $groupMembers[] = [
        'group_id' => $groupId,
        'username' => $data['creator'],
        'role' => 'admin',
        'joined_at' => time()
    ];
    
    file_put_contents(GROUPS_FILE, json_encode($groups));
    file_put_contents(GROUP_MEMBERS_FILE, json_encode($groupMembers));
    
    echo json_encode(['success' => true, 'message' => '群组创建成功', 'group_id' => $groupId]);
}

// 获取用户的群组列表
function getGroups($data) {
    if (!isset($data['username'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }

    $groups = json_decode(file_get_contents(GROUPS_FILE), true);
    $groupMembers = json_decode(file_get_contents(GROUP_MEMBERS_FILE), true);
    
    $userGroups = [];
    
    // 获取用户所在的群组
    foreach ($groupMembers as $member) {
        if ($member['username'] === $data['username']) {
            foreach ($groups as $group) {
                if ($group['group_id'] === $member['group_id']) {
                    $userGroups[] = [
                        'group_id' => $group['group_id'],
                        'group_name' => $group['group_name'],
                        'creator' => $group['creator'],
                        'role' => $member['role']
                    ];
                    break;
                }
            }
        }
    }
    
    echo json_encode(['success' => true, 'groups' => $userGroups]);
}

// 加入群组
function joinGroup($data) {
    if (!isset($data['username']) || !isset($data['group_id'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }

    $groupMembers = json_decode(file_get_contents(GROUP_MEMBERS_FILE), true);
    
    // 检查是否已经是群组成员
    foreach ($groupMembers as $member) {
        if ($member['group_id'] === $data['group_id'] && $member['username'] === $data['username']) {
            echo json_encode(['success' => false, 'message' => '已经是群组成员']);
            return;
        }
    }
    
    // 添加新成员
    $groupMembers[] = [
        'group_id' => $data['group_id'],
        'username' => $data['username'],
        'role' => 'member',
        'joined_at' => time()
    ];
    
    file_put_contents(GROUP_MEMBERS_FILE, json_encode($groupMembers));
    echo json_encode(['success' => true, 'message' => '成功加入群组']);
}

// 退出群组
function leaveGroup($data) {
    if (!isset($data['username']) || !isset($data['group_id'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }

    $groupMembers = json_decode(file_get_contents(GROUP_MEMBERS_FILE), true);
    $newGroupMembers = [];
    $found = false;
    
    foreach ($groupMembers as $member) {
        if ($member['group_id'] === $data['group_id'] && $member['username'] === $data['username']) {
            $found = true;
            continue;
        }
        $newGroupMembers[] = $member;
    }
    
    if (!$found) {
        echo json_encode(['success' => false, 'message' => '不是群组成员']);
        return;
    }
    
    file_put_contents(GROUP_MEMBERS_FILE, json_encode($newGroupMembers));
    echo json_encode(['success' => true, 'message' => '成功退出群组']);
}

// 获取群组成员列表
function getGroupMembers($data) {
    if (!isset($data['group_id'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }

    $groupMembers = json_decode(file_get_contents(GROUP_MEMBERS_FILE), true);
    $members = [];
    
    foreach ($groupMembers as $member) {
        if ($member['group_id'] === $data['group_id']) {
            $members[] = [
                'username' => $member['username'],
                'role' => $member['role'],
                'joined_at' => $member['joined_at']
            ];
        }
    }
    
    echo json_encode(['success' => true, 'members' => $members]);
}

// 发送群组消息
function sendGroupMessage($data) {
    if (!isset($data['username']) || !isset($data['group_id']) || !isset($data['content'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }

    $messages = json_decode(file_get_contents(MESSAGES_FILE), true);
    
    // 添加新消息
    $messages[] = [
        'type' => 'group',
        'group_id' => $data['group_id'],
        'from' => $data['username'],
        'content' => $data['content'],
        'timestamp' => time()
    ];

    file_put_contents(MESSAGES_FILE, json_encode($messages));
    echo json_encode(['success' => true, 'message' => '发送成功']);
}

// 获取群组消息记录
function getGroupMessages($data) {
    if (!isset($data['group_id'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }

    $messages = json_decode(file_get_contents(MESSAGES_FILE), true);
    $groupMessages = [];
    
    foreach ($messages as $message) {
        if (isset($message['type']) && $message['type'] === 'group' && 
            $message['group_id'] === $data['group_id']) {
            $groupMessages[] = $message;
        }
    }

    echo json_encode(['success' => true, 'messages' => $groupMessages]);
}