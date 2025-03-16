<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// 数据文件路径
define('USERS_FILE', '../data/users.json');
define('FRIENDS_FILE', '../data/friends.json');

// 确保数据目录存在
if (!file_exists('../data')) {
    mkdir('../data', 0777, true);
}

// 初始化用户数据文件
if (!file_exists(USERS_FILE)) {
    file_put_contents(USERS_FILE, json_encode([]));
}

// 初始化好友关系文件
if (!file_exists(FRIENDS_FILE)) {
    file_put_contents(FRIENDS_FILE, json_encode([]));
}

// 获取请求数据
$data = json_decode(file_get_contents('php://input'), true);
$action = isset($_GET['action']) ? $_GET['action'] : '';

// 处理不同的请求
switch ($action) {
    case 'register':
        register($data);
        break;
    case 'login':
        login($data);
        break;
    case 'auto_login':
        autoLogin($data);
        break;
    default:
        echo json_encode(['success' => false, 'message' => '无效的请求']);
}

// 生成唯一ID
function generateUniqueId() {
    return uniqid() . bin2hex(random_bytes(8));
}

// 注册功能
function register($data) {
    if (!isset($data['username']) || !isset($data['password'])) {
        echo json_encode(['success' => false, 'message' => '用户名和密码不能为空']);
        return;
    }

    $users = json_decode(file_get_contents(USERS_FILE), true);
    
    // 检查用户名是否已存在
    foreach ($users as $user) {
        if ($user['username'] === $data['username']) {
            echo json_encode(['success' => false, 'message' => '用户名已存在']);
            return;
        }
    }

    // 添加新用户
    $userId = generateUniqueId();
    $users[] = [
        'id' => $userId,
        'username' => $data['username'],
        'password' => password_hash($data['password'], PASSWORD_DEFAULT)
    ];

    file_put_contents(USERS_FILE, json_encode($users));
    echo json_encode(['success' => true, 'message' => '注册成功', 'user' => ['id' => $userId, 'username' => $data['username']]]);
}

// 自动登录功能
function autoLogin($data) {
    if (!isset($data['userId']) || !isset($data['username'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }

    $users = json_decode(file_get_contents(USERS_FILE), true);
    
    foreach ($users as $user) {
        if ($user['id'] === $data['userId'] && $user['username'] === $data['username']) {
            echo json_encode([
                'success' => true,
                'message' => '自动登录成功',
                'user' => ['id' => $user['id'], 'username' => $user['username']]
            ]);
            return;
        }
    }

    echo json_encode(['success' => false, 'message' => '自动登录失败']);
}

// 登录功能
function login($data) {
    if (!isset($data['username']) || !isset($data['password'])) {
        echo json_encode(['success' => false, 'message' => '用户名和密码不能为空']);
        return;
    }

    $users = json_decode(file_get_contents(USERS_FILE), true);
    
    foreach ($users as $user) {
        if ($user['username'] === $data['username']) {
            if (password_verify($data['password'], $user['password'])) {
                echo json_encode([
                    'success' => true,
                    'message' => '登录成功',
                    'user' => ['id' => $user['id'], 'username' => $user['username']]
                ]);
                return;
            }
            break;
        }
    }

    echo json_encode(['success' => false, 'message' => '用户名或密码错误']);
}