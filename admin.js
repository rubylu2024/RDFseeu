// 从localStorage获取用户数据
const users = [
    { username: 'admin', password: 'admin123', role: 'admin' }
];

// 普通用户账号
const normalUsers = [
    { username: 'editor', password: 'editor123', role: 'user' }
];

// 从localStorage获取帖子数据
let posts = JSON.parse(localStorage.getItem('forumPosts')) || [
    {
        id: 1,
        title: '《逃离方块》系列全攻略',
        author: '解谜大师',
        date: '2026-04-15',
        views: 1234,
        content: '欢迎阅读《逃离方块》系列的全攻略...'
    },
    {
        id: 2,
        title: '推荐几款适合新手的解密游戏',
        author: '游戏达人',
        date: '2026-04-14',
        views: 876,
        content: '对于刚接触解密游戏的玩家来说...'
    },
    {
        id: 3,
        title: '解密游戏中的常见谜题类型',
        author: '谜题分析师',
        date: '2026-04-13',
        views: 654,
        content: '解密游戏中包含各种类型的谜题...'
    }
];

// 从localStorage获取用户数据
let forumUsers = JSON.parse(localStorage.getItem('adminForumUsers')) || [
    { id: 1, username: '解谜大师', email: 'master@example.com', joinDate: '2026-01-01' },
    { id: 2, username: '游戏达人', email: 'gamer@example.com', joinDate: '2026-01-05' },
    { id: 3, username: '谜题分析师', email: 'analyst@example.com', joinDate: '2026-01-10' }
];

// 保存帖子数据到localStorage
function savePosts() {
    localStorage.setItem('forumPosts', JSON.stringify(posts));
}

// 保存用户数据到localStorage
function saveUsers() {
    localStorage.setItem('adminForumUsers', JSON.stringify(forumUsers));
}

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', function() {
    // 检查是否是登录页面
    if (window.location.pathname.includes('admin.html')) {
        setupLoginForm();
    }
    // 检查是否是管理页面
    else if (window.location.pathname.includes('admin-dashboard.html')) {
        checkLoginStatus();
        setupDashboard();
    }
});

// 设置登录表单
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('login-error');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // 验证用户
            const user = users.find(u => u.username === username && u.password === password);
            
            if (user) {
                // 存储登录状态
                localStorage.setItem('loggedIn', 'true');
                localStorage.setItem('user', JSON.stringify(user));
                
                // 跳转到管理面板
                window.location.href = 'admin-dashboard.html';
            } else {
                // 显示错误信息
                errorMessage.textContent = '用户名或密码错误';
                errorMessage.style.display = 'block';
            }
        });
    }
}

// 检查登录状态
function checkLoginStatus() {
    const loggedIn = localStorage.getItem('loggedIn');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!loggedIn || !user || user.role !== 'admin') {
        // 未登录或不是管理员，跳转到登录页面
        window.location.href = 'admin.html';
    }
}

// 设置管理面板
function setupDashboard() {
    // 显示用户信息
    displayUserInfo();
    
    // 绑定退出登录按钮
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('loggedIn');
            localStorage.removeItem('user');
            window.location.href = '../frontend/index.html';
        });
    }
    
    // 加载帖子列表
    loadPosts();
    
    // 加载用户列表
    loadUsers();
    
    // 绑定添加帖子按钮
    const addPostBtn = document.getElementById('add-post-btn');
    if (addPostBtn) {
        addPostBtn.addEventListener('click', function() {
            document.getElementById('post-form').style.display = 'block';
        });
    }
    
    // 绑定帖子表单提交
    const postForm = document.getElementById('post-form');
    if (postForm) {
        postForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const title = document.getElementById('post-title').value;
            const content = document.getElementById('post-content').value;
            const author = document.getElementById('post-author').value;
            
            // 创建新帖子
            const newPost = {
                id: posts.length + 1,
                title: title,
                author: author,
                date: new Date().toISOString().split('T')[0],
                views: 0,
                content: content
            };
            
            // 添加到帖子列表
            posts.push(newPost);
            
            // 保存数据到localStorage
            savePosts();
            
            // 重新加载帖子列表
            loadPosts();
            
            // 重置表单
            postForm.reset();
            postForm.style.display = 'none';
        });
    }
}

// 显示用户信息
function displayUserInfo() {
    const userInfo = document.querySelector('.user-info');
    if (userInfo) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            userInfo.innerHTML = `
                <span>欢迎, ${user.username}</span>
                <button class="logout-btn">退出登录</button>
            `;
        }
    }
}

// 加载帖子列表
function loadPosts() {
    const postsContainer = document.getElementById('posts-container');
    if (postsContainer) {
        let postsHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>标题</th>
                        <th>作者</th>
                        <th>发布日期</th>
                        <th>浏览量</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        posts.forEach(post => {
            postsHTML += `
                <tr>
                    <td>${post.id}</td>
                    <td>${post.title}</td>
                    <td>${post.author}</td>
                    <td>${post.date}</td>
                    <td>${post.views}</td>
                    <td>
                        <button class="btn btn-primary" onclick="editPost(${post.id})">编辑</button>
                        <button class="btn btn-danger" onclick="deletePost(${post.id})">删除</button>
                    </td>
                </tr>
            `;
        });
        
        postsHTML += `
                </tbody>
            </table>
        `;
        
        postsContainer.innerHTML = postsHTML;
    }
}

// 加载用户列表
function loadUsers() {
    const usersContainer = document.getElementById('users-container');
    if (usersContainer) {
        let usersHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>用户名</th>
                        <th>邮箱</th>
                        <th>注册日期</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        forumUsers.forEach(user => {
            usersHTML += `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${user.joinDate}</td>
                    <td>
                        <button class="btn btn-primary" onclick="editUser(${user.id})">编辑</button>
                        <button class="btn btn-danger" onclick="deleteUser(${user.id})">删除</button>
                    </td>
                </tr>
            `;
        });
        
        usersHTML += `
                </tbody>
            </table>
        `;
        
        usersContainer.innerHTML = usersHTML;
    }
}

// 编辑帖子
function editPost(id) {
    const post = posts.find(p => p.id === id);
    if (post) {
        alert(`编辑帖子: ${post.title}`);
        // 这里可以实现编辑功能
    }
}

// 删除帖子
function deletePost(id) {
    if (confirm('确定要删除这篇帖子吗？')) {
        // 删除帖子
        posts = posts.filter(p => p.id !== id);
        savePosts();
        
        // 删除对应的评论
        localStorage.removeItem(`post_${id}_comments`);
        
        // 重新加载帖子列表
        loadPosts();
    }
}

// 编辑用户
function editUser(id) {
    const user = forumUsers.find(u => u.id === id);
    if (user) {
        alert(`编辑用户: ${user.username}`);
        // 这里可以实现编辑功能
    }
}

// 删除用户
function deleteUser(id) {
    if (confirm('确定要删除这个用户吗？')) {
        forumUsers = forumUsers.filter(u => u.id !== id);
        saveUsers();
        loadUsers();
    }
}