<<<<<<< HEAD
// 从localStorage获取帖子数据
let posts = JSON.parse(localStorage.getItem('forumPosts')) || [
    {
        id: 1,
        title: '《逃离方块》系列全攻略',
        author: '解谜大师',
        date: '2026-04-15',
        views: 1234,
        content: `欢迎阅读《逃离方块》系列的全攻略。本攻略将为你提供详细的通关步骤和技巧，帮助你顺利完成整个系列的游戏。

<h3>游戏简介</h3>
<p>《逃离方块》是一款由Rusty Lake开发的解谜游戏系列，以其独特的艺术风格和烧脑的谜题设计而闻名。整个系列包含多个独立但相互关联的游戏，讲述了一个关于家族、时间和神秘力量的故事。</p>

<h3>通关技巧</h3>
<ol>
    <li>仔细观察环境中的每一个细节</li>
    <li>收集所有可交互的物品</li>
    <li>尝试将不同物品组合使用</li>
    <li>注意游戏中的线索和提示</li>
    <li>保持耐心，有时候需要尝试多种组合</li>
</ol>

<h3>常见谜题解法</h3>
<p>在《逃离方块》系列中，常见的谜题类型包括：</p>
<ul>
    <li>物品组合谜题</li>
    <li>密码解锁谜题</li>
    <li>机关操作谜题</li>
    <li>视觉错觉谜题</li>
    <li>逻辑推理谜题</li>
</ul>

<p>希望本攻略对你有所帮助，祝你游戏愉快！`
    },
    {
        id: 2,
        title: '推荐几款适合新手的解密游戏',
        author: '游戏达人',
        date: '2026-04-14',
        views: 876,
        content: `对于刚接触解密游戏的玩家来说，选择一款难度适中的游戏非常重要。以下是几款适合新手的解密游戏推荐：

<h3>1. 《纪念碑谷》</h3>
<p>这款游戏以其精美的视觉设计和简单而巧妙的谜题而闻名。玩家需要引导主角通过各种光学错觉和几何谜题，游戏难度适中，非常适合新手。</p>

<h3>2. 《未上锁的房间》</h3>
<p>这是一款3D密室逃脱游戏，玩家需要在房间中寻找线索，解开各种机关。游戏有提示系统，即使是新手也能享受解谜的乐趣。</p>

<h3>3. 《LIMBO》</h3>
<p>虽然这款游戏有一定的难度，但它的操作简单，谜题设计精巧，而且游戏氛围非常独特，适合新手尝试。</p>

<h3>4. 《机械迷城》</h3>
<p>这款游戏以其独特的手绘风格和有趣的谜题而受到玩家喜爱。游戏中的谜题逻辑清晰，适合新手逐步掌握解谜技巧。</p>

<h3>5. 《绣湖：根源》</h3>
<p>这是《逃离方块》系列的一款作品，虽然有一定的难度，但游戏中的线索设计合理，适合新手挑战。</p>

<p>希望这些推荐对新手有所帮助，祝大家游戏愉快！`
    },
    {
        id: 3,
        title: '解密游戏中的常见谜题类型',
        author: '谜题分析师',
        date: '2026-04-13',
        views: 654,
        content: `解密游戏中包含各种类型的谜题，了解这些谜题类型可以帮助玩家更好地解决它们。以下是解密游戏中常见的谜题类型：

<h3>1. 物品组合谜题</h3>
<p>这类谜题要求玩家将不同的物品组合在一起，形成新的物品或解决问题。例如，将钥匙和锁组合在一起打开门。</p>

<h3>2. 密码解锁谜题</h3>
<p>这类谜题要求玩家找到密码或解锁码，通常需要通过环境中的线索来获取。密码可以是数字、字母或符号的组合。</p>

<h3>3. 机关操作谜题</h3>
<p>这类谜题要求玩家操作机关，例如转动齿轮、按下按钮或调整杠杆，以解决谜题。</p>

<h3>4. 视觉错觉谜题</h3>
<p>这类谜题利用视觉错觉来欺骗玩家，要求玩家从不同的角度观察或思考问题。例如，《纪念碑谷》中的许多谜题都属于这类。</p>

<h3>5. 逻辑推理谜题</h3>
<p>这类谜题要求玩家通过逻辑推理来解决问题，例如数独、拼图或推理游戏中的谜题。</p>

<h3>6. 时间谜题</h3>
<p>这类谜题与时间有关，要求玩家在特定的时间内完成任务，或通过调整时间来解决问题。</p>

<h3>7. 声音谜题</h3>
<p>这类谜题利用声音作为线索，要求玩家通过听声音来解决问题。</p>

<p>了解这些谜题类型可以帮助玩家更好地理解游戏中的挑战，提高解谜能力。`
    },
    {
        id: 4,
        title: '《未上锁的房间》系列谜题分析',
        author: '解谜爱好者',
        date: '2026-04-16',
        views: 987,
        content: `《未上锁的房间》是一款备受欢迎的密室逃脱游戏系列，以其精美的3D画面和巧妙的谜题设计而闻名。以下是对该系列谜题的分析：

<h3>谜题设计特点</h3>
<p>1. **3D环境交互**：游戏充分利用了3D环境，玩家可以旋转、缩放和检查各种物品，增加了游戏的沉浸感。</p>
<p>2. **多层次谜题**：游戏中的谜题通常由多个层次组成，需要玩家逐步解决才能前进。</p>
<p>3. **机械美学**：游戏中的谜题多以机械装置为主题，齿轮、杠杆、锁等元素频繁出现，营造出一种复古的工业美感。</p>
<p>4. **线索隐藏**：线索通常隐藏在环境中，需要玩家仔细观察才能发现。</p>

<h3>常见谜题类型</h3>
<ol>
    <li>**机械装置谜题**：需要玩家操作齿轮、杠杆等机械部件来解决。</li>
    <li>**密码锁谜题**：需要找到密码或解锁码来打开锁。</li>
    <li>**物品组合谜题**：需要将不同的物品组合在一起。</li>
    <li>**空间谜题**：需要玩家理解空间关系来解决。</li>
    <li>**光影谜题**：利用光线和阴影作为线索。</li>
</ol>

<h3>解谜技巧</h3>
<p>1. **仔细观察**：游戏中的线索往往隐藏在细节中，需要玩家仔细观察环境。</p>
<p>2. **尝试交互**：不要放过任何可交互的物品，即使它们看起来无关紧要。</p>
<p>3. **保持耐心**：有些谜题可能需要多次尝试才能解决，保持耐心是关键。</p>
<p>4. **利用提示**：如果实在无法解决，可以使用游戏中的提示系统。</p>

<p>《未上锁的房间》系列是解密游戏中的经典之作，其谜题设计值得玩家细细品味。`
    },
    {
        id: 5,
        title: '《纪念碑谷》中的视觉谜题',
        author: '视觉艺术师',
        date: '2026-04-15',
        views: 765,
        content: `《纪念碑谷》是一款以视觉错觉为核心的解密游戏，其独特的艺术风格和巧妙的谜题设计使其成为解密游戏中的经典之作。以下是对游戏中视觉谜题的分析：

<h3>视觉错觉原理</h3>
<p>游戏利用了多种视觉错觉原理，包括：</p>
<ol>
    <li>**彭罗斯三角形**：一种不可能存在的几何图形，在游戏中被用来创建看似不可能的路径。</li>
    <li>**埃舍尔风格**：借鉴了荷兰艺术家埃舍尔的作品风格，通过视觉错觉创造出循环和矛盾的空间。</li>
    <li>**透视错觉**：通过调整视角，使不同位置的平台连接在一起。</li>
    <li>**颜色和光影**：利用颜色和光影来引导玩家的注意力，创造出深度感。</li>
</ol>

<h3>谜题设计特点</h3>
<p>1. **简单而优雅**：游戏中的谜题设计简单明了，但却非常巧妙，玩家需要通过调整视角来找到正确的路径。</p>
<p>2. **视觉引导**：游戏通过颜色、光影和动画来引导玩家，减少了文字提示的使用。</p>
<p>3. **循序渐进**：游戏的难度逐渐增加，从简单的视角调整到复杂的空间转换。</p>
<p>4. **艺术与游戏的结合**：游戏的每一个场景都像是一幅精美的艺术品，同时也是一个需要解决的谜题。</p>

<h3>游戏体验</h3>
<p>《纪念碑谷》的视觉谜题不仅考验玩家的空间思维能力，也为玩家带来了独特的视觉享受。游戏中的每一个场景都经过精心设计，玩家在解谜的过程中也能欣赏到美丽的画面。</p>

<p>这种将艺术与游戏相结合的方式，使得《纪念碑谷》成为了一款独特的解密游戏，值得每一位解密游戏爱好者体验。`
    },
    {
        id: 6,
        title: '《Limbo》通关技巧分享',
        author: '游戏专家',
        date: '2026-04-14',
        views: 543,
        content: `《Limbo》是一款黑白风格的解密平台游戏，以其独特的氛围和具有挑战性的谜题而闻名。以下是一些通关技巧分享：

<h3>游戏特点</h3>
<p>1. **黑白风格**：游戏采用黑白风格，营造出一种阴暗、压抑的氛围。</p>
<p>2. **物理引擎**：游戏中的谜题大多基于物理原理，需要玩家理解物体的运动规律。</p>
<p>3. **平台跳跃**：游戏包含大量的平台跳跃元素，需要玩家掌握精确的时机。</p>
<p>4. **死亡机制**：玩家角色很容易死亡，但游戏会立即在最近的 checkpoint 重新开始，鼓励玩家不断尝试。</p>

<h3>通关技巧</h3>
<ol>
    <li>**观察环境**：游戏中的线索往往隐藏在环境中，需要玩家仔细观察。</li>
    <li>**利用物理**：许多谜题需要玩家利用物理原理，例如重力、惯性等。</li>
    <li>**尝试不同方法**：如果一种方法行不通，尝试从不同的角度思考问题。</li>
    <li>**注意细节**：游戏中的一些细节，如声音、动画等，可能包含重要线索。</li>
    <li>**保持耐心**：有些谜题可能需要多次尝试才能解决，保持耐心是关键。</li>
</ol>

<h3>常见难点</h3>
<p>1. **蜘蛛关卡**：这是游戏中最具挑战性的关卡之一，需要玩家掌握精确的时机来躲避蜘蛛的攻击。</p>
<p>2. **重力翻转**：游戏后期会出现重力翻转的机制，需要玩家适应新的操作方式。</p>
<p>3. **限时挑战**：有些关卡需要玩家在有限的时间内完成任务，增加了游戏的紧张感。</p>

<p>《Limbo》是一款非常具有挑战性的解密游戏，但其独特的氛围和巧妙的谜题设计使其成为了一款经典之作。希望这些技巧能帮助你顺利通关！`
    },
    {
        id: 7,
        title: '2026年必玩的解密游戏',
        author: '游戏评论家',
        date: '2026-04-13',
        views: 1098,
        content: `2026年已经过去了几个月，游戏市场上已经出现了一些优秀的解密游戏。以下是2026年必玩的解密游戏推荐：

<h3>1. 《绣湖：悖论2》</h3>
<p>作为《绣湖》系列的最新作品，《绣湖：悖论2》延续了系列的黑暗风格和烧脑谜题。游戏讲述了一个关于家族、时间和神秘力量的故事，谜题设计更加复杂，剧情更加深入。</p>

<h3>2. 《未上锁的房间5》</h3>
<p>《未上锁的房间》系列的第五部作品，继续以精美的3D画面和巧妙的机械谜题为特色。游戏增加了新的谜题类型和交互方式，为玩家带来全新的解谜体验。</p>

<h3>3. 《纪念碑谷3》</h3>
<p>《纪念碑谷》系列的第三部作品，继续以其独特的视觉错觉谜题和精美的艺术风格而闻名。游戏引入了新的游戏机制和场景，为玩家带来更加丰富的解谜体验。</p>

<h3>4. 《Inside 2》</h3>
<p>作为《Limbo》开发商的最新作品，《Inside 2》延续了前作的黑白风格和压抑氛围，同时增加了新的游戏机制和谜题类型。游戏的剧情更加深入，结局更加令人深思。</p>

<h3>5. 《Return of the Obra Dinn》续作</h3>
<p>这款游戏是《Return of the Obra Dinn》的续作，继续以其独特的推理机制和复古的视觉风格为特色。玩家需要通过观察和推理来解决谜题，揭开事件的真相。</p>

<h3>6. 《The Witness》精神续作</h3>
<p>这款游戏是《The Witness》的精神续作，继续以其开放世界和丰富的谜题设计为特色。游戏中的谜题更加多样化，需要玩家运用不同的思维方式来解决。</p>

<p>这些游戏都具有独特的风格和巧妙的谜题设计，值得每一位解密游戏爱好者体验。`
    }
];

// 保存帖子数据到localStorage
function savePosts() {
    localStorage.setItem('forumPosts', JSON.stringify(posts));
}

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', function() {
    // 检查是否是帖子详情页面
    if (window.location.pathname.includes('post.html')) {
        loadPostDetails();
        setupCommentForm();
    }
    
    // 平滑滚动效果
    setupSmoothScroll();
    
    // 浮窗广告
    setupFloatingAd();
    
    // 右下角弹窗广告
    setupPopupAd();
    
    // 布局切换功能
    setupLayoutToggle();
    
    // 检查用户的布局偏好
    checkLayoutPreference();
    
    // 更新用户导航链接
    updateUserLinks();
});

// 更新用户导航链接
function updateUserLinks() {
    const userLinksContainer = document.getElementById('user-links-container');
    if (userLinksContainer) {
        const userLoggedIn = localStorage.getItem('userLoggedIn');
        
        if (userLoggedIn) {
            // 用户已登录，显示个人资料和退出登录链接
            userLinksContainer.innerHTML = `
                <a href="profile.html">个人资料</a>
                <a href="#" id="logout-btn">退出登录</a>
            `;
            
            // 绑定退出登录按钮
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // 清除登录状态
                    localStorage.removeItem('userLoggedIn');
                    localStorage.removeItem('currentUser');
                    
                    // 跳转到首页
                    window.location.href = 'index.html';
                });
            }
        } else {
            // 用户未登录，显示登录和注册链接
            userLinksContainer.innerHTML = `
                <a href="user-login.html">登录</a>
                <a href="register.html">注册</a>
            `;
        }
    }
}

// 设置布局切换功能
function setupLayoutToggle() {
    const mobileToggle = document.getElementById('mobile-toggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 切换到手机版布局
            document.body.classList.add('mobile-layout');
            localStorage.setItem('layoutPreference', 'mobile');
            
            // 添加电脑版切换按钮
            addDesktopToggle();
        });
    }
}

// 添加电脑版切换按钮
function addDesktopToggle() {
    // 检查是否已经存在电脑版切换按钮
    if (!document.getElementById('desktop-toggle')) {
        const userLinks = document.querySelector('.user-links');
        if (userLinks) {
            const desktopToggle = document.createElement('a');
            desktopToggle.id = 'desktop-toggle';
            desktopToggle.href = '#';
            desktopToggle.textContent = '电脑版';
            
            // 添加点击事件
            desktopToggle.addEventListener('click', function(e) {
                e.preventDefault();
                
                // 切换回电脑版布局
                document.body.classList.remove('mobile-layout');
                localStorage.removeItem('layoutPreference');
                
                // 移除电脑版切换按钮
                this.remove();
            });
            
            // 添加到用户链接区域
            userLinks.appendChild(desktopToggle);
        }
    }
}

// 检查用户的布局偏好
function checkLayoutPreference() {
    const layoutPreference = localStorage.getItem('layoutPreference');
    if (layoutPreference === 'mobile') {
        // 应用手机版布局
        document.body.classList.add('mobile-layout');
        
        // 添加电脑版切换按钮
        addDesktopToggle();
    }
}

// 加载帖子详情
function loadPostDetails() {
    // 获取URL参数中的帖子ID
    const urlParams = new URLSearchParams(window.location.search);
    const postId = parseInt(urlParams.get('id'));
    
    // 查找对应的帖子
    const post = posts.find(p => p.id === postId);
    
    if (post) {
        // 更新帖子标题
        document.getElementById('post-title').textContent = post.title;
        
        // 更新帖子元信息
        const postMeta = document.querySelector('.post-meta');
        postMeta.innerHTML = `
            <span>作者: ${post.author}</span>
            <span>发布于: ${post.date}</span>
            <span>浏览: ${post.views}</span>
        `;
        
        // 更新帖子内容
        const postContent = document.querySelector('.post-content');
        postContent.innerHTML = post.content;
        
        // 加载评论
        loadComments(postId);
    } else {
        // 如果找不到帖子，显示错误信息
        document.querySelector('.post-header h2').textContent = '帖子不存在';
        document.querySelector('.post-content').innerHTML = '<p>抱歉，您请求的帖子不存在。</p>';
    }
}

// 加载评论
function loadComments(postId) {
    const comments = JSON.parse(localStorage.getItem(`post_${postId}_comments`)) || [];
    const commentsList = document.querySelector('.comments-list');
    
    // 清空评论列表
    commentsList.innerHTML = '';
    
    // 添加评论到列表
    comments.forEach(comment => {
        const commentItem = document.createElement('div');
        commentItem.className = 'comment-item';
        commentItem.innerHTML = `
            <div class="comment-header">
                <span class="comment-author">${comment.name}</span>
                <span class="comment-date">${comment.date}</span>
            </div>
            <div class="comment-content">
                <p>${comment.content}</p>
            </div>
        `;
        commentsList.appendChild(commentItem);
    });
}

// 保存评论
function saveComment(postId, name, content) {
    // 获取当前日期
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    // 创建新评论
    const newComment = {
        name: name,
        content: content,
        date: dateString
    };
    
    // 从localStorage获取现有评论
    const comments = JSON.parse(localStorage.getItem(`post_${postId}_comments`)) || [];
    
    // 添加新评论
    comments.push(newComment);
    
    // 保存到localStorage
    localStorage.setItem(`post_${postId}_comments`, JSON.stringify(comments));
}

// 设置评论表单
function setupCommentForm() {
    const commentForm = document.querySelector('.comment-form form');
    
    if (commentForm) {
        commentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // 获取URL参数中的帖子ID
            const urlParams = new URLSearchParams(window.location.search);
            const postId = parseInt(urlParams.get('id'));
            
            // 获取表单数据
            const name = document.getElementById('name').value;
            const comment = document.getElementById('comment').value;
            
            // 保存评论
            saveComment(postId, name, comment);
            
            // 重新加载评论
            loadComments(postId);
            
            // 清空表单
            commentForm.reset();
            
            // 显示成功消息
            alert('评论发表成功！');
        });
    }
}

// 设置平滑滚动
function setupSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// 设置浮窗广告
function setupFloatingAd() {
    const ad = document.querySelector('.floating-ad');
    if (!ad) return;
    
    // 初始位置和速度
    let x = 100;
    let y = 100;
    let dx = 1;
    let dy = 1;
    
    // 动画函数
    function animate() {
        // 获取窗口尺寸
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const adWidth = ad.offsetWidth;
        const adHeight = ad.offsetHeight;
        
        // 检查边界碰撞
        if (x + adWidth >= windowWidth || x <= 0) {
            dx = -dx;
        }
        if (y + adHeight >= windowHeight || y <= 0) {
            dy = -dy;
        }
        
        // 更新位置
        x += dx;
        y += dy;
        
        // 应用位置
        ad.style.left = x + 'px';
        ad.style.top = y + 'px';
        
        // 继续动画
        requestAnimationFrame(animate);
    }
    
    // 开始动画
    animate();
}

// 设置右下角弹窗广告
function setupPopupAd() {
    const popupAd = document.querySelector('.popup-ad');
    if (!popupAd) return;
    
    // 关闭按钮功能
    const closeButton = popupAd.querySelector('.popup-close');
    closeButton.addEventListener('click', function() {
        popupAd.style.display = 'none';
        
        // 同时隐藏左侧的假关闭按钮
        const leftCloseBtn = document.querySelector('.left-close-btn');
        if (leftCloseBtn) {
            leftCloseBtn.style.display = 'none';
        }
    });
=======
// 从localStorage获取帖子数据
let posts = JSON.parse(localStorage.getItem('forumPosts')) || [
    {
        id: 1,
        title: '《逃离方块》系列全攻略',
        author: '解谜大师',
        date: '2026-04-15',
        views: 1234,
        content: `欢迎阅读《逃离方块》系列的全攻略。本攻略将为你提供详细的通关步骤和技巧，帮助你顺利完成整个系列的游戏。

<h3>游戏简介</h3>
<p>《逃离方块》是一款由Rusty Lake开发的解谜游戏系列，以其独特的艺术风格和烧脑的谜题设计而闻名。整个系列包含多个独立但相互关联的游戏，讲述了一个关于家族、时间和神秘力量的故事。</p>

<h3>通关技巧</h3>
<ol>
    <li>仔细观察环境中的每一个细节</li>
    <li>收集所有可交互的物品</li>
    <li>尝试将不同物品组合使用</li>
    <li>注意游戏中的线索和提示</li>
    <li>保持耐心，有时候需要尝试多种组合</li>
</ol>

<h3>常见谜题解法</h3>
<p>在《逃离方块》系列中，常见的谜题类型包括：</p>
<ul>
    <li>物品组合谜题</li>
    <li>密码解锁谜题</li>
    <li>机关操作谜题</li>
    <li>视觉错觉谜题</li>
    <li>逻辑推理谜题</li>
</ul>

<p>希望本攻略对你有所帮助，祝你游戏愉快！`
    },
    {
        id: 2,
        title: '推荐几款适合新手的解密游戏',
        author: '游戏达人',
        date: '2026-04-14',
        views: 876,
        content: `对于刚接触解密游戏的玩家来说，选择一款难度适中的游戏非常重要。以下是几款适合新手的解密游戏推荐：

<h3>1. 《纪念碑谷》</h3>
<p>这款游戏以其精美的视觉设计和简单而巧妙的谜题而闻名。玩家需要引导主角通过各种光学错觉和几何谜题，游戏难度适中，非常适合新手。</p>

<h3>2. 《未上锁的房间》</h3>
<p>这是一款3D密室逃脱游戏，玩家需要在房间中寻找线索，解开各种机关。游戏有提示系统，即使是新手也能享受解谜的乐趣。</p>

<h3>3. 《LIMBO》</h3>
<p>虽然这款游戏有一定的难度，但它的操作简单，谜题设计精巧，而且游戏氛围非常独特，适合新手尝试。</p>

<h3>4. 《机械迷城》</h3>
<p>这款游戏以其独特的手绘风格和有趣的谜题而受到玩家喜爱。游戏中的谜题逻辑清晰，适合新手逐步掌握解谜技巧。</p>

<h3>5. 《绣湖：根源》</h3>
<p>这是《逃离方块》系列的一款作品，虽然有一定的难度，但游戏中的线索设计合理，适合新手挑战。</p>

<p>希望这些推荐对新手有所帮助，祝大家游戏愉快！`
    },
    {
        id: 3,
        title: '解密游戏中的常见谜题类型',
        author: '谜题分析师',
        date: '2026-04-13',
        views: 654,
        content: `解密游戏中包含各种类型的谜题，了解这些谜题类型可以帮助玩家更好地解决它们。以下是解密游戏中常见的谜题类型：

<h3>1. 物品组合谜题</h3>
<p>这类谜题要求玩家将不同的物品组合在一起，形成新的物品或解决问题。例如，将钥匙和锁组合在一起打开门。</p>

<h3>2. 密码解锁谜题</h3>
<p>这类谜题要求玩家找到密码或解锁码，通常需要通过环境中的线索来获取。密码可以是数字、字母或符号的组合。</p>

<h3>3. 机关操作谜题</h3>
<p>这类谜题要求玩家操作机关，例如转动齿轮、按下按钮或调整杠杆，以解决谜题。</p>

<h3>4. 视觉错觉谜题</h3>
<p>这类谜题利用视觉错觉来欺骗玩家，要求玩家从不同的角度观察或思考问题。例如，《纪念碑谷》中的许多谜题都属于这类。</p>

<h3>5. 逻辑推理谜题</h3>
<p>这类谜题要求玩家通过逻辑推理来解决问题，例如数独、拼图或推理游戏中的谜题。</p>

<h3>6. 时间谜题</h3>
<p>这类谜题与时间有关，要求玩家在特定的时间内完成任务，或通过调整时间来解决问题。</p>

<h3>7. 声音谜题</h3>
<p>这类谜题利用声音作为线索，要求玩家通过听声音来解决问题。</p>

<p>了解这些谜题类型可以帮助玩家更好地理解游戏中的挑战，提高解谜能力。`
    },
    {
        id: 4,
        title: '《未上锁的房间》系列谜题分析',
        author: '解谜爱好者',
        date: '2026-04-16',
        views: 987,
        content: `《未上锁的房间》是一款备受欢迎的密室逃脱游戏系列，以其精美的3D画面和巧妙的谜题设计而闻名。以下是对该系列谜题的分析：

<h3>谜题设计特点</h3>
<p>1. **3D环境交互**：游戏充分利用了3D环境，玩家可以旋转、缩放和检查各种物品，增加了游戏的沉浸感。</p>
<p>2. **多层次谜题**：游戏中的谜题通常由多个层次组成，需要玩家逐步解决才能前进。</p>
<p>3. **机械美学**：游戏中的谜题多以机械装置为主题，齿轮、杠杆、锁等元素频繁出现，营造出一种复古的工业美感。</p>
<p>4. **线索隐藏**：线索通常隐藏在环境中，需要玩家仔细观察才能发现。</p>

<h3>常见谜题类型</h3>
<ol>
    <li>**机械装置谜题**：需要玩家操作齿轮、杠杆等机械部件来解决。</li>
    <li>**密码锁谜题**：需要找到密码或解锁码来打开锁。</li>
    <li>**物品组合谜题**：需要将不同的物品组合在一起。</li>
    <li>**空间谜题**：需要玩家理解空间关系来解决。</li>
    <li>**光影谜题**：利用光线和阴影作为线索。</li>
</ol>

<h3>解谜技巧</h3>
<p>1. **仔细观察**：游戏中的线索往往隐藏在细节中，需要玩家仔细观察环境。</p>
<p>2. **尝试交互**：不要放过任何可交互的物品，即使它们看起来无关紧要。</p>
<p>3. **保持耐心**：有些谜题可能需要多次尝试才能解决，保持耐心是关键。</p>
<p>4. **利用提示**：如果实在无法解决，可以使用游戏中的提示系统。</p>

<p>《未上锁的房间》系列是解密游戏中的经典之作，其谜题设计值得玩家细细品味。`
    },
    {
        id: 5,
        title: '《纪念碑谷》中的视觉谜题',
        author: '视觉艺术师',
        date: '2026-04-15',
        views: 765,
        content: `《纪念碑谷》是一款以视觉错觉为核心的解密游戏，其独特的艺术风格和巧妙的谜题设计使其成为解密游戏中的经典之作。以下是对游戏中视觉谜题的分析：

<h3>视觉错觉原理</h3>
<p>游戏利用了多种视觉错觉原理，包括：</p>
<ol>
    <li>**彭罗斯三角形**：一种不可能存在的几何图形，在游戏中被用来创建看似不可能的路径。</li>
    <li>**埃舍尔风格**：借鉴了荷兰艺术家埃舍尔的作品风格，通过视觉错觉创造出循环和矛盾的空间。</li>
    <li>**透视错觉**：通过调整视角，使不同位置的平台连接在一起。</li>
    <li>**颜色和光影**：利用颜色和光影来引导玩家的注意力，创造出深度感。</li>
</ol>

<h3>谜题设计特点</h3>
<p>1. **简单而优雅**：游戏中的谜题设计简单明了，但却非常巧妙，玩家需要通过调整视角来找到正确的路径。</p>
<p>2. **视觉引导**：游戏通过颜色、光影和动画来引导玩家，减少了文字提示的使用。</p>
<p>3. **循序渐进**：游戏的难度逐渐增加，从简单的视角调整到复杂的空间转换。</p>
<p>4. **艺术与游戏的结合**：游戏的每一个场景都像是一幅精美的艺术品，同时也是一个需要解决的谜题。</p>

<h3>游戏体验</h3>
<p>《纪念碑谷》的视觉谜题不仅考验玩家的空间思维能力，也为玩家带来了独特的视觉享受。游戏中的每一个场景都经过精心设计，玩家在解谜的过程中也能欣赏到美丽的画面。</p>

<p>这种将艺术与游戏相结合的方式，使得《纪念碑谷》成为了一款独特的解密游戏，值得每一位解密游戏爱好者体验。`
    },
    {
        id: 6,
        title: '《Limbo》通关技巧分享',
        author: '游戏专家',
        date: '2026-04-14',
        views: 543,
        content: `《Limbo》是一款黑白风格的解密平台游戏，以其独特的氛围和具有挑战性的谜题而闻名。以下是一些通关技巧分享：

<h3>游戏特点</h3>
<p>1. **黑白风格**：游戏采用黑白风格，营造出一种阴暗、压抑的氛围。</p>
<p>2. **物理引擎**：游戏中的谜题大多基于物理原理，需要玩家理解物体的运动规律。</p>
<p>3. **平台跳跃**：游戏包含大量的平台跳跃元素，需要玩家掌握精确的时机。</p>
<p>4. **死亡机制**：玩家角色很容易死亡，但游戏会立即在最近的 checkpoint 重新开始，鼓励玩家不断尝试。</p>

<h3>通关技巧</h3>
<ol>
    <li>**观察环境**：游戏中的线索往往隐藏在环境中，需要玩家仔细观察。</li>
    <li>**利用物理**：许多谜题需要玩家利用物理原理，例如重力、惯性等。</li>
    <li>**尝试不同方法**：如果一种方法行不通，尝试从不同的角度思考问题。</li>
    <li>**注意细节**：游戏中的一些细节，如声音、动画等，可能包含重要线索。</li>
    <li>**保持耐心**：有些谜题可能需要多次尝试才能解决，保持耐心是关键。</li>
</ol>

<h3>常见难点</h3>
<p>1. **蜘蛛关卡**：这是游戏中最具挑战性的关卡之一，需要玩家掌握精确的时机来躲避蜘蛛的攻击。</p>
<p>2. **重力翻转**：游戏后期会出现重力翻转的机制，需要玩家适应新的操作方式。</p>
<p>3. **限时挑战**：有些关卡需要玩家在有限的时间内完成任务，增加了游戏的紧张感。</p>

<p>《Limbo》是一款非常具有挑战性的解密游戏，但其独特的氛围和巧妙的谜题设计使其成为了一款经典之作。希望这些技巧能帮助你顺利通关！`
    },
    {
        id: 7,
        title: '2026年必玩的解密游戏',
        author: '游戏评论家',
        date: '2026-04-13',
        views: 1098,
        content: `2026年已经过去了几个月，游戏市场上已经出现了一些优秀的解密游戏。以下是2026年必玩的解密游戏推荐：

<h3>1. 《绣湖：悖论2》</h3>
<p>作为《绣湖》系列的最新作品，《绣湖：悖论2》延续了系列的黑暗风格和烧脑谜题。游戏讲述了一个关于家族、时间和神秘力量的故事，谜题设计更加复杂，剧情更加深入。</p>

<h3>2. 《未上锁的房间5》</h3>
<p>《未上锁的房间》系列的第五部作品，继续以精美的3D画面和巧妙的机械谜题为特色。游戏增加了新的谜题类型和交互方式，为玩家带来全新的解谜体验。</p>

<h3>3. 《纪念碑谷3》</h3>
<p>《纪念碑谷》系列的第三部作品，继续以其独特的视觉错觉谜题和精美的艺术风格而闻名。游戏引入了新的游戏机制和场景，为玩家带来更加丰富的解谜体验。</p>

<h3>4. 《Inside 2》</h3>
<p>作为《Limbo》开发商的最新作品，《Inside 2》延续了前作的黑白风格和压抑氛围，同时增加了新的游戏机制和谜题类型。游戏的剧情更加深入，结局更加令人深思。</p>

<h3>5. 《Return of the Obra Dinn》续作</h3>
<p>这款游戏是《Return of the Obra Dinn》的续作，继续以其独特的推理机制和复古的视觉风格为特色。玩家需要通过观察和推理来解决谜题，揭开事件的真相。</p>

<h3>6. 《The Witness》精神续作</h3>
<p>这款游戏是《The Witness》的精神续作，继续以其开放世界和丰富的谜题设计为特色。游戏中的谜题更加多样化，需要玩家运用不同的思维方式来解决。</p>

<p>这些游戏都具有独特的风格和巧妙的谜题设计，值得每一位解密游戏爱好者体验。`
    }
];

// 保存帖子数据到localStorage
function savePosts() {
    localStorage.setItem('forumPosts', JSON.stringify(posts));
}

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', function() {
    // 检查是否是帖子详情页面
    if (window.location.pathname.includes('post.html')) {
        loadPostDetails();
        setupCommentForm();
    }
    
    // 平滑滚动效果
    setupSmoothScroll();
    
    // 浮窗广告
    setupFloatingAd();
    
    // 右下角弹窗广告
    setupPopupAd();
    
    // 布局切换功能
    setupLayoutToggle();
    
    // 检查用户的布局偏好
    checkLayoutPreference();
    
    // 更新用户导航链接
    updateUserLinks();
});

// 更新用户导航链接
function updateUserLinks() {
    const userLinksContainer = document.getElementById('user-links-container');
    if (userLinksContainer) {
        const userLoggedIn = localStorage.getItem('userLoggedIn');
        
        if (userLoggedIn) {
            // 用户已登录，显示个人资料和退出登录链接
            userLinksContainer.innerHTML = `
                <a href="profile.html">个人资料</a>
                <a href="#" id="logout-btn">退出登录</a>
            `;
            
            // 绑定退出登录按钮
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // 清除登录状态
                    localStorage.removeItem('userLoggedIn');
                    localStorage.removeItem('currentUser');
                    
                    // 跳转到首页
                    window.location.href = 'index.html';
                });
            }
        } else {
            // 用户未登录，显示登录和注册链接
            userLinksContainer.innerHTML = `
                <a href="user-login.html">登录</a>
                <a href="register.html">注册</a>
            `;
        }
    }
}

// 设置布局切换功能
function setupLayoutToggle() {
    const mobileToggle = document.getElementById('mobile-toggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 切换到手机版布局
            document.body.classList.add('mobile-layout');
            localStorage.setItem('layoutPreference', 'mobile');
            
            // 添加电脑版切换按钮
            addDesktopToggle();
        });
    }
}

// 添加电脑版切换按钮
function addDesktopToggle() {
    // 检查是否已经存在电脑版切换按钮
    if (!document.getElementById('desktop-toggle')) {
        const userLinks = document.querySelector('.user-links');
        if (userLinks) {
            const desktopToggle = document.createElement('a');
            desktopToggle.id = 'desktop-toggle';
            desktopToggle.href = '#';
            desktopToggle.textContent = '电脑版';
            
            // 添加点击事件
            desktopToggle.addEventListener('click', function(e) {
                e.preventDefault();
                
                // 切换回电脑版布局
                document.body.classList.remove('mobile-layout');
                localStorage.removeItem('layoutPreference');
                
                // 移除电脑版切换按钮
                this.remove();
            });
            
            // 添加到用户链接区域
            userLinks.appendChild(desktopToggle);
        }
    }
}

// 检查用户的布局偏好
function checkLayoutPreference() {
    const layoutPreference = localStorage.getItem('layoutPreference');
    if (layoutPreference === 'mobile') {
        // 应用手机版布局
        document.body.classList.add('mobile-layout');
        
        // 添加电脑版切换按钮
        addDesktopToggle();
    }
}

// 加载帖子详情
function loadPostDetails() {
    // 获取URL参数中的帖子ID
    const urlParams = new URLSearchParams(window.location.search);
    const postId = parseInt(urlParams.get('id'));
    
    // 查找对应的帖子
    const post = posts.find(p => p.id === postId);
    
    if (post) {
        // 更新帖子标题
        document.getElementById('post-title').textContent = post.title;
        
        // 更新帖子元信息
        const postMeta = document.querySelector('.post-meta');
        postMeta.innerHTML = `
            <span>作者: ${post.author}</span>
            <span>发布于: ${post.date}</span>
            <span>浏览: ${post.views}</span>
        `;
        
        // 更新帖子内容
        const postContent = document.querySelector('.post-content');
        postContent.innerHTML = post.content;
        
        // 加载评论
        loadComments(postId);
    } else {
        // 如果找不到帖子，显示错误信息
        document.querySelector('.post-header h2').textContent = '帖子不存在';
        document.querySelector('.post-content').innerHTML = '<p>抱歉，您请求的帖子不存在。</p>';
    }
}

// 加载评论
function loadComments(postId) {
    const comments = JSON.parse(localStorage.getItem(`post_${postId}_comments`)) || [];
    const commentsList = document.querySelector('.comments-list');
    
    // 清空评论列表
    commentsList.innerHTML = '';
    
    // 添加评论到列表
    comments.forEach(comment => {
        const commentItem = document.createElement('div');
        commentItem.className = 'comment-item';
        commentItem.innerHTML = `
            <div class="comment-header">
                <span class="comment-author">${comment.name}</span>
                <span class="comment-date">${comment.date}</span>
            </div>
            <div class="comment-content">
                <p>${comment.content}</p>
            </div>
        `;
        commentsList.appendChild(commentItem);
    });
}

// 保存评论
function saveComment(postId, name, content) {
    // 获取当前日期
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    // 创建新评论
    const newComment = {
        name: name,
        content: content,
        date: dateString
    };
    
    // 从localStorage获取现有评论
    const comments = JSON.parse(localStorage.getItem(`post_${postId}_comments`)) || [];
    
    // 添加新评论
    comments.push(newComment);
    
    // 保存到localStorage
    localStorage.setItem(`post_${postId}_comments`, JSON.stringify(comments));
}

// 设置评论表单
function setupCommentForm() {
    const commentForm = document.querySelector('.comment-form form');
    
    if (commentForm) {
        commentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // 获取URL参数中的帖子ID
            const urlParams = new URLSearchParams(window.location.search);
            const postId = parseInt(urlParams.get('id'));
            
            // 获取表单数据
            const name = document.getElementById('name').value;
            const comment = document.getElementById('comment').value;
            
            // 保存评论
            saveComment(postId, name, comment);
            
            // 重新加载评论
            loadComments(postId);
            
            // 清空表单
            commentForm.reset();
            
            // 显示成功消息
            alert('评论发表成功！');
        });
    }
}

// 设置平滑滚动
function setupSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// 设置浮窗广告
function setupFloatingAd() {
    const ad = document.querySelector('.floating-ad');
    if (!ad) return;
    
    // 初始位置和速度
    let x = 100;
    let y = 100;
    let dx = 1;
    let dy = 1;
    
    // 动画函数
    function animate() {
        // 获取窗口尺寸
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const adWidth = ad.offsetWidth;
        const adHeight = ad.offsetHeight;
        
        // 检查边界碰撞
        if (x + adWidth >= windowWidth || x <= 0) {
            dx = -dx;
        }
        if (y + adHeight >= windowHeight || y <= 0) {
            dy = -dy;
        }
        
        // 更新位置
        x += dx;
        y += dy;
        
        // 应用位置
        ad.style.left = x + 'px';
        ad.style.top = y + 'px';
        
        // 继续动画
        requestAnimationFrame(animate);
    }
    
    // 开始动画
    animate();
}

// 设置右下角弹窗广告
function setupPopupAd() {
    const popupAd = document.querySelector('.popup-ad');
    if (!popupAd) return;
    
    // 关闭按钮功能
    const closeButton = popupAd.querySelector('.popup-close');
    closeButton.addEventListener('click', function() {
        popupAd.style.display = 'none';
        
        // 同时隐藏左侧的假关闭按钮
        const leftCloseBtn = document.querySelector('.left-close-btn');
        if (leftCloseBtn) {
            leftCloseBtn.style.display = 'none';
        }
    });
>>>>>>> c06e5fc09c0247bb1f369d45f91ca8eb3aa27740
}