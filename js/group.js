// 群组相关功能

// 创建群组表单HTML
const createGroupFormHTML = `
    <div class="form-container">
        <h2>创建群聊</h2>
        <form id="create-group-form">
            <input type="text" id="group-name" placeholder="群组名称" required>
            <div class="friend-selector">
                <h3>选择群成员</h3>
                <div id="friend-checkboxes"></div>
            </div>
            <button type="submit">创建群组</button>
            <button type="button" id="cancel-create-group">取消</button>
        </form>
    </div>
`;

// 创建群组对话框
function showCreateGroupDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.innerHTML = createGroupFormHTML;
    document.body.appendChild(dialog);

    // 加载好友列表到复选框
    loadFriendsForGroupCreation();

    // 绑定表单提交事件
    const form = document.getElementById('create-group-form');
    form.addEventListener('submit', handleCreateGroup);

    // 绑定取消按钮事件
    const cancelBtn = document.getElementById('cancel-create-group');
    cancelBtn.addEventListener('click', () => {
        dialog.remove();
    });
}

// 加载好友列表到群组创建表单
async function loadFriendsForGroupCreation() {
    try {
        const response = await fetch('api/friends.php?action=get_friends', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: currentUser
            })
        });

        const data = await response.json();
        const friendCheckboxes = document.getElementById('friend-checkboxes');
        const friendSelector = document.querySelector('.friend-selector');
        
        if (data.friends.length === 0) {
            friendSelector.classList.remove('has-friends');
            friendCheckboxes.innerHTML = '<p>暂无好友可选择</p>';
            return;
        }
        
        friendSelector.classList.add('has-friends');

        data.friends.forEach(friend => {
            const checkbox = document.createElement('div');
            checkbox.className = 'friend-checkbox';
            checkbox.innerHTML = `
                <input type="checkbox" id="friend-${friend}" value="${friend}">
                <label for="friend-${friend}">${friend}</label>
            `;
            friendCheckboxes.appendChild(checkbox);
        });
    } catch (error) {
        console.error('加载好友列表失败:', error);
    }
}

// 处理创建群组
async function handleCreateGroup(e) {
    e.preventDefault();
    
    const groupName = document.getElementById('group-name').value.trim();
    const selectedFriends = Array.from(document.querySelectorAll('#friend-checkboxes input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);

    if (!groupName) {
        alert('请输入群组名称');
        return;
    }

    if (selectedFriends.length === 0) {
        alert('请至少选择一个群成员');
        return;
    }

    try {
        // 创建群组
        const createResponse = await fetch('api/groups.php?action=create_group', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                creator: currentUser,
                group_name: groupName
            })
        });

        const createData = await createResponse.json();
        
        if (createData.success) {
            // 邀请选中的好友加入群组
            for (const friend of selectedFriends) {
                await fetch('api/groups.php?action=join_group', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: friend,
                        group_id: createData.group_id
                    })
                });
            }

            alert('群组创建成功');
            document.querySelector('.dialog-overlay').remove();
            loadGroups(); // 重新加载群组列表
        } else {
            alert(createData.message);
        }
    } catch (error) {
        console.error('创建群组失败:', error);
        alert('创建群组失败，请稍后重试');
    }
}

// 加载用户的群组列表
async function loadGroups() {
    try {
        const response = await fetch('api/groups.php?action=get_groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: currentUser
            })
        });

        const data = await response.json();
        const groupList = document.getElementById('group-list');
        
        if (!groupList) return;
        
        groupList.innerHTML = '<h3>群聊列表</h3>';
        
        if (data.groups.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = '<i class="fas fa-users"></i><p>暂无群聊</p>';
            groupList.appendChild(emptyState);
        } else {
            data.groups.forEach(group => {
                const groupItem = document.createElement('div');
                groupItem.className = 'group-item group';
                if (currentChat === `group_${group.group_id}`) {
                    groupItem.classList.add('active');
                }
                groupItem.textContent = group.group_name;
                groupItem.addEventListener('click', () => selectGroup(group.group_id, group.group_name));
                groupList.appendChild(groupItem);
            });
        }
    } catch (error) {
        console.error('加载群组列表失败:', error);
    }
}

// 选择群组聊天
function selectGroup(groupId, groupName) {
    currentChat = `group_${groupId}`;
    chatWith.textContent = groupName;
    document.querySelectorAll('.group-item').forEach(item => {
        item.classList.remove('active');
        if (item.textContent === groupName) {
            item.classList.add('active');
        }
    });
    loadGroupMessages(groupId);
    userScrolled = false;

    if (isMobile) {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        if (mobileBack) {
            mobileBack.style.display = 'block';
        }
    }
}

// 加载群组消息
async function loadGroupMessages(groupId) {
    try {
        const response = await fetch('api/groups.php?action=get_group_messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                group_id: groupId
            })
        });

        const data = await response.json();
        if (data.success) {
            messages.innerHTML = '';
            data.messages.forEach(message => {
                const messageElement = document.createElement('div');
                messageElement.className = `message ${message.from === currentUser ? 'sent' : 'received'}`;
                
                const content = document.createElement('div');
                content.className = 'message-content';
                content.innerHTML = `<span class="message-sender">${message.from}</span>${message.content}`;
                
                messageElement.appendChild(content);
                messages.appendChild(messageElement);
            });

            if (!userScrolled) {
                messages.scrollTop = messages.scrollHeight;
            }
        }
    } catch (error) {
        console.error('加载群组消息失败:', error);
    }
}

// 发送群组消息
async function sendGroupMessage(groupId, content) {
    try {
        const response = await fetch('api/groups.php?action=send_group_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: currentUser,
                group_id: groupId,
                content: content
            })
        });

        const data = await response.json();
        if (data.success) {
            messageText.value = '';
            loadGroupMessages(groupId);
            userScrolled = false;
        }
    } catch (error) {
        alert('发送消息失败，请稍后重试');
    }
}