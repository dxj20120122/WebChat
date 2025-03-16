// 全局变量
let currentUser = null;
let currentChat = null;
let messagePollingInterval = null;
let friendRequestsPollingInterval = null;
let isMobile = window.innerWidth <= 768;
let userScrolled = false;
let lastMessageTimestamps = {};
let notificationPermission = false;
let unreadMessages = {};
let isWindows = navigator.userAgent.indexOf("Windows") !== -1;
let notificationSound = new Audio('sounds/notification.mp3');
let notifiedMessageIds = new Set();

// DOM 元素
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const currentUserSpan = document.getElementById('current-user');
const logoutBtn = document.getElementById('logout-btn');
const addFriendInput = document.getElementById('add-friend-input');
const addFriendBtn = document.getElementById('add-friend-btn');
const friendList = document.getElementById('friend-list');
const chatWith = document.getElementById('chat-with');
const messages = document.getElementById('messages');
const messageText = document.getElementById('message-text');
const sendMessage = document.getElementById('send-message');
const toggleSidebar = document.getElementById('toggle-sidebar');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileBack = document.getElementById('mobile-back');

// 请求通知权限
function requestNotificationPermission() {
    // 检查浏览器是否支持通知
    if (!("Notification" in window)) {
        console.log("此浏览器不支持桌面通知");
        return;
    }

    // 已经有权限
    if (Notification.permission === "granted") {
        notificationPermission = true;
        return;
    }
    
    // 请求权限
    if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                notificationPermission = true;
            }
        });
    }
}

// 显示消息通知
function showMessageNotification(sender, message, messageId) {
    // 如果没有通知权限或者当前正在查看该聊天，则不显示通知
    if (!notificationPermission || (document.visibilityState === 'visible' && sender === currentChat)) {
        return;
    }
    
    // 检查是否已经通知过这条消息
    if (notifiedMessageIds.has(messageId)) {
        return;
    }
    
    // 标记这条消息已经通知过
    notifiedMessageIds.add(messageId);
    
    // 播放提示音
    playNotificationSound();
    
    // 添加未读消息标记
    markUnreadMessage(sender);
    
    // 如果是Windows系统，显示系统通知
    if (isWindows) {
        const notification = new Notification("新消息来自 " + sender, {
            body: message,
            icon: "images/chat-icon.png" // 可以替换为你的应用图标
        });
        
        // 点击通知时切换到对应的聊天
        notification.onclick = function() {
            window.focus();
            selectFriend(sender);
        };
        
        // 5秒后自动关闭通知
        setTimeout(() => {
            notification.close();
        }, 5000);
    }
}

// 播放通知提示音
function playNotificationSound() {
    notificationSound.play().catch(e => {
        console.log("无法播放提示音:", e);
    });
}

// 标记未读消息
function markUnreadMessage(sender) {
    // 如果当前正在查看该聊天，则不标记
    if (sender === currentChat) return;
    
    // 标记为未读
    unreadMessages[sender] = true;
    
    // 更新好友列表中的未读标记
    updateUnreadIndicators();
}

// 更新未读消息指示器
function updateUnreadIndicators() {
    // 获取所有好友项
    const friendItems = document.querySelectorAll('.friend-item');
    
    friendItems.forEach(item => {
        const friendName = item.textContent.trim();
        const unreadIndicator = item.querySelector('.unread-indicator');
        
        if (unreadMessages[friendName]) {
            // 如果没有未读指示器，则添加
            if (!unreadIndicator) {
                const indicator = document.createElement('span');
                indicator.className = 'unread-indicator';
                item.appendChild(indicator);
            }
        } else {
            // 如果有未读指示器，则移除
            if (unreadIndicator) {
                unreadIndicator.remove();
            }
        }
    });
}

// 清除未读标记
function clearUnreadMark(friend) {
    if (unreadMessages[friend]) {
        delete unreadMessages[friend];
        updateUnreadIndicators();
    }
}

// 监听消息区域的滚动事件
messages.addEventListener('scroll', function() {
    // 检测用户是否手动滚动
    const isScrolledToBottom = messages.scrollHeight - messages.clientHeight <= messages.scrollTop + 10;
    userScrolled = !isScrolledToBottom;
});

// 移动端适配函数
function setupMobileUI() {
    window.addEventListener('resize', () => {
        isMobile = window.innerWidth <= 768;
        updateMobileUI();
    });
    
    toggleSidebar.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    });
    
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
    
    mobileBack.addEventListener('click', () => {
        if (isMobile) {
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
        }
    });
    
    updateMobileUI();
}

// 更新移动端UI
function updateMobileUI() {
    if (isMobile) {
        if (mobileBack) {
            mobileBack.style.display = currentChat ? 'block' : 'none';
        }
    } else {
        if (mobileBack) {
            mobileBack.style.display = 'none';
        }
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }
}

// 检查自动登录
async function checkAutoLogin() {
    const userId = localStorage.getItem('userId');
    const storedUsername = localStorage.getItem('username');
    if (userId && storedUsername) {
        try {
            const response = await fetch('api/auth.php?action=auto_login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId, username: storedUsername })
            });
            const data = await response.json();
            if (data.success) {
                currentUser = storedUsername;
                currentUserSpan.textContent = currentUser;
                authContainer.style.display = 'none';
                chatContainer.style.display = 'flex';
                loadFriends();
                loadAllUsers();
                startMessagePolling();
                startFriendRequestsPolling();
                requestNotificationPermission();
                return;
            }
        } catch (error) {
            console.error('自动登录失败:', error);
        }
    }
    
    // 如果自动登录失败，显示登录表单
    authContainer.style.display = 'block';
    chatContainer.style.display = 'none';
}

// 登录表单提交
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch('api/auth.php?action=login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('username', data.user.username);
            currentUser = data.user.username;
            currentUserSpan.textContent = currentUser;
            authContainer.style.display = 'none';
            chatContainer.style.display = 'flex';
            loadFriends();
            loadAllUsers();
            startMessagePolling();
            startFriendRequestsPolling();
            requestNotificationPermission();
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert('登录失败，请稍后重试');
    }
});

// 注册表单提交
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (password !== confirmPassword) {
        alert('两次输入的密码不一致');
        return;
    }
    
    try {
        const response = await fetch('api/auth.php?action=register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (data.success) {
            alert('注册成功，请登录');
            showLoginLink.click();
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert('注册失败，请稍后重试');
    }
});

// 切换到注册表单
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.form-container').forEach((form, index) => {
        form.style.display = index === 1 ? 'block' : 'none';
    });
});

// 切换到登录表单
showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.form-container').forEach((form, index) => {
        form.style.display = index === 0 ? 'block' : 'none';
    });
});

// 退出登录
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    currentUser = null;
    currentChat = null;
    stopMessagePolling();
    stopFriendRequestsPolling();
    authContainer.style.display = 'block';
    chatContainer.style.display = 'none';
});

let searchTimeout;
addFriendInput.addEventListener('input', async (e) => {
    clearTimeout(searchTimeout);
    const keyword = e.target.value.trim();
    if (keyword.length < 1) return;

    searchTimeout = setTimeout(async () => {
        const response = await fetch('api/friends.php?action=search_users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                keyword: keyword
            })
        });

        const data = await response.json();
        if (data.success) {
            const searchResults = document.getElementById('search-results') || document.createElement('div');
            searchResults.id = 'search-results';
            searchResults.className = 'search-results';
            searchResults.innerHTML = '';

            data.users.forEach(user => {
                const userDiv = document.createElement('div');
                userDiv.className = 'search-result-item';
                userDiv.textContent = user;
                userDiv.onclick = () => {
                    addFriendInput.value = user;
                    searchResults.remove();
                };
                searchResults.appendChild(userDiv);
            });

            if (!document.getElementById('search-results')) {
                addFriendInput.parentElement.appendChild(searchResults);
            }
        }
    }, 300);
});

addFriendBtn.addEventListener('click', async () => {
    const friendUsername = addFriendInput.value.trim();
    if (!friendUsername) {
        alert('请输入好友用户名');
        return;
    }

    try {
        const response = await fetch('api/friends.php?action=add_friend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: currentUser,
                friend_username: friendUsername
            })
        });
        const data = await response.json();
        alert(data.message);
        if (data.success) {
            addFriendInput.value = '';
            loadFriends();
            loadAllUsers();
            const searchResults = document.getElementById('search-results');
            if (searchResults) searchResults.remove();
        }
    } catch (error) {
        alert('添加好友失败，请稍后重试');
    }
});

let currentFriends = [];

async function loadFriends() {
    try {
        // 获取好友列表
        const friendsResponse = await fetch('api/friends.php?action=get_friends', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: currentUser
            })
        });

        // 获取群组列表
        const groupsResponse = await fetch('api/groups.php?action=get_groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: currentUser
            })
        });

        const friendsData = await friendsResponse.json();
        const groupsData = await groupsResponse.json();
        const newFriends = friendsData.friends;

        if (JSON.stringify(currentFriends) !== JSON.stringify(newFriends)) {
            currentFriends = newFriends;
            friendList.innerHTML = '<h3>聊天列表</h3>';

            const allEmpty = (!friendsData.success || friendsData.friends.length === 0) &&
                            (!groupsData.success || !groupsData.groups || groupsData.groups.length === 0);

            if (allEmpty) {
                const emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                emptyState.innerHTML = '<i class="fas fa-comments"></i><p>暂无聊天</p>';
                friendList.appendChild(emptyState);
            } else {
                // 添加好友列表
                if (friendsData.success && friendsData.friends.length > 0) {
                    friendsData.friends.forEach(friend => {
                        const friendItem = document.createElement('div');
                        friendItem.className = 'group-item contact';
                        if (friend === currentChat) {
                            friendItem.classList.add('active');
                        }
                        friendItem.innerHTML = `
                            <i class="fas fa-user"></i>
                            <span>${friend}</span>
                        `;
                        friendItem.addEventListener('click', () => selectFriend(friend));
                        
                        // 添加未读指示器（如果有未读消息）
                        if (unreadMessages[friend]) {
                            const unreadIndicator = document.createElement('span');
                            unreadIndicator.className = 'unread-indicator';
                            friendItem.appendChild(unreadIndicator);
                        }
                        
                        friendList.appendChild(friendItem);
                    });
                }

                // 添加群组列表
                if (groupsData.success && groupsData.groups && groupsData.groups.length > 0) {
                    groupsData.groups.forEach(group => {
                        const groupItem = document.createElement('div');
                        groupItem.className = 'group-item contact';
                        if (`group_${group.group_id}` === currentChat) {
                            groupItem.classList.add('active');
                        }
                        groupItem.innerHTML = `
                            <i class="fas fa-users"></i>
                            <span>${group.group_name}</span>
                        `;
                        groupItem.addEventListener('click', () => selectGroup(group.group_id, group.group_name));
                        
                        // 添加未读指示器（如果有未读消息）
                        if (unreadMessages[`group_${group.group_id}`]) {
                            const unreadIndicator = document.createElement('span');
                            unreadIndicator.className = 'unread-indicator';
                            groupItem.appendChild(unreadIndicator);
                        }
                        
                        friendList.appendChild(groupItem);
                    });
                }
            }
        }
    } catch (error) {
        console.error('加载聊天列表失败:', error);
    }
}

async function loadFriendRequests() {
    try {
        const response = await fetch('api/friends.php?action=get_friend_requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: currentUser
            })
        });
        
        const data = await response.json();
        if (data.success) {
            const requestsList = document.getElementById('friend-requests-list');
            const friendRequests = document.getElementById('friend-requests');
            if (requestsList) {
                requestsList.innerHTML = '';
                
                if (data.requests.length === 0) {
                    requestsList.innerHTML = '<div class="empty-state"><p>暂无好友请求</p></div>';
                    friendRequests.classList.add('empty');
                } else {
                    friendRequests.classList.remove('empty');
                    data.requests.forEach(request => {
                        const requestItem = document.createElement('div');
                        requestItem.className = 'request-item';
                        requestItem.innerHTML = `
                            <span>${request.from}</span>
                            <div class="request-actions">
                                <button class="accept-btn" data-from="${request.from}">接受</button>
                                <button class="reject-btn" data-from="${request.from}">拒绝</button>
                            </div>
                        `;
                        requestsList.appendChild(requestItem);
                    });
                }
                
                // 添加接受和拒绝按钮的事件监听
                document.querySelectorAll('.accept-btn').forEach(btn => {
                    btn.addEventListener('click', () => handleFriendRequest(btn.dataset.from, 'accept'));
                });
                
                document.querySelectorAll('.reject-btn').forEach(btn => {
                    btn.addEventListener('click', () => handleFriendRequest(btn.dataset.from, 'reject'));
                });
            }
        }
    } catch (error) {
        console.error('加载好友请求失败:', error);
    }
}

async function handleFriendRequest(from, action) {
    try {
        const response = await fetch('api/friends.php?action=handle_friend_request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: currentUser,
                from: from,
                action: action
            })
        });

        const data = await response.json();
        alert(data.message);
        if (data.success) {
            loadFriendRequests();
            loadFriends();
        }
    } catch (error) {
        console.error('处理好友请求失败:', error);
    }
}

function startFriendRequestsPolling() {
    loadFriendRequests();
    friendRequestsPollingInterval = setInterval(loadFriendRequests, 10000);
}

function stopFriendRequestsPolling() {
    if (friendRequestsPollingInterval) {
        clearInterval(friendRequestsPollingInterval);
        friendRequestsPollingInterval = null;
    }
}

// 选择好友聊天
function selectFriend(friend) {
    currentChat = friend;
    chatWith.textContent = friend;
    document.querySelectorAll('.friend-item').forEach(item => {
        item.classList.remove('active');
        if (item.textContent === friend) {
            item.classList.add('active');
        }
    });
    loadMessages();
    userScrolled = false; // 重置用户滚动标志
    
    // 清除未读标记
    clearUnreadMark(friend);
    
    if (isMobile) {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        if (mobileBack) {
            mobileBack.style.display = 'block';
        }
    }
}

// 加载聊天记录
async function loadMessages() {
    if (!currentChat) return;

    try {
        let response;
        if (currentChat.startsWith('group_')) {
            // 加载群组消息
            const groupId = currentChat.replace('group_', '');
            response = await fetch('api/groups.php?action=get_group_messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    group_id: groupId
                })
            });
        } else {
            // 加载私聊消息
            response = await fetch('api/friends.php?action=get_messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user1: currentUser,
                    user2: currentChat
                })
            });
        }
        const data = await response.json();
        if (data.success) {
            const oldScrollHeight = messages.scrollHeight;
            const oldScrollTop = messages.scrollTop;
            const wasAtBottom = (messages.scrollHeight - messages.clientHeight <= messages.scrollTop + 10);
            
            messages.innerHTML = '';
            
            // 检查是否有新消息
            let latestTimestamp = 0;
            
            data.messages.forEach(message => {
                const messageElement = document.createElement('div');
                messageElement.className = `message ${message.from === currentUser ? 'sent' : 'received'}`;
                
                const content = document.createElement('div');
                content.className = 'message-content';
                content.textContent = message.content;
                
                messageElement.appendChild(content);
                messages.appendChild(messageElement);
                
                // 更新最新消息时间戳
                if (message.timestamp > latestTimestamp) {
                    latestTimestamp = message.timestamp;
                }
            });
            
            // 更新最后一条消息的时间戳
            if (latestTimestamp > 0) {
                lastMessageTimestamps[currentChat] = latestTimestamp;
            }
            
            // 只有在用户没有手动滚动或者之前在底部时才自动滚动到底部
            if (!userScrolled || wasAtBottom) {
                messages.scrollTop = messages.scrollHeight;
            } else {
                // 保持相对滚动位置
                const newScrollHeight = messages.scrollHeight;
                messages.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
            }
        }
    } catch (error) {
        console.error('加载消息失败');
    }
}

// 发送消息
sendMessage.addEventListener('click', async () => {
    if (!currentChat) {
        alert('请先选择聊天对象');
        return;
    }

    const content = messageText.value.trim();
    if (!content) {
        alert('请输入消息内容');
        return;
    }

    try {
        if (currentChat.startsWith('group_')) {
            // 发送群组消息
            const groupId = currentChat.replace('group_', '');
            await sendGroupMessage(groupId, content);
        } else {
            // 发送私聊消息
            const response = await fetch('api/friends.php?action=send_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: currentUser,
                    to: currentChat,
                    content: content
                })
            });
            const data = await response.json();
            if (data.success) {
                messageText.value = '';
                loadMessages();
                userScrolled = false; // 发送消息后重置滚动标志，确保滚动到底部
            }
        }
    } catch (error) {
        alert('发送消息失败，请稍后重试');
    }
});

// 检查所有好友和群组的新消息
async function checkNewMessages() {
    try {
        // 检查好友消息
        const friendsResponse = await fetch('api/friends.php?action=get_friends', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: currentUser
            })
        });
        
        const friendsData = await friendsResponse.json();
        if (friendsData.success) {
            // 对每个好友检查是否有新消息
            for (const friend of friendsData.friends) {
                const msgResponse = await fetch('api/friends.php?action=get_messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user1: currentUser,
                        user2: friend
                    })
                });
                
                const msgData = await msgResponse.json();
                if (msgData.success && msgData.messages.length > 0) {
                    // 获取最新的消息
                    const latestMessage = msgData.messages[msgData.messages.length - 1];
                    
                    // 创建一个唯一的消息ID
                    const messageId = `${latestMessage.from}_${latestMessage.to}_${latestMessage.timestamp}`;
                    
                    // 检查是否是新消息且不是自己发送的
                    if (latestMessage.from !== currentUser && 
                        (!lastMessageTimestamps[friend] || latestMessage.timestamp > lastMessageTimestamps[friend])) {
                        // 更新时间戳
                        lastMessageTimestamps[friend] = latestMessage.timestamp;
                        
                        // 显示通知（带上消息ID）
                        showMessageNotification(friend, latestMessage.content, messageId);
                    }
                }
            }
        }

        // 检查群组消息
        const groupsResponse = await fetch('api/groups.php?action=get_groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: currentUser
            })
        });

        const groupsData = await groupsResponse.json();
        if (groupsData.success) {
            // 对每个群组检查是否有新消息
            for (const group of groupsData.groups) {
                const groupId = group.group_id;
                const groupName = group.group_name;
                const msgResponse = await fetch('api/groups.php?action=get_group_messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        group_id: groupId
                    })
                });
                
                const msgData = await msgResponse.json();
                if (msgData.success && msgData.messages.length > 0) {
                    // 获取最新的消息
                    const latestMessage = msgData.messages[msgData.messages.length - 1];
                    
                    // 创建一个唯一的消息ID
                    const messageId = `group_${groupId}_${latestMessage.from}_${latestMessage.timestamp}`;
                    
                    // 检查是否是新消息且不是自己发送的
                    if (latestMessage.from !== currentUser && 
                        (!lastMessageTimestamps[`group_${groupId}`] || latestMessage.timestamp > lastMessageTimestamps[`group_${groupId}`])) {
                        // 更新时间戳
                        lastMessageTimestamps[`group_${groupId}`] = latestMessage.timestamp;
                        
                        // 显示群组消息通知
                        showMessageNotification(groupName, `${latestMessage.from}: ${latestMessage.content}`, messageId);
                    }
                }
            }
        }
    } catch (error) {
        console.error('检查新消息失败:', error);
    }
}

// 消息轮询
function startMessagePolling() {
    // 如果已经有轮询在进行，先停止
    stopMessagePolling();
    
    messagePollingInterval = setInterval(() => {
        loadFriends();
        loadGroups(); // 加载群组列表
        if (currentChat) {
            loadMessages();
        } else {
            // 当没有选择聊天对象时，检查所有好友和群组的新消息
            checkNewMessages();
        }
    }, 3000); // 增加轮询间隔到3秒，减少重复通知的可能性
}

function stopMessagePolling() {
    if (messagePollingInterval) {
        clearInterval(messagePollingInterval);
        messagePollingInterval = null;
    }
}

// 按回车发送消息
messageText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage.click();
    }
});

// 修复移动端触摸事件
document.addEventListener('touchstart', function() {}, {passive: true});

// 加载所有用户
async function loadAllUsers() {
    try {
        const response = await fetch('api/friends.php?action=get_all_users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: currentUser
            })
        });

        const data = await response.json();
        if (data.success) {
            const usersList = document.createElement('div');
            usersList.className = 'users-list';
            
            if (data.users.length === 0) {
                usersList.style.display = 'none';
            } else {
                usersList.innerHTML = '<h3>可添加的用户</h3>';
                data.users.forEach(user => {
                    const userItem = document.createElement('div');
                    userItem.className = 'user-item';
                    userItem.innerHTML = `
                        <span>${user}</span>
                        <i class="fas fa-user-plus add-friend-icon"></i>
                    `;
                    userItem.addEventListener('click', () => addFriendDirectly(user));
                    usersList.appendChild(userItem);
                });
            }
            
            // 替换原有的添加好友输入框
            const friendActions = document.querySelector('.friend-actions');
            // 保留好友请求部分
            const friendRequests = document.getElementById('friend-requests');
            friendActions.innerHTML = '';
            friendActions.appendChild(usersList);
            if (friendRequests) {
                friendActions.appendChild(friendRequests);
            } else {
                const requestsDiv = document.createElement('div');
                requestsDiv.id = 'friend-requests';
                requestsDiv.className = 'friend-requests';
                requestsDiv.innerHTML = '<h3>好友请求</h3><div id="friend-requests-list"></div>';
                friendActions.appendChild(requestsDiv);
            }
            
            // 加载好友请求
            loadFriendRequests();
        }
    } catch (error) {
        console.error('加载用户列表失败:', error);
    }
}

// 直接添加好友（发送好友请求）
async function addFriendDirectly(friendUsername) {
    try {
        const response = await fetch('api/friends.php?action=add_friend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: currentUser,
                friend_username: friendUsername
            })
        });
        const data = await response.json();
        alert(data.message);
        if (data.success) {
            loadFriends();
            loadAllUsers();
        }
    } catch (error) {
        alert('添加好友失败，请稍后重试');
    }
}

// 监听页面可见性变化
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        // 页面变为可见时，立即检查新消息
        if (currentChat) {
            loadMessages();
        } else {
            checkNewMessages();
        }
    }
});

// 初始化群组功能
function initGroupFeatures() {
    const createGroupBtn = document.getElementById('create-group-btn');
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', showCreateGroupDialog);
    }
}

// 修改发送消息事件处理 - 移除重复的事件监听器

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    checkAutoLogin();
    setupMobileUI();
    initGroupFeatures();
});