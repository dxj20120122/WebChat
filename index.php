<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>聊天</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/all.min.css">
    <link rel="stylesheet" href="css/group.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
</head>
<body>
    <div id="app">
        <!-- 登录注册界面 -->
        <div id="auth-container" class="container">
            <div class="form-container">
                <h2>登录</h2>
                <form id="login-form">
                    <input type="text" id="login-username" placeholder="用户名" required>
                    <input type="password" id="login-password" placeholder="密码" required>
                    <button type="submit">登录</button>
                </form>
                <p>还没有账号？<a href="#" id="show-register">立即注册</a></p>
            </div>

            <div class="form-container" style="display: none;">
                <h2>注册</h2>
                <form id="register-form">
                    <input type="text" id="register-username" placeholder="用户名" required>
                    <input type="password" id="register-password" placeholder="密码" required>
                    <input type="password" id="register-confirm-password" placeholder="确认密码" required>
                    <button type="submit">注册</button>
                </form>
                <p>已有账号？<a href="#" id="show-login">立即登录</a></p>
            </div>
        </div>

        <!-- 主聊天界面 -->
        <div id="chat-container" class="container" style="display: none;">
            <!-- 侧边栏遮罩层 -->
            <div id="sidebar-overlay" class="sidebar-overlay"></div>
            
            <!-- 侧边栏 -->
            <div class="sidebar" id="sidebar">
                <div class="user-info">
                    <span id="current-user"></span>
                    <button id="logout-btn">退出</button>
                </div>
                <div class="friend-actions">
                    <input type="text" id="add-friend-input" placeholder="输入用户名添加好友">
                    <button id="add-friend-btn">添加好友</button>
                    <div id="friend-requests" class="friend-requests">
                        <h3>好友请求</h3>
                        <div id="friend-requests-list"></div>
                    </div>
                </div>
                <div class="friend-list" id="friend-list">
                    <!-- 好友列表将通过JavaScript动态添加 -->
                </div>
                <div class="group-actions">
                    <button id="create-group-btn">创建群聊</button>
                </div>
                <div class="group-list" id="group-list">
                    <!-- 群组列表将通过JavaScript动态添加 -->
                </div>
            </div>
            
            <!-- 聊天区域 -->
            <div class="chat-area">
                <div class="chat-header">
                    <span id="chat-with">选择好友开始聊天</span>
                    <button id="mobile-back" style="display: none;"><i class="fas fa-arrow-left"></i></button>
                </div>
                <div class="messages" id="messages">
                    <!-- 消息内容将通过JavaScript动态添加 -->
                </div>
                <div class="message-input">
                    <textarea id="message-text" placeholder="输入消息..." rows="3"></textarea>
                    <button id="send-message">发送</button>
                </div>
            </div>
            
            <!-- 移动端侧边栏切换按钮 -->
            <button id="toggle-sidebar"><i class="fas fa-bars"></i></button>
        </div>
    </div>
    <script src="js/group.js"></script>
    <script src="js/main.js"></script>
</body>
</html>