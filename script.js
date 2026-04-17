// 从localStorage获取帖子数据
let posts = JSON.parse(localStorage.getItem('forumPosts')) || [
    {
        id: 1,
        title: '说说你在的城市，一个月工资能买几平米？房价到底怎么涨？',
        author: '房产观察家',
        date: '2026-04-17',
        views: 2345,
        content: `房价一直是大家关注的热点话题，尤其是在一线城市，房价的涨幅让很多年轻人望而却步。今天我们来讨论一下，在你所在的城市，一个月的工资能买几平米房子？

<h3>一线城市情况</h3>
<p>在北京、上海、深圳等一线城市，房价普遍在每平米6-10万元之间，而平均工资大约在1-2万元左右。这意味着，一个月的工资只能买0.1-0.3平米的房子，想要买一套100平米的房子，需要工作30-50年。</p>

<h3>二线城市情况</h3>
<p>在杭州、南京、成都等二线城市，房价大约在每平米2-4万元之间，平均工资在8000-15000元左右。一个月的工资能买0.3-0.7平米的房子，相对一线城市压力小一些，但仍然需要20-30年才能买得起一套房子。</p>

<h3>房价上涨原因</h3>
<ol>
    <li>土地供应不足，尤其是在核心城市</li>
    <li>人口持续流入，增加了购房需求</li>
    <li>投资需求旺盛，很多人将房产作为投资手段</li>
    <li>货币供应量增加，导致资产价格上涨</li>
</ol>

<h3>网友讨论</h3>
<p>@北上广深漂：在深圳工作5年，月薪2万，依然买不起房，只能租房住。</p>
<p>@二线城市土著：在南京有套房，现在房价翻了一倍，感觉自己的资产增值了不少。</p>
<p>@刚毕业大学生：刚毕业工资6000，房价2万，不知道什么时候才能买得起房。</p>

<p>你所在的城市房价如何？一个月工资能买几平米？欢迎在评论区分享你的情况！`
    },
    {
        id: 2,
        title: '国产电脑、国产手机、国产汽车之比较',
        author: '科技爱好者',
        date: '2026-04-16',
        views: 1890,
        content: `近年来，国产科技产品发展迅速，从手机到电脑再到汽车，都取得了显著的进步。今天我们来比较一下国产电脑、国产手机和国产汽车的发展现状。

<h3>国产手机</h3>
<p>国产手机可以说是发展最成熟的领域，华为、小米、OPPO、vivo等品牌已经占据了国内市场的大部分份额，在国际市场也有不错的表现。国产手机在性价比、拍照、充电速度等方面都有优势，甚至在某些领域已经超越了国际品牌。</p>

<h3>国产电脑</h3>
<p>国产电脑品牌如联想、华为、小米等也在不断崛起，尤其是在笔记本电脑领域，国产产品的设计和性能都有了很大的提升。不过在芯片、操作系统等核心技术方面，仍然依赖进口，需要进一步突破。</p>

<h3>国产汽车</h3>
<p>国产汽车是近年来发展最快的领域，尤其是新能源汽车，比亚迪、蔚来、小鹏等品牌已经在市场上占据了重要地位。国产汽车在智能驾驶、电池技术等方面进步显著，有些技术甚至处于世界领先水平。</p>

<h3>发展前景</h3>
<p>总体来说，国产科技产品的发展前景非常广阔，尤其是在国家大力支持科技创新的背景下，相信未来会有更多的国产产品走向世界，成为国际市场的佼佼者。</p>

<p>你更看好国产手机、电脑还是汽车的发展？欢迎在评论区留言讨论！`
    },
    {
        id: 3,
        title: '五月初五是外星人，麦田怪圈再现……',
        author: 'UFO研究者',
        date: '2026-04-15',
        views: 3456,
        content: `最近，各地出现了一些奇怪的现象，引起了网友的广泛关注。有人声称在五月初五看到了不明飞行物，还有人发现了新的麦田怪圈，这些现象是否与外星人有关？

<h3>五月初五的不明飞行物</h3>
<p>据多位目击者描述，在五月初五晚上，天空中出现了一个发光的物体，形状类似于圆盘，在空中停留了大约10分钟后突然消失。有人用手机拍摄了视频，视频中可以看到一个明亮的光点在夜空中移动，速度很快，没有声音。</p>

<h3>新发现的麦田怪圈</h3>
<p>在河南某农村，村民发现了一个巨大的麦田怪圈，形状复杂，包含多个几何图案。专家到现场考察后表示，这个麦田怪圈的形成方式非常奇特，不是人力所能为。</p>

<h3>专家解读</h3>
<p>天文学家表示，五月初五的不明飞行物可能是流星或人造卫星，但也不能排除其他可能性。关于麦田怪圈，地质学家认为可能是自然现象，如强风或磁场变化导致的，但也有人认为是外星人留下的标记。</p>

<h3>网友热议</h3>
<p>@科幻迷：我相信外星人存在，这些现象就是最好的证明。</p>
<p>@理性派：这些现象都可以用科学解释，不要过度解读。</p>
<p>@好奇宝宝：不管是不是外星人，这些现象都很有趣，希望能有更多的研究。</p>

<p>你认为这些现象是外星人所为吗？欢迎在评论区分享你的看法！`
    },
    {
        id: 4,
        title: '真实经历，谈谈我被唤醒后受尽折磨的五年',
        author: '匿名用户',
        date: '2026-04-14',
        views: 4567,
        content: `这是我的真实经历，五年来我受尽了折磨，今天终于有勇气说出来。

<h3>五年前的那个晚上</h3>
<p>五年前的一个晚上，我像往常一样入睡，突然被一阵强烈的光线惊醒。我看到房间里站着几个奇怪的生物，它们有着灰色的皮肤和大大的眼睛，没有鼻子和嘴巴。我想喊，但发不出声音，身体也动弹不得。</p>

<h3>被带走的经历</h3>
<p>那些生物把我带到了一个陌生的地方，那里有很多奇怪的设备。它们对我进行了各种检查和实验，我感到非常害怕和痛苦，但却无法反抗。不知道过了多久，它们把我送回了家，我发现自己躺在床上，就像什么都没发生过一样。</p>

<h3>五年的折磨</h3>
<p>从那以后，我经常做噩梦，梦到那些生物又来抓我。我变得神经质，不敢一个人睡觉，也不敢告诉别人我的经历，怕被当成疯子。我去看过心理医生，但没有用，那些记忆太真实了。</p>

<h3>现在的我</h3>
<p>经过五年的调整，我逐渐接受了这段经历，虽然仍然会偶尔做噩梦，但已经能够正常生活。我希望通过分享我的故事，让更多人了解这种现象，也希望能找到有类似经历的人。</p>

<p>如果你也有类似的经历，或者对这种现象感兴趣，欢迎在评论区留言。`
    },
    {
        id: 5,
        title: '《十宗罪5》--中国十大恐怖凶杀案',
        author: '推理爱好者',
        date: '2026-04-13',
        views: 2789,
        content: `《十宗罪》系列是国内著名的悬疑推理小说，最新的《十宗罪5》讲述了中国十大恐怖凶杀案，情节紧凑，引人入胜。

<h3>案件一：雨夜屠夫</h3>
<p>一个连续作案的 serial killer，在雨夜袭击年轻女性，手段残忍，警方经过几个月的调查，终于将其抓获。</p>

<h3>案件二：校园碎尸案</h3>
<p>某大学女生被杀害并碎尸，尸体被分散在校园的各个角落，警方通过DNA比对和监控录像，最终锁定了犯罪嫌疑人。</p>

<h3>案件三：农村连环杀人案</h3>
<p>一个偏远农村发生了多起杀人案，受害者都是独居老人，警方经过深入调查，发现凶手竟然是村里的一个年轻人。</p>

<h3>小说特点</h3>
<p>《十宗罪5》的特点是基于真实案件改编，情节真实可信，推理过程严谨，同时也反映了社会问题，具有一定的社会意义。</p>

<p>如果你喜欢悬疑推理小说，《十宗罪5》绝对值得一读！`
    },
    {
        id: 6,
        title: '《长篇》那些风情万种、风华绝代的男人，为你打开男人的所有秘密',
        author: '情感专家',
        date: '2026-04-12',
        views: 3210,
        content: `男人的世界充满了秘密，今天我们来探讨一下那些风情万种、风华绝代的男人，了解他们的内心世界。

<h3>类型一：成熟稳重型</h3>
<p>这类男人通常事业有成，成熟稳重，给人一种安全感。他们懂得照顾人，做事有分寸，是很多女性理想的伴侣。</p>

<h3>类型二：阳光活力型</h3>
<p>这类男人充满活力，阳光开朗，喜欢运动和冒险。他们总是能给身边的人带来快乐，是朋友圈中的开心果。</p>

<h3>类型三：文艺浪漫型</h3>
<p>这类男人有着丰富的内心世界，喜欢文学、艺术和音乐。他们懂得浪漫，会制造惊喜，是很多女性的梦中情人。</p>

<h3>类型四：成功魅力型</h3>
<p>这类男人事业成功，充满魅力，走到哪里都能吸引别人的注意。他们自信满满，做事果断，是很多人崇拜的对象。</p>

<h3>男人的秘密</h3>
<p>其实，无论哪种类型的男人，内心都有柔软的一面，都需要被理解和关爱。了解男人的秘密，有助于建立更好的人际关系。</p>

<p>你喜欢哪种类型的男人？欢迎在评论区留言讨论！`
    },
    {
        id: 7,
        title: '《心理大师》：职业心理医生，告诉你这一行有多变态',
        author: '心理医生',
        date: '2026-04-11',
        views: 1987,
        content: `作为一名职业心理医生，我接触过各种各样的患者，也了解这一行的很多内幕。今天我来告诉你，心理医生这一行有多变态。

<h3>患者的奇葩案例</h3>
<p>我曾经遇到过一个患者，他总是觉得自己的身体里有虫子在爬，无论怎么解释都没用。还有一个患者，每天晚上都要检查门窗几十次，否则就无法入睡。</p>

<h3>心理医生的压力</h3>
<p>心理医生每天要面对患者的负面情绪，自己也会受到影响。很多心理医生都有不同程度的心理问题，需要定期接受督导。</p>

<h3>行业的黑暗面</h3>
<p>这个行业也有一些黑暗面，比如有些心理医生为了赚钱，故意延长治疗时间，或者给患者开不必要的药物。</p>

<h3>为什么选择这个职业</h3>
<p>尽管这个行业有很多挑战，但我仍然热爱我的工作，因为我可以帮助很多人走出心理困境，重新开始新的生活。</p>

<p>如果你对心理学感兴趣，或者有心理方面的问题，欢迎在评论区留言咨询。`
    },
    {
        id: 8,
        title: '结婚一年，老公攒钱待，我想离婚了，该怎么办……',
        author: '婚姻困惑者',
        date: '2026-04-10',
        views: 2567,
        content: `我和老公结婚一年了，最近发现他一直在攒钱，对我越来越冷淡，我觉得他可能有外遇，想离婚了，不知道该怎么办。

<h3>结婚初期的甜蜜</h3>
<p>刚结婚的时候，我们很甜蜜，每天都有说不完的话，他对我也很关心。</p>

<h3>逐渐变化的态度</h3>
<p>最近几个月，他开始变得冷淡，经常加班到很晚，对我也不那么关心了。我发现他在偷偷攒钱，问他为什么，他只是说想存点钱以备不时之需。</p>

<h3>怀疑有外遇</h3>
<p>我开始怀疑他有外遇，因为他总是抱着手机不放，对我越来越不耐烦。我偷偷查看了他的手机，发现他和一个女性联系频繁。</p>

<h3>想要离婚</h3>
<p>我想离婚，但又觉得不甘心，毕竟我们才结婚一年。我不知道该怎么办，希望大家能给我一些建议。</p>

<p>如果你有类似的经历，或者有好的建议，欢迎在评论区留言。`
    },
    {
        id: 9,
        title: '让那些天天吹深圳太阳高工资的YY闭嘴！',
        author: '深圳打工人',
        date: '2026-04-09',
        views: 3789,
        content: `作为一个在深圳工作了五年的打工人，我想告诉大家，深圳的工资并没有想象中那么高，生活成本却非常高。

<h3>深圳的工资水平</h3>
<p>深圳的平均工资确实比其他城市高一些，但那是被高收入群体拉高的。普通打工人的工资在8000-15000元之间，并没有想象中那么高。</p>

<h3>深圳的生活成本</h3>
<p>深圳的房租非常高，一个单间就要2000-3000元，加上水电费、交通费、餐饮费，一个月的开销至少要5000元。如果要买房，房价更是高得离谱，根本买不起。</p>

<h3>深圳的工作压力</h3>
<p>深圳的工作压力非常大，每天要工作10-12小时，经常加班，几乎没有个人时间。很多人都是在透支身体工作，牺牲了健康。</p>

<h3>对想來深圳的人的建议</h3>
<p>如果你想来深圳工作，一定要做好心理准备，这里不是天堂，而是一个充满竞争和压力的地方。如果你没有一技之长，或者不能承受高强度的工作，最好不要来。</p>

<p>你对深圳的工资和生活成本有什么看法？欢迎在评论区留言讨论！`
    },
    {
        id: 10,
        title: '来说说你们身边真实发生过的最诡异的事，胆小勿入！',
        author: '灵异爱好者',
        date: '2026-04-08',
        views: 4321,
        content: `每个人身边都可能发生过一些诡异的事情，今天我们来分享一下，胆小的人不要看哦！

<h3>网友分享一：夜半哭声</h3>
<p>@匿名用户：我曾经租过一个房子，每天晚上都能听到女人的哭声，后来才知道，这个房子之前有一个女人在这里自杀了。</p>

<h3>网友分享二：奇怪的影子</h3>
<p>@小明：有一天晚上，我在客厅看电视，突然看到墙上有一个影子，但是房间里只有我一个人，吓得我赶紧关了电视回房间。</p>

<h3>网友分享三：梦中预警</h3>
<p>@小红：我曾经梦到我爷爷去世了，结果第二天真的接到了爷爷去世的消息，非常诡异。</p>

<h3>网友分享四：手机怪事</h3>
<p>@小李：我的手机经常会自动打开一些应用，或者在凌晨收到奇怪的短信，内容都是乱码，不知道怎么回事。</p>

<h3>科学解释</h3>
<p>虽然这些事情看起来很诡异，但其实很多都可以用科学解释，比如幻觉、心理暗示、电磁干扰等。不过也有一些事情至今无法解释，成为了未解之谜。</p>

<p>你身边发生过什么诡异的事情？欢迎在评论区分享！`
    }
];

// 保存帖子数据到localStorage
function savePosts() {
    localStorage.setItem('forumPosts', JSON.stringify(posts));
}

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', function() {
    // 初始化帖子数据
    savePosts();
    
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
    

    
    // 更新用户导航链接
    updateUserLinks();
});

// 更新用户导航链接
function updateUserLinks() {
    const userLinksContainer = document.getElementById('user-links-container');
    if (!userLinksContainer) return;
    
    const userLoggedIn = localStorage.getItem('userLoggedIn');
    
    if (userLoggedIn) {
        userLinksContainer.innerHTML = `
            <a href="profile.html">个人资料</a>
            <a href="#" id="logout-btn">退出登录</a>
        `;
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                localStorage.removeItem('userLoggedIn');
                localStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            });
        }
    } else {
        userLinksContainer.innerHTML = `
            <a href="user-login.html">登录</a>
            <a href="register.html">注册</a>
        `;
    }
}



// 加载帖子详情
function loadPostDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = parseInt(urlParams.get('id'));
    
    if (isNaN(postId)) {
        showPostError('无效的帖子ID');
        return;
    }
    
    const post = posts.find(p => p.id === postId);
    
    if (post) {
        document.getElementById('post-title').textContent = post.title;
        
        const postMeta = document.querySelector('.post-meta');
        if (postMeta) {
            postMeta.innerHTML = `
                <span>作者: ${escapeHtml(post.author)}</span>
                <span>发布于: ${escapeHtml(post.date)}</span>
                <span>浏览: ${post.views}</span>
            `;
        }
        
        const postContent = document.querySelector('.post-content');
        if (postContent) {
            postContent.innerHTML = post.content;
        }
        
        loadComments(postId);
    } else {
        showPostError('帖子不存在');
    }
}

// 显示帖子错误
function showPostError(message) {
    const header = document.querySelector('.post-header h2');
    const content = document.querySelector('.post-content');
    
    if (header) {
        header.textContent = '错误';
    }
    if (content) {
        content.innerHTML = `<p>${escapeHtml(message)}</p>`;
    }
}

// HTML转义函数
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&#039;');
}

// 加载评论
function loadComments(postId) {
    const comments = JSON.parse(localStorage.getItem(`post_${postId}_comments`)) || [];
    const commentsList = document.querySelector('.comments-list');
    
    if (!commentsList) return;
    
    commentsList.innerHTML = '';
    
    comments.forEach(comment => {
        const commentItem = document.createElement('div');
        commentItem.className = 'comment-item';
        commentItem.innerHTML = `
            <div class="comment-header">
                <span class="comment-author">${escapeHtml(comment.name)}</span>
                <span class="comment-date">${escapeHtml(comment.date)}</span>
            </div>
            <div class="comment-content">
                <p>${escapeHtml(comment.content)}</p>
            </div>
        `;
        commentsList.appendChild(commentItem);
    });
}

// 保存评论
function saveComment(postId, name, content) {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    const newComment = {
        name: name.trim(),
        content: content.trim(),
        date: dateString
    };
    
    const comments = JSON.parse(localStorage.getItem(`post_${postId}_comments`)) || [];
    comments.push(newComment);
    localStorage.setItem(`post_${postId}_comments`, JSON.stringify(comments));
}

// 设置评论表单
function setupCommentForm() {
    const commentForm = document.querySelector('.comment-form form');
    if (!commentForm) return;
    
    commentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const urlParams = new URLSearchParams(window.location.search);
        const postId = parseInt(urlParams.get('id'));
        
        if (isNaN(postId)) {
            alert('无法发表评论：无效的帖子ID');
            return;
        }
        
        const nameInput = document.getElementById('name');
        const commentInput = document.getElementById('comment');
        
        const name = nameInput.value.trim();
        const comment = commentInput.value.trim();
        
        if (!name) {
            alert('请输入昵称');
            nameInput.focus();
            return;
        }
        
        if (!comment) {
            alert('请输入评论内容');
            commentInput.focus();
            return;
        }
        
        saveComment(postId, name, comment);
        loadComments(postId);
        commentForm.reset();
        alert('评论发表成功！');
    });
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

// 设置浮窗导航图标
function setupFloatingAd() {
    const ad = document.querySelector('.floating-ad');
    if (!ad) return;
    
    // 立即显示浮窗导航图标
    ad.style.display = 'block';
    
    // 等待广告元素完全渲染，获取正确的尺寸
    setTimeout(function() {
        const adWidth = ad.offsetWidth;
        const adHeight = ad.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // 计算初始位置，确保垂直居中
        let x = 20;
        let y = (windowHeight - adHeight) / 2;
        let dx = 0.5;
        let dy = 0.5;
        let animationId = null;
        
        function animate() {
            if (x + adWidth >= windowWidth) {
                x = windowWidth - adWidth;
                dx = -Math.abs(dx);
            } else if (x <= 0) {
                x = 0;
                dx = Math.abs(dx);
            }
            
            if (y + adHeight >= windowHeight) {
                y = windowHeight - adHeight;
                dy = -Math.abs(dy);
            } else if (y <= 0) {
                y = 0;
                dy = Math.abs(dy);
            }
            
            x += dx;
            y += dy;
            
            ad.style.left = x + 'px';
            ad.style.top = y + 'px';
            ad.style.transform = 'none'; // 移除CSS中的transform，使用JavaScript直接控制位置
            
            animationId = requestAnimationFrame(animate);
        }
        
        // 初始位置设置
        ad.style.left = x + 'px';
        ad.style.top = y + 'px';
        ad.style.transform = 'none';
        
        animate();
        
        ad.addEventListener('mouseenter', function() {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        });
        
        ad.addEventListener('mouseleave', function() {
            animate();
        });
    }, 100);
}

// 设置右下角弹窗广告
function setupPopupAd() {
    const popupAd = document.querySelector('.popup-ad');
    if (!popupAd) return;
    
    const closeButton = popupAd.querySelector('.popup-close');
    if (!closeButton) return;
    
    const leftCloseBtn = document.querySelector('.left-close-btn');
    
    // 5秒后显示弹窗广告和左侧假关闭按钮
    setTimeout(function() {
        popupAd.style.display = 'block';
        if (leftCloseBtn) {
            leftCloseBtn.style.display = 'block';
        }
    }, 5000);
    
    closeButton.addEventListener('click', function() {
        popupAd.style.display = 'none';
        if (leftCloseBtn) {
            leftCloseBtn.style.display = 'none';
        }
    });
}
