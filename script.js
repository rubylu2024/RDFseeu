// 页面加载完成后执行
// 页面加载完成后执行已经包含在下方的 window.addEventListener('DOMContentLoaded', ...)

const FLARUM_BASE_URL = '';

function isFlarumConfigured() {
    return true;
}

function getFlarumApiBase() {
    return '/api';
}

function getFlarumToken() {
    return localStorage.getItem('flarumToken');
}

function clearFlarumToken() {
    localStorage.removeItem('flarumToken');
    localStorage.removeItem('flarumUserId');
    localStorage.removeItem('flarumUsername');
}

// Flarum 登录
async function flarumLogin(username, password) {
    try {
        const json = await flarumRequest('/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identification: username, password })
        });

        if (json?.token) {
            localStorage.setItem('flarumToken', json.token);
            if (json.userId) {
                localStorage.setItem('flarumUserId', String(json.userId));
                // 尝试获取用户信息
                try {
                    const userJson = await flarumRequest(`/users/${json.userId}`);
                    if (userJson?.data?.attributes) {
                        const displayName = userJson.data.attributes.displayName || userJson.data.attributes.username;
                        localStorage.setItem('flarumUsername', displayName);
                    }
                } catch (e) {
                    console.error('获取用户信息失败:', e);
                }
            }
            updateUserLinks();
            return true;
        }
        return false;
    } catch (e) {
        console.error('Flarum login error:', e);
        return false;
    }
}

// Flarum 注册
async function flarumRegister(username, email, password) {
    try {
        const json = await flarumRequest('/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: {
                    type: 'users',
                    attributes: {
                        username,
                        email,
                        password
                    }
                }
            })
        });

        if (json?.data) {
            return true;
        }
        return false;
    } catch (e) {
        console.error('Flarum register error:', e);
        throw e;
    }
}

async function flarumRequest(path, options = {}) {
    const apiBase = getFlarumApiBase();
    const url = apiBase + (path.startsWith('/') ? path : '/' + path);

    const headers = {
        'Accept': 'application/vnd.api+json',
        ...options.headers
    };

    if (options.json !== undefined) {
        headers['Content-Type'] = 'application/vnd.api+json';
    } else if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const token = getFlarumToken();
    const userId = localStorage.getItem('flarumUserId');

    if (token && !headers.Authorization) {
    headers.Authorization = userId
        ? `Token ${token}; userId=${userId}`
        : `Token ${token}`;
    }

    const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.json !== undefined ? JSON.stringify(options.json) : options.body
    });

    if (!response.ok) {
        let detail = '';
        try {
            const errorJson = await response.json();
            detail = JSON.stringify(errorJson);
        } catch {
            detail = await response.text();
        }
        const error = new Error(`Flarum API 请求失败: ${response.status} ${response.statusText}`);
        error.detail = detail;
        throw error;
    }

    if (response.status === 204) return null;
    return await response.json();
}

function formatFlarumTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function pickIncluded(included, type, id) {
    if (!Array.isArray(included)) return null;
    return included.find((x) => x && x.type === type && String(x.id) === String(id)) || null;
}

function resolveFlarumUrlMaybeRelative(url) {
    if (typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('//')) return 'https:' + trimmed;
    const base = FLARUM_BASE_URL.replace(/\/+$/, '');
    if (!base) return trimmed;
    if (trimmed.startsWith('/')) return base + trimmed;
    return base + '/' + trimmed;
}

function getUserAvatarUrl(user) {
    const url = user?.attributes?.avatarUrl;
    if (typeof url === 'string' && url.trim().length > 0) return resolveFlarumUrlMaybeRelative(url);
    return 'images/用户头像.png';
}

function flarumDiscussionToPostData(apiJson) {
    if (!apiJson?.data || apiJson.data.type !== 'discussions') return null;

    const discussion = apiJson.data;
    const included = apiJson.included || [];
    const relationshipPostIds = (discussion.relationships?.posts?.data || [])
    .map((p) => String(p.id));

    const posts = included
    .filter((x) => x && x.type === 'posts')
    .filter((p) => relationshipPostIds.includes(String(p.id)))
    .sort((a, b) => (a.attributes?.number || 0) - (b.attributes?.number || 0));

    const firstPost = posts.find((p) => p.attributes?.number === 1) || posts[0];
    const firstUserId = firstPost?.relationships?.user?.data?.id || discussion.relationships?.user?.data?.id;
    const firstUser = firstUserId ? pickIncluded(included, 'users', firstUserId) : null;

    const viewCount = discussion.attributes?.viewCount;
    const commentCount = discussion.attributes?.commentCount;

    const postData = {
        id: Number(discussion.id),
        title: discussion.attributes?.title || '',
        author: firstUser?.attributes?.displayName || firstUser?.attributes?.username || '匿名用户',
        authorLevel: 'Lv.1 新手上路',
        authorAvatar: getUserAvatarUrl(firstUser),
        publishTime: formatFlarumTime(discussion.attributes?.createdAt),
        viewCount: typeof viewCount === 'number' ? viewCount : (typeof commentCount === 'number' ? commentCount : 0),
        allowComments: true,
        content: firstPost?.attributes?.contentHtml || firstPost?.attributes?.content || '',
        comments: posts
            .filter((p) => p !== firstPost)
            .map((p) => {
                const userId = p.relationships?.user?.data?.id;
                const user = userId ? pickIncluded(included, 'users', userId) : null;
                const number = p.attributes?.number;
                return {
                    id: Number(p.id),
                    author: user?.attributes?.displayName || user?.attributes?.username || '匿名用户',
                    authorLevel: 'Lv.1 新手上路',
                    authorAvatar: getUserAvatarUrl(user),
                    time: formatFlarumTime(p.attributes?.createdAt),
                    floor: typeof number === 'number' ? number : 0,
                    content: p.attributes?.contentHtml || p.attributes?.content || '',
                    replyTo: null
                };
            })
    };

    postData.comments = postData.comments
        .filter((c) => c.floor && c.floor !== 1)
        .sort((a, b) => a.floor - b.floor);

    return postData;
}

async function flarumLoadDiscussion(postId) {
    const id = String(postId);
    const json = await flarumRequest(`/discussions/${encodeURIComponent(id)}?include=posts,posts.user`);
    return flarumDiscussionToPostData(json);
}

async function flarumLoadDiscussionList() {
    const json = await flarumRequest('/discussions?sort=-createdAt&page[limit]=20&include=user');
    const discussions = Array.isArray(json?.data) ? json.data : [];
    const included = json?.included || [];

    return discussions.map((d) => {
        const userId = d.relationships?.user?.data?.id;
        const user = userId ? pickIncluded(included, 'users', userId) : null;
        const viewCount = d.attributes?.viewCount;
        const commentCount = d.attributes?.commentCount;
        return {
            id: Number(d.id),
            title: d.attributes?.title || '',
            author: user?.attributes?.displayName || user?.attributes?.username || '匿名用户',
            date: (d.attributes?.createdAt || '').slice(0, 10),
            views: typeof viewCount === 'number' ? viewCount : (typeof commentCount === 'number' ? commentCount : 0)
        };
    });
}



async function flarumCreateDiscussion({ title, content, tagIds = [] }) {
    const token = getFlarumToken();
    if (!token) {
        alert('请先登录后再发帖。');
        return null;
    }

    const relationships = {};
    if (Array.isArray(tagIds) && tagIds.length > 0) {
        relationships.tags = {
            data: tagIds.map((id) => ({ type: 'tags', id: String(id) }))
        };
    }

    const json = await flarumRequest('/discussions', {
        method: 'POST',
        json: {
            data: {
                type: 'discussions',
                attributes: { title, content },
                relationships
            }
        }
    });
    return json?.data?.id ? String(json.data.id) : null;
}

async function flarumCreatePost({ discussionId, content }) {
    const token = getFlarumToken();
    if (!token) {
        alert('请先登录后再回帖。');
        return null;
    }

    const json = await flarumRequest('/posts', {
        method: 'POST',
        json: {
            data: {
                type: 'posts',
                attributes: { content },
                relationships: {
                    discussion: { data: { type: 'discussions', id: String(discussionId) } }
                }
            }
        }
    });

    return json?.data?.id ? String(json.data.id) : null;
}

// 动态加载帖子数据
async function loadPostData(postId) {
    try {
        // 显示加载状态
        const threadContainer = document.getElementById('forum-thread');
        if (threadContainer) {
            threadContainer.innerHTML = '<div style="padding: 20px; text-align: center;">加载中...</div>';
        }
        
        if (isFlarumConfigured()) {
            const fromApi = await flarumLoadDiscussion(postId);
            if (fromApi) return fromApi;
        }
        const response = await fetch(`data/post_${postId}.json`);
        if (!response.ok) {
            throw new Error(`帖子数据文件不存在: post_${postId}.json`);
        }
        return await response.json();
    } catch (error) {
        console.warn('加载帖子数据失败，使用备用数据:', error);
        // 显示错误提示后使用备用数据
        const threadContainer = document.getElementById('forum-thread');
        if (threadContainer) {
            threadContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #cc0000;">加载失败，显示备用数据...</div>';
            setTimeout(() => {
                const fallbackData = getFallbackPostData(postId);
                if (fallbackData) renderForumThread(fallbackData);
            }, 1000);
        }
        return getFallbackPostData(postId);
    }
}

// 备用帖子数据（fallback）
function getFallbackPostData(postId) {
    const fallbackData = {
        "1": {
            "id": 1,
            "title": "说说你在的城市，一个月工资能买几平米？房价到底怎么涨？",
            "author": "☆_房产の观察家_☆",
            "authorLevel": "Lv.3 中级会员",
            "authorAvatar": "images/用户头像.png",
            "publishTime": "2010-04-17 10:30:45",
            "viewCount": 2345,
            "content": "<p>房价一直是大家关注的热点话题，尤其是在一线城市，房价的涨幅让很多年轻人望而却步。今天我们来讨论一下，在你所在的城市，一个月的工资能买几平米房子？</p><h3>一线城市情况</h3><p>在北京、上海、深圳等一线城市，房价普遍在每平米1-3万元之间（2010年数据），而平均工资大约在3000-6000元左右。这意味着，一个月的工资只能买0.2-0.4平米的房子，想要买一套100平米的房子，不吃不喝也得几十年。</p><h3>二线城市情况</h3><p>在杭州、南京、成都等二线城市，房价大约在每平米8000-15000元之间，平均工资在2000-4000元左右。一个月的工资能买0.25-0.5平米的房子，压力同样不小。</p><h3>网友讨论</h3><p>@神马都是浮云：在深圳工作3年，月薪4000，依然买不起房，只能租房住，也是醉了。</p><p>@给跪了：在南京有套房，现在房价翻了一倍，感觉自己要发财了，不解释。</p><p>@杯具的小明：刚毕业工资2000，房价1万，你造吗？我勒个去！</p><p>你所在的城市房价如何？一个月工资能买几平米？欢迎在评论区分享你的情况！</p>",
            "comments": [
                {"id": 1, "author": "ゞ泪流满面的小明ζ", "authorLevel": "Lv.2 初级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-18 09:15:32", "floor": 2, "content": "<p>前排占座！坐标上海，月薪3500，房价2万/平，一个月工资能买0.175平，想想就泪流满面... T_T</p><p>工作3年了，连首付的零头都没攒够，神马都是浮云啊！</p>"},
                {"id": 2, "author": "oοゞ杭州新市民ゞοo", "authorLevel": "Lv.2 初级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-18 10:42:18", "floor": 3, "content": "<p>沙发！杭州城西，月薪3000，房价1.2万/平，一个月能买0.25平，努力几年还是有希望的！</p><p>打算再攒两年钱，加上家里支持一点，争取明年上车. 给跪了！</p>"},
                {"id": 3, "author": "成都安逸哥(￣▽￣)", "authorLevel": "Lv.4 高级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-19 14:28:55", "floor": 4, "content": "<p>板凳。成都二环路，月薪2500，房价6000/平，一个月能买0.4平，感觉压力还好。</p><p>成都生活节奏慢，房价相对友好，适合宜居。赞一个，不解释！</p>"},
                {"id": 4, "author": "ξ北京追梦人ξ", "authorLevel": "Lv.1 新手上路", "authorAvatar": "images/用户头像.png", "time": "2010-04-19 16:55:03", "floor": 5, "content": "<p>地板。北京五环外，月薪4000，房价1.5万/平，一个月0.26平，但是首付太难了... 也是醉了。</p><p>家里条件一般，全靠自己，不知道什么时候才能凑够首付. 我勒个去！</p>"},
                {"id": 5, "author": "广州打工人_bule", "authorLevel": "Lv.2 初级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-20 09:30:17", "floor": 6, "content": "<p>地下室。广州天河，月薪3500，房价1.2万/平，一个月0.29平，慢慢来吧。</p><p>相比北上深，广州的房价还是比较友好的，咬咬牙还是有希望的. 给力！</p>"},
                {"id": 6, "author": "火钳留名の武汉新青年", "authorLevel": "Lv.2 初级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-20 11:22:44", "floor": 7, "content": "<p>路过打酱油。武汉光谷，月薪2000，房价5000/平，一个月0.4平，感觉还可以接受。</p><p>新一线里武汉性价比挺高的，发展也快，看好未来. 火钳留名！</p>"},
                {"id": 7, "author": "↘深圳奋斗者↖", "authorLevel": "Lv.3 中级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-21 15:48:30", "floor": 8, "content": "<p>围观。深圳南山，月薪5000，房价2.5万/平，一个月0.2平，太难了太难了. 你造吗？</p><p>准备回老家发展了，深圳实在是买不起，压力太大了. 鸭梨山大啊！</p>"},
                {"id": 8, "author": "苏州小白领(^_−)☆", "authorLevel": "Lv.2 初级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-21 17:15:08", "floor": 9, "content": "<p>潜水多年冒个泡。苏州园区，月薪3000，房价8000/平，一个月0.375平，加油攒钱中。</p><p>苏州环境好，离上海近，感觉是个不错的选择. 妥妥的！</p>"},
                {"id": 9, "author": "✿重庆土著✿", "authorLevel": "Lv.3 中级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-22 10:30:00", "floor": 10, "content": "<p>重庆江北，月薪2200，房价4000/平，一个月0.55平！简直太幸福了！</p><p>重庆房价真的很良心，生活压力小很多，推荐大家来重庆发展. 各种羡慕嫉妒恨！</p>"},
                {"id": 10, "author": "西安奋斗哥+1", "authorLevel": "Lv.2 初级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-22 14:20:15", "floor": 11, "content": "<p>西安高新区，月薪2800，房价5500/平，一个月0.5平，还可以接受。</p><p>西安发展很快，文化底蕴深厚，适合定居. 楼上+1！</p>"},
                {"id": 11, "author": "坑爹o厦门岛民", "authorLevel": "Lv.4 高级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-23 09:45:30", "floor": 12, "content": "<p>厦门岛内，月薪3500，房价1.5万/平，一个月0.23平，压力山大...</p><p>不过厦门环境真的好，面朝大海春暖花开，咬咬牙坚持吧. 坑爹啊！</p>"},
                {"id": 12, "author": "郑州上班族(元芳你怎么看)", "authorLevel": "Lv.2 初级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-23 16:00:00", "floor": 13, "content": "<p>郑州东区，月薪2000，房价5000/平，一个月0.4平，感觉还行。</p><p>郑州作为中原核心，发展潜力大，房价相对友好. 元芳，你怎么看？</p>"},
                {"id": 13, "author": "楼中楼测试员", "authorLevel": "Lv.1 新手上路", "authorAvatar": "images/用户头像.png", "time": "2010-04-24 10:00:00", "floor": 14, "content": "<p>你说得对，上海的房价确实让人望尘莫及. 我也是醉了。</p>", "replyTo": 2},
                {"id": 14, "author": "深度评论家", "authorLevel": "Lv.5 社区元老", "authorAvatar": "images/用户头像.png", "time": "2010-04-24 11:30:00", "floor": 15, "content": "<p>我也觉得上海的生活成本太高了，其实二线城市也不错. 给力不解释！</p>", "replyTo": 14},
                {"id": 15, "author": "终极回复者", "authorLevel": "Lv.2 初级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-24 12:45:00", "floor": 16, "content": "<p>赞同楼上的深度分析！现在的年轻人确实需要更多的选择. 火钳留名！</p>", "replyTo": 15}
            ]
        },
        "2": {
            "id": 2,
            "title": "关于开展“拒绝黄赌毒、共建平安社区”宣传教育活动的通知",
            "author": "宁水市公安局闵江分局治安大队",
            "authorLevel": "Lv.5 社区元老",
            "authorAvatar": "images/用户头像.png",
            "publishTime": "2012-08-20 09:00:00",
            "viewCount": 567,
            "allowComments": false,
            "content": "<p>福云路沿街各商铺、彩票销售网点、棋牌室、网吧、茶楼及全体居民：</p><p>近期接群众反映，我辖区个别场所存在疑似聚众赌博、地下字谜投注等不良现象。为进一步净化社区环境，特此重申：</p><p>一、严禁任何形式的赌博行为。包括但不限于：以营利为目的的棋牌局、利用网络平台进行的第三方投注、以“字画竞猜”或“生肖走势分析”为名义的变相聚赌。</p><p>二、彩票销售网点须持证经营。不得私自提供开奖趋势图、“内部参考图”或任何形式的“规律分析图”，不得向未成年人出售彩票。所谓“福粮”“内参”“玄机”等非法印刷品一经发现，立即收缴。</p><p>三、棋牌室、茶楼等场所须在晚23时前停止营业。严禁以“朋友消遣”为名组织大规模现金麻将局，不得容留陌生人员进行约定时间的轮换牌局。如有发现按聚众赌博论处</p><p>四、警惕以“文化交流”为名的非法出版物。近期发现有人以“字花”旧报合订本等形式夹带敏感内容向中老年人兜售。此类物品中常印有所谓“某某大师独家解密”等诱导性话术，本质是赌博投注的变体，请居民一旦发现及时举报。</p><p>五、请将本公告张贴于各楼栋单元入口。本周三上午九点将在福云小区中心广场举办“平安社区”现场宣讲，届时会有实物展示（含近期查获的印刷品如“福粮图”教具）供居民辨别。</p><p>举报电话：宁水市公安局闵江分局治安大队 053X-XXXXXXX<br>宁水市闵江区福云路街道办<br>2012年8月20日</p>",
            "comments": []
        },
        "4": {
            "id": 4,
            "title": "结婚两年，老公嫌我胖，我想离婚了，该怎么继续……",
            "author": "紫色的梦",
            "authorLevel": "Lv.2 初级会员",
            "authorAvatar": "梦",
            "publishTime": "2010-07-15 14:23:00",
            "viewCount": 1582,
            "allowComments": true,
            "content": "<p>我和老公是大学同学，恋爱五年结了婚，到现在刚好两年。结婚前 I 98斤，他天天说就喜欢我这样肉肉的。结婚后我因为工作压力大、内分泌失调胖了差不多三十斤，唉，我自己都天天焦虑呢……上个月他开始嫌我胖，一开始还是开玩笑呢，后来又认真地说让我减肥，他以前从不这样说我的。我试着减了，每天下班回来晚饭不吃，还跳绳，瘦了五斤又反弹了。昨天晚上他去洗澡了，我看见他和堂弟的微信聊天记录，说我胖，没有腰摸起来没有灵魂。不如他的前女友瘦可以各种姿势，玩得好天天想。还有半个月就到我们两周年纪念日了，看到后我没跟他说，不过心里想离婚。我可以瘦，可以减肥，但我不想讨好一个真心嫌弃我的人。</p><p>他比我小十个月，我今年也快三十了，还没要孩子。我觉得他是一个自私的人，这么大了只顾自己，钱也赚不了多少，可我自己没有存款，也不敢离婚。</p><p>心里苦！不知道该对谁说……女人上哪去找一个真心爱自己的男人？</p>",
            "comments": [
                {
                    "id": 1,
                    "author": "暖心小贴士",
                    "authorLevel": "Lv.2 初级会员",
                    "authorAvatar": "贴",
                    "time": "2010-07-15 15:10:22",
                    "floor": 2,
                    "content": "<p>抱抱楼主。我老公以前也嫌 v 胖，我当时直接回了一句“看看你自己的样子”。男人就是欠教育</p>"
                },
                {
                    "id": 2,
                    "author": "职场理智姐",
                    "authorLevel": "Lv.4 高级会员",
                    "authorAvatar": "姐",
                    "time": "2010-07-15 15:45:10",
                    "floor": 3,
                    "content": "<p>这体重也不胖呀？你长胖是因为内分泌失调，内分泌失调是因为压力大，压力大是因为什么你心里清楚。听姐的，把压力源头解决掉，比减肥管用！</p>"
                },
                {
                    "id": 3,
                    "author": "紫色的梦",
                    "authorLevel": "Lv.2 初级会员",
                    "authorAvatar": "梦",
                    "time": "2010-07-15 16:02:45",
                    "floor": 4,
                    "content": "<p>谢谢。压力源头可能是我婆婆，她一直想让我们生孩子，但我老公说现在不是时候。每次回去吃饭她都用那种眼神看我，我去她家比上班还累，更可恨的是我老公当着家人朋友的面从不嫌我，还说胖点好，叫我多吃点。</p>",
                    "replyTo": 3
                },
                {
                    "id": 4,
                    "author": "辣妈萌宝",
                    "authorLevel": "Lv.3 中级会员",
                    "authorAvatar": "宝",
                    "time": "2010-07-15 16:30:15",
                    "floor": 5,
                    "content": "<p>有孩子了吗？没有的话还好办。我生完孩子胖了二十斤，我老公屁都不敢放，敢离我就敢带孩子走，他有话说不？胖点又咋了？你就是太在意他怎么看你了</p>"
                },
                {
                    "id": 5,
                    "author": "健身达人阿强",
                    "authorLevel": "Lv.5 社区元老",
                    "authorAvatar": "强",
                    "time": "2010-07-15 17:15:40",
                    "floor": 6,
                    "content": "<p>姐妹们听我说，我三个月瘦了二十斤，没靠什么药物和手术，就是管住嘴迈开腿，每天一万步！碳水全断，晚餐六点之前吃完。变美不是为了男人，是为了自己！</p>"
                },
                {
                    "id": 6,
                    "author": "紫色的梦",
                    "authorLevel": "Lv.2 初级会员",
                    "authorAvatar": "梦",
                    "time": "2010-07-15 17:45:12",
                    "floor": 7,
                    "content": "<p>我试过断碳水，但上班很难提起精神，集中不了注意力呀</p>",
                    "replyTo": 6
                },
                {
                    "id": 7,
                    "author": "情感小魔女",
                    "authorLevel": "Lv.3 中级会员",
                    "authorAvatar": "魔",
                    "time": "2010-07-15 18:20:05",
                    "floor": 8,
                    "content": "<p>这种男的就欠治，楼主我教你一招，你也开始嫌弃他。嫌他头发少，嫌他挣钱不多，嫌他妈宝，嫌他各种！然后当你真的开始挑剔他，你就不那么害怕他挑剔你了，亲测有效！哈哈哈！</p>"
                },
                {
                    "id": 8,
                    "author": "路边小草",
                    "authorLevel": "Lv.1 新手上路",
                    "authorAvatar": "草",
                    "time": "2010-07-15 19:10:30",
                    "floor": 9,
                    "content": "<p>说到这个我突然想起来，楼主有没有试过报个课？你这种属于心理问题，我表姐当年也是因为类似的事闹得差点离婚，后来她也是打算报一个什么帮人调整心态的机构，不过好像没报上名</p>"
                },
                {
                    "id": 9,
                    "author": "紫色的梦",
                    "authorLevel": "Lv.2 初级会员",
                    "authorAvatar": "梦",
                    "time": "2010-07-15 19:35:18",
                    "floor": 10,
                    "content": "<p>你说的那种机构我不了解。我同事倒是推荐过一个什么心理课程，我还没去问。</p>",
                    "replyTo": 9
                },
                {
                    "id": 10,
                    "author": "真相只有一个",
                    "authorLevel": "Lv.4 高级会员",
                    "authorAvatar": "真",
                    "time": "2010-07-15 20:15:00",
                    "floor": 11,
                    "content": "<p>可以是可以，但也得谨慎选择！我一个同学以前就进过这种机构，入学费好像五六千还是多少。后来应该是出什么事了吧，反正搬走了，去年路过看到外面挂着招租的牌子。提醒楼主看到那种学校绕着走。正规心理咨询去三甲医院，越神秘的越有猫腻</p>"
                },
                {
                    "id": 11,
                    "author": "紫色的梦",
                    "authorLevel": "Lv.2 初级会员",
                    "authorAvatar": "梦",
                    "time": "2010-07-15 20:45:00",
                    "floor": 12,
                    "content": "<p>谢谢提醒，我没打算报什么学校，没钱也没时间……</p>",
                    "replyTo": 11
                },
                {
                    "id": 12,
                    "author": "理智分析师",
                    "authorLevel": "Lv.4 高级会员",
                    "authorAvatar": "理",
                    "time": "2010-07-15 21:10:00",
                    "floor": 13,
                    "content": "<p>帖子有点歪了哈，正个楼，离不离是大事，但在此之前，试着找一份不需要在意他眼光的事做，业余时间有自己能投入的东西，你的情绪独立性会强很多。至于减肥，等你不那么焦虑了自然会瘦，身体很诚实</p>"
                },
                {
                    "id": 13,
                    "author": "江湖百晓生",
                    "authorLevel": "Lv.3 中级会员",
                    "authorAvatar": "生",
                    "time": "2010-07-15 21:35:00",
                    "floor": 14,
                    "content": "<p>对对对，我表姐也是，不知道从哪听来这么个机构，只不过我姐夫觉得是骗钱的没让她去，后来就没听说过了。估计真是骗钱的，倒闭了吧！呵呵！</p>",
                    "replyTo": 11
                },
                {
                    "id": 14,
                    "author": "紫色的梦",
                    "authorLevel": "Lv.2 初级会员",
                    "authorAvatar": "梦",
                    "time": "2010-07-15 22:05:00",
                    "floor": 15,
                    "content": "<p>你说得对，我确实什么自己的事都没在做。自从结了婚，自己的时间就被褫夺了，以前还画点画，结婚后再也没碰过，为柴米油盐酱醋茶操碎了心！我今晚上翻一翻以前的本子</p>",
                    "replyTo": 13
                },
                {
                    "id": 15,
                    "author": "画笔生花",
                    "authorLevel": "Lv.3 中级会员",
                    "authorAvatar": "画",
                    "time": "2010-07-15 22:30:00",
                    "floor": 16,
                    "content": "<p>画！画起来！画得好不好不重要，重要的是那是你自己的东西。你老公嫌你胖是他的问题，你把画笔捡起来是你的问题。加油楼主！</p>"
                },
                {
                    "id": 16,
                    "author": "紫色的梦",
                    "authorLevel": "Lv.2 初级会员",
                    "authorAvatar": "梦",
                    "time": "2010-07-15 22:50:00",
                    "floor": 17,
                    "content": "<p>谢谢大家，我去找速写本了。婚姻的事我再想想。</p>"
                }
            ]
        }
    };
    return fallbackData[postId] || null;
}


// 获取帖子列表（从data文件夹读取）
async function loadPostList() {
    // 显示加载状态
    const container = document.querySelector('.forum-posts');
    if (container) {
        container.innerHTML = '<div style="padding: 20px; text-align: center;">加载中...</div>';
    }
    
    if (isFlarumConfigured()) {
        try {
            return await flarumLoadDiscussionList();
        } catch (error) {
            console.error('加载帖子列表失败:', error);
            return [];
        }
    }

    const postList = [];
    const postIds = [1, 2, 4, 5, 6];

    for (const id of postIds) {
        try {
            const response = await fetch(`data/post_${id}.json`);
            if (response.ok) {
                const post = await response.json();
                postList.push({
                    id: post.id,
                    title: post.title,
                    author: post.author,
                    date: post.publishTime.split(' ')[0],
                    views: post.viewCount
                });
            }
        } catch (error) {
            // 如果文件不存在，跳过
        }
    }
    return postList;
}

function renderPostListIntoIndex(postList) {
    const container = document.querySelector('.forum-posts');
    if (!container) return;

    const safeList = Array.isArray(postList) ? postList : [];

    container.innerHTML = `
        <h3>最新发帖</h3>
        <table class="posts-table">
            <thead>
                <tr>
                    <th style="width: 60%;">标题</th>
                    <th style="width: 16%;">作者</th>
                    <th style="width: 14%;">日期</th>
                    <th style="width: 10%;">热度</th>
                </tr>
            </thead>
            <tbody>
                ${safeList.length > 0 ? safeList.map((p) => `
                    <tr>
                        <td><a href="post.html?id=${encodeURIComponent(p.id)}">${p.title || ''}</a></td>
                        <td>${p.author || ''}</td>
                        <td>${p.date || ''}</td>
                        <td>${typeof p.views === 'number' ? p.views : ''}</td>
                    </tr>
                `).join('') : `<tr><td colspan="4" style="text-align: center; padding: 20px;">暂无帖子</td></tr>`}
            </tbody>
        </table>
    `;
}

function cleanupLegacyLocalStorage() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith('post_') && key.endsWith('_new_comments')) keysToRemove.push(key);
        if (key === 'userLoggedIn' || key === 'currentUser') keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
}

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', function() {
    // 处理所有 href="#" 的链接
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a');
        if (target && target.getAttribute('href') === '#') {
            // 排除掉已经有特定功能的链接（如回复、取消回复、退出登录等）
            if (target.classList.contains('reply-link') || 
                target.id === 'cancel-reply' || 
                target.id === 'logout-btn' ||
                target.id === 'login-btn' ||
                target.id === 'register-btn') {
                return;
            }
            e.preventDefault();
        }
        
        // 处理楼中楼楼层链接的平滑滚动
        if (target && target.classList.contains('quote-floor-link')) {
            e.preventDefault();
            const href = target.getAttribute('href');
            if (href) {
                // 判断是否需要跳转到其他页面
                if (href.startsWith('?')) {
                    // 跳转到其他页面，让浏览器处理
                    window.location.href = href;
                } else if (href.startsWith('#post-')) {
                    // 在当前页内跳转
                    const floorId = href.substring(6);
                    const targetElement = document.getElementById(`post-${floorId}`);
                    if (targetElement) {
                        targetElement.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                        });
                        // 添加高亮效果
                        targetElement.style.backgroundColor = '#ffffcc';
                        setTimeout(() => {
                            targetElement.style.backgroundColor = '';
                        }, 1500);
                    }
                }
            }
        }
    });

    cleanupLegacyLocalStorage();
    
    // 测试Flarum API连接
    if (isFlarumConfigured()) {
        console.log('Flarum API 配置已完成，正在测试连接...');
        testFlarumConnection();
    } else {
        console.log('Flarum API 未配置');
    }
    
    // 检查是否是帖子详情页面
    if (window.location.pathname.includes('post.html')) {
        loadPostDetailsFromJson();
        // 表单事件只绑定一次
        setupReplyForm();
        
        // 页面加载时检查登录状态，修改回复表单
        updateReplyFormForLoginStatus();
    }

    if (document.querySelector('.forum-posts')) {
        loadPostList().then(renderPostListIntoIndex).catch((error) => {
            console.error('加载帖子列表失败:', error);
        });
    }

    if (window.location.pathname.includes('new-post.html')) {
        const form = document.getElementById('new-post-form');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();

                const title = document.getElementById('post-title')?.value?.trim() || '';
                const content = document.getElementById('post-content')?.value?.trim() || '';
                const category = document.getElementById('post-category')?.value || '';

                if (!title || !content) {
                    alert('请填写标题和内容！');
                    return;
                }

                if (!isFlarumConfigured()) {
                    alert('管理员尚未配置论坛后端地址，暂时无法提交到论坛。');
                    return;
                }

                const tagIds = [];
                const mappedTagId = localStorage.getItem(`flarumTagMap:${category}`);
                if (mappedTagId) tagIds.push(mappedTagId);

                try {
                    const discussionId = await flarumCreateDiscussion({ title, content, tagIds });
                    if (discussionId) {
                        alert('帖子发表成功！');
                        window.location.href = `post.html?id=${encodeURIComponent(discussionId)}`;
                        return;
                    }
                    alert('帖子发表失败。');
                } catch (error) {
                    console.error('发帖失败:', error);
                    alert('帖子发表失败，请检查登录状态、论坛地址、或跨域配置。');
                }
            });
        }
    }
    
    // 平滑滚动效果
    setupSmoothScroll();
    
    // 浮窗广告
    // setupFloatingAd();
    setupFloatingAd2();
    
    // 右下角弹窗广告
    setupPopupAd();
    
    // 音频控制
    setupAudio();
    
    // 更新用户导航链接
    updateUserLinks();
    
    // 将近期热帖滚动区域滚动到顶部
    const scrollableContent = document.querySelector('.scrollable-content');
    if (scrollableContent) {
        scrollableContent.scrollTop = 0;
    }
});

// 测试Flarum API连接
async function testFlarumConnection() {
    try {
        console.log('正在测试Flarum API连接...');
        const response = await flarumRequest('/');
        console.log('Flarum API 连接成功:', response);
        
        // 测试获取讨论列表
        const discussions = await flarumRequest('/discussions?sort=-createdAt&page[limit]=5&include=user');
        console.log('获取讨论列表成功:', discussions);
        
        console.log('Flarum API 测试完成，连接正常！');
    } catch (error) {
        console.error('Flarum API 连接失败:', error);
        console.error('可能的原因: 1. Flarum论坛未运行 2. 跨域配置问题 3. 网络连接问题');
    }
}

// 设置音频控制
function setupAudio() {
    const audio = document.getElementById('background-music');
    const audioToggle = document.getElementById('audio-toggle');
    
    if (audio && audioToggle) {
        // 初始状态为暂停
        audio.pause();
        audioToggle.classList.add('paused');
        
        // 点击切换播放状态
        audioToggle.addEventListener('click', function() {
            if (audio.paused) {
                audio.play().catch(function(error) {
                    console.log('Audio playback prevented:', error);
                });
                audioToggle.classList.remove('paused');
            } else {
                audio.pause();
                audioToggle.classList.add('paused');
            }
        });
        
        // 监听播放状态
        audio.addEventListener('play', function() {
            audioToggle.classList.remove('paused');
        });
        
        audio.addEventListener('pause', function() {
            audioToggle.classList.add('paused');
        });
    }
}

// 从JSON文件加载帖子详情并渲染
async function loadPostDetailsFromJson() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id') || '1';
    
    const postData = await loadPostData(postId);
    if (!postData) {
        console.error('无法加载帖子数据');
        return;
    }
    
    renderForumThread(postData);
}

// 渲染论坛帖子
function renderForumThread(postData) {
    const threadContainer = document.querySelector('.forum-thread');
    if (!threadContainer) return;

    // 更新页面标题
    document.title = `红蜻蜓论坛.Beta - ${postData.title}`;

    // 处理不可回帖的情况
    const replyBox = document.getElementById('reply-box');
    if (replyBox) {
        if (postData.allowComments === false) {
            replyBox.innerHTML = '<div class="comments-disabled-msg" style="padding: 20px; text-align: center; color: #666; background: #f9f9f9; border: 1px solid #ddd; margin-top: 20px;">该帖子已设置不可回帖</div>';
        } else {
            // 恢复回帖表单（如果之前被禁用了）
            if (replyBox.querySelector('.comments-disabled-msg')) {
                const isLoggedIn = !!getFlarumToken();
                
                if (isLoggedIn) {
                    // 已登录：显示用户信息和表单
                    replyBox.innerHTML = `
                        <h4>发表回复</h4>
                        <div class="current-user-info" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
                            <img src="images/用户头像.png" alt="头像" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <div style="font-weight: bold; color: #333;">${localStorage.getItem('flarumUsername') || '已登录用户'}</div>
                                <div style="font-size: 12px; color: #999;">Lv.1 新手上路</div>
                            </div>
                        </div>
                        <form class="reply-form" id="reply-form">
                            <textarea id="reply-content" placeholder="分享你的看法..."></textarea>
                            <input type="hidden" id="reply-target" name="reply-target" value="">
                            <div>
                                <button type="submit">发表回复</button>
                                <a href="#" class="cancel-reply" id="cancel-reply" style="display: none;">取消回复</a>
                            </div>
                        </form>
                    `;
                } else {
                    // 未登录：显示登录提示
                    replyBox.innerHTML = `
                        <h4>发表回复</h4>
                        <div class="login-prompt" style="padding: 20px; text-align: center; color: #666; background: #f9f9f9; border: 1px solid #ddd; margin-bottom: 10px;">
                            <p style="margin-bottom: 10px;">未登录用户不可回复</p>
                            <a href="login.html" style="color: #0066cc; text-decoration: none;">立即登录</a>
                        </div>
                    `;
                }
                // 重新绑定提交事件（因为 innerHTML 会移除事件监听）
                if (isLoggedIn) {
                    setupReplyForm();
                }
            }
        }
    }

    const allPosts = [{
        id: 0,
        author: postData.author,
        authorLevel: postData.authorLevel,
        authorAvatar: postData.authorAvatar,
        time: postData.publishTime,
        floor: 1,
        content: postData.content,
        isOp: true,
        replyTo: null
    }, ...postData.comments];

    // 分页配置
    const PAGE_SIZE = 20;
    const urlParams = new URLSearchParams(window.location.search);
    const currentPage = parseInt(urlParams.get('page')) || 1;
    const totalPosts = allPosts.length;
    const totalPages = Math.ceil(totalPosts / PAGE_SIZE);
    
    // 计算当前页显示的帖子范围
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, totalPosts);
    const currentPagePosts = allPosts.slice(startIndex, endIndex);
    
    // 获取当前页可见的楼层范围（用于楼中楼跳转判断）
    const visibleFloors = currentPagePosts.map(p => p.floor);

    // 递归生成引用 HTML
    function generateQuoteHTML(replyToFloor, allPosts, depth = 0) {
        if (!replyToFloor || depth >= 3) return '';
        const target = allPosts.find(p => p.floor === replyToFloor);
        if (!target) return '';

        const parentQuote = generateQuoteHTML(target.replyTo, allPosts, depth + 1);
        const plainContent = target.content.replace(/<[^>]*>/g, '').substring(0, 100);
        
        // 判断目标楼层是否在当前页
        const isOnCurrentPage = visibleFloors.includes(target.floor);
        
        return `
            <div class="quote-box quote-level-${depth}">
                ${parentQuote}
                <div class="quote-author">引用 ${target.author}(<a href="${isOnCurrentPage ? `#post-${target.floor}` : `?page=${Math.ceil(target.floor / PAGE_SIZE)}#post-${target.floor}`}" class="quote-floor-link" style="color: #0066cc; cursor: pointer; text-decoration: underline;">${target.floor}楼</a>) 的发言：</div>
                <div class="quote-content">${plainContent}${target.content.replace(/<[^>]*>/g, '').length > 100 ? '...' : ''}</div>
            </div>
        `;
    }

    // 生成分页导航HTML
    function generatePaginationHTML() {
        if (totalPages <= 1) return '';
        
        let html = '<div class="pagination" style="margin-top: 20px; text-align: center;">';
        
        // 首页和上一页
        if (currentPage > 1) {
            html += `<a href="?id=${postData.id}&page=1" style="margin: 0 5px; padding: 4px 8px; border: 1px solid #ccc; text-decoration: none; color: #0066cc;">首页</a>`;
            html += `<a href="?id=${postData.id}&page=${currentPage - 1}" style="margin: 0 5px; padding: 4px 8px; border: 1px solid #ccc; text-decoration: none; color: #0066cc;">上一页</a>`;
        }
        
        // 页码
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                html += `<span style="margin: 0 5px; padding: 4px 8px; background: #cc0000; color: white;">${i}</span>`;
            } else {
                // 只显示当前页附近的页码
                if (Math.abs(i - currentPage) <= 2 || i === 1 || i === totalPages) {
                    html += `<a href="?id=${postData.id}&page=${i}" style="margin: 0 5px; padding: 4px 8px; border: 1px solid #ccc; text-decoration: none; color: #0066cc;">${i}</a>`;
                } else if (Math.abs(i - currentPage) === 3) {
                    html += `<span style="margin: 0 5px; color: #999;">...</span>`;
                }
            }
        }
        
        // 下一页和末页
        if (currentPage < totalPages) {
            html += `<a href="?id=${postData.id}&page=${currentPage + 1}" style="margin: 0 5px; padding: 4px 8px; border: 1px solid #ccc; text-decoration: none; color: #0066cc;">下一页</a>`;
            html += `<a href="?id=${postData.id}&page=${totalPages}" style="margin: 0 5px; padding: 4px 8px; border: 1px solid #ccc; text-decoration: none; color: #0066cc;">末页</a>`;
        }
        
        html += `</div>`;
        return html;
    }

    threadContainer.innerHTML = `
        <div class="thread-header">
            <div class="thread-title">${postData.title}</div>
            <span>作者：<a href="#" style="color: #0066cc;">${postData.author}</a></span> | 
            <span>发表于：${postData.publishTime}</span> | 
            <span>浏览：${postData.viewCount}次</span>
        </div>
        
        ${currentPagePosts.map((post, index) => {
            const quoteHTML = generateQuoteHTML(post.replyTo, allPosts);
            const plainContent = post.content.replace(/<[^>]*>/g, '').substring(0, 50) + (post.content.replace(/<[^>]*>/g, '').length > 50 ? '...' : '');
            
            return `
                <div class="post" id="post-${post.floor}">
                    ${quoteHTML}
                    <div class="post-header">
                        <div class="poster-info">
                            <div class="avatar">
                                ${post.authorAvatar && post.authorAvatar.length === 1 
                                    ? `<span style="font-size: 24px; color: #666; font-weight: bold;">${post.authorAvatar}</span>` 
                                    : `<img src="${post.authorAvatar || 'images/用户头像.png'}" alt="avatar" style="width:100%; height:100%; border-radius:3px; object-fit:cover;">`
                                }
                            </div>
                            <div>
                                <div class="poster-name ${post.isOp ? 'op' : ''}">${post.author}</div>
                                <div style="font-size: 11px; color: #999;">${post.authorLevel}</div>
                            </div>
                        </div>
                        <div class="post-time">${post.time}</div>
                    </div>
                    <div class="post-content">${post.content}</div>
                    <div class="floor-info">
                        <span class="floor-number">${post.floor}楼</span>
                        ${postData.allowComments !== false ? `<a href="#" class="reply-link" data-floor="${post.floor}" data-author="${post.author}" data-content="${plainContent}">回复</a>` : ''}
                    </div>
                </div>
            `;
        }).join('')}
        
        ${generatePaginationHTML()}
        
        <div class="forum-stats">
            <span>共 ${totalPosts} 楼</span>
            <span>当前第 ${currentPage} / ${totalPages} 页</span>
            <span>最后回复：${postData.comments.length > 0 ? postData.comments[postData.comments.length - 1].time : postData.publishTime}</span>
        </div>
    `;

    setupReplyButtons(postData);
    
    // 页面加载后检查URL锚点，进行高亮
    setTimeout(() => {
        const hash = window.location.hash;
        if (hash.startsWith('#post-')) {
            const floorId = hash.substring(6);
            const targetElement = document.getElementById(`post-${floorId}`);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetElement.style.backgroundColor = '#ffffcc';
                setTimeout(() => {
                    targetElement.style.backgroundColor = '';
                }, 1500);
            }
        }
    }, 100);
}

// 设置回复按钮
function setupReplyButtons(postData) {
    const replyLinks = document.querySelectorAll('.reply-link');
    const replyTargetInput = document.getElementById('reply-target');
    const replyContent = document.getElementById('reply-content');
    const replyBoxTitle = document.querySelector('.reply-box h4');

    replyLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const floor = this.dataset.floor;
            const author = this.dataset.author;
            const content = this.dataset.content;
            
            replyTargetInput.value = floor;
            replyContent.value = `回复 ${author}(${floor}楼)：\n`;
            replyBoxTitle.textContent = `回复 ${author}(${floor}楼)`;
            document.getElementById('cancel-reply').style.display = 'inline';
            replyContent.focus();
        });
    });
}

// 获取当前登录用户信息
async function getCurrentUser() {
    const token = getFlarumToken();
    const userId = localStorage.getItem('flarumUserId');
    
    if (!token || !userId) {
        return null;
    }
    
    try {
        const json = await flarumRequest(`/users/${userId}`);
        if (json?.data) {
            return {
                id: json.data.id,
                username: json.data.attributes?.username || '',
                displayName: json.data.attributes?.displayName || json.data.attributes?.username || '',
                avatar: getUserAvatarUrl(json.data),
                email: json.data.attributes?.email || ''
            };
        }
    } catch (error) {
        console.error('获取当前用户信息失败:', error);
    }
    
    return null;
}

// 更新回复表单以反映登录状态
function updateReplyFormForLoginStatus() {
    const isLoggedIn = !!getFlarumToken();
    const replyBox = document.getElementById('reply-box');
    
    if (!replyBox) return;
    
    if (isLoggedIn) {
        // 已登录：显示用户信息和回复表单
        const username = localStorage.getItem('flarumUsername') || '已登录用户';
        
        replyBox.innerHTML = `
            <h4>发表回复</h4>
            <div class="current-user-info" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
                <img src="images/用户头像.png" alt="头像" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
                <div>
                    <div style="font-weight: bold; color: #333;">${username}</div>
                    <div style="font-size: 12px; color: #999;">Lv.1 新手上路</div>
                </div>
            </div>
            <form class="reply-form" id="reply-form">
                <textarea id="reply-content" placeholder="分享你的看法..."></textarea>
                <input type="hidden" id="reply-target" name="reply-target" value="">
                <div>
                    <button type="submit">发表回复</button>
                    <a href="#" class="cancel-reply" id="cancel-reply" style="display: none;">取消回复</a>
                </div>
            </form>
        `;
        // 重新绑定表单事件
        setupReplyForm();
    } else {
        // 未登录：直接显示登录提示，替换整个回复区域
        replyBox.innerHTML = `
            <h4>发表回复</h4>
            <div style="padding: 20px; background: #fff3f3; border: 1px solid #ffcccc; border-radius: 4px; text-align: center;">
                <div style="font-size: 16px; color: #cc0000; margin-bottom: 10px;">未登录用户不可回复</div>
                <a href="login.html" style="color: #0066cc; text-decoration: none;">点击登录</a>
            </div>
        `;
    }
}

// 设置回复表单事件（只绑定一次）
function setupReplyForm() {
    const replyTargetInput = document.getElementById('reply-target');
    const cancelReply = document.getElementById('cancel-reply');
    const replyContent = document.getElementById('reply-content');
    const replyBoxTitle = document.querySelector('.reply-box h4');
    const replyForm = document.getElementById('reply-form');
    const replyNameInput = document.getElementById('reply-name');

    // 取消回复按钮
    cancelReply.removeEventListener('click', cancelReplyHandler);
    cancelReply.addEventListener('click', cancelReplyHandler);

    function cancelReplyHandler(e) {
        e.preventDefault();
        replyTargetInput.value = '';
        replyContent.value = '';
        replyBoxTitle.textContent = '发表回复';
        cancelReply.style.display = 'none';
    }

    // 表单提交（使用事件委托或移除旧事件）
    replyForm.removeEventListener('submit', submitHandler);
    replyForm.addEventListener('submit', submitHandler);

    async function submitHandler(e) {
        e.preventDefault();
        
        const name = replyNameInput?.value?.trim() || '';
        const content = replyContent.value.trim();
        const replyTo = replyTargetInput.value;

        if (!content) {
            alert('请输入回复内容');
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('id') || '1';
        let postData = await loadPostData(postId);
        if (!postData) {
            alert('无法获取帖子数据');
            return;
        }

        if (isFlarumConfigured()) {
            const raw = content.replace(/^回复\s+.*?\n/, '').trim();
            try {
                await flarumCreatePost({ discussionId: postData.id, content: raw || content });
                const refreshed = await loadPostData(postId);
                if (refreshed) renderForumThread(refreshed);

                replyForm.reset();
                replyTargetInput.value = '';
                replyBoxTitle.textContent = '发表回复';
                cancelReply.style.display = 'none';
                alert('回复发表成功！');
            } catch (error) {
                console.error('回帖失败:', error);
                console.error('回帖失败详情:', error.detail);
                alert('回复发表失败：' + (error.detail || error.message));
            }
            return;
        }

        // 非Flarum模式需要昵称
        if (!name) {
            alert('请输入昵称');
            return;
        }

        const newComment = {
            id: Date.now(),
            author: name,
            authorLevel: 'Lv.1 新手上路',
            authorAvatar: 'images/用户头像.png',
            time: "2010-04-25 " + new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            floor: postData.comments.length + 2,
            content: `<p>${content.replace(/\n/g, '</p><p>')}</p>`,
            replyTo: replyTo ? parseInt(replyTo) : null
        };

        postData.comments.push(newComment);
        
        localStorage.setItem(`post_${postData.id}_new_comments`, JSON.stringify(postData.comments));
        
        renderForumThread(postData);
        
        replyForm.reset();
        replyTargetInput.value = '';
        replyBoxTitle.textContent = '发表回复';
        cancelReply.style.display = 'none';
        
        alert('回复发表成功！');
    }
}

// 更新用户导航链接
function updateUserLinks() {
    const userLinksContainer = document.getElementById('user-links-container');
    if (!userLinksContainer) return;
    
    const userLoggedIn = !!getFlarumToken();
    
    if (userLoggedIn) {
        userLinksContainer.innerHTML = `
            <a href="profile.html">个人资料</a>
            <a href="#" id="logout-btn">退出登录</a>
        `;
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                clearFlarumToken();
                window.location.href = 'index.html';
            });
        }
    } else {
        userLinksContainer.innerHTML = `
            <a href="login.html" id="login-btn">登录</a>
            <a href="register.html" id="register-btn">注册</a>
        `;
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

// 设置浮窗导航图标
function setupFloatingAd() {
    const ad = document.querySelector('.floating-ad');
    if (!ad) return;
    
    // 立即显示浮窗导航图标
    ad.style.display = 'block';
    ad.style.position = 'fixed'; // 确保是 fixed 布局
    
    let adWidth = 0;
    let adHeight = 0;
    let windowWidth = 0;
    let windowHeight = 0;
    
    // 随机初始位置和速度
    let x = Math.random() * (window.innerWidth - 100);
    let y = Math.random() * (window.innerHeight - 100);
    let dx = (Math.random() > 0.5 ? 1 : -1) * (0.75 + Math.random() * 1);
    let dy = (Math.random() > 0.5 ? 1 : -1) * (0.75 + Math.random() * 1);
    let animationId = null;
    let isPaused = false;
    
    function updateDimensions() {
        adWidth = ad.offsetWidth;
        adHeight = ad.offsetHeight;
        windowWidth = window.innerWidth;
        windowHeight = window.innerHeight;
    }
    
    function animate() {
        if (isPaused) return;

        // 边界检测和反弹
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
        ad.style.transform = 'none';
        
        animationId = requestAnimationFrame(animate);
    }
    
    // 等待加载后开始
    window.addEventListener('load', function() {
        updateDimensions();
        animate();
    });
    
    ad.addEventListener('mouseenter', function() {
        isPaused = true;
    });
    
    ad.addEventListener('mouseleave', function() {
        isPaused = false;
        updateDimensions();
        animate();
    });
    
    window.addEventListener('resize', updateDimensions);
}

// 设置浮窗广告2
function setupFloatingAd2() {
    const ad = document.querySelector('.floating-ad2');
    if (!ad) return;
    
    // 立即显示浮窗广告
    ad.style.display = 'block';
    ad.style.position = 'fixed';
    
    let adWidth = 0;
    let adHeight = 0;
    let windowWidth = 0;
    let windowHeight = 0;
    
    // 随机初始位置和速度
    let x = Math.random() * (window.innerWidth - 100);
    let y = Math.random() * (window.innerHeight - 100);
    let dx = (Math.random() > 0.5 ? 1 : -1) * (0.75 + Math.random() * 1);
    let dy = (Math.random() > 0.5 ? 1 : -1) * (0.75 + Math.random() * 1);
    let animationId = null;
    let isPaused = false;
    
    function updateDimensions() {
        adWidth = ad.offsetWidth;
        adHeight = ad.offsetHeight;
        windowWidth = window.innerWidth;
        windowHeight = window.innerHeight;
    }
    
    function animate() {
        if (isPaused) return;

        // 边界检测和反弹
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
        ad.style.transform = 'none';
        
        animationId = requestAnimationFrame(animate);
    }
    
    // 等待加载后开始
    window.addEventListener('load', function() {
        updateDimensions();
        animate();
    });
    
    ad.addEventListener('mouseenter', function() {
        isPaused = true;
    });
    
    ad.addEventListener('mouseleave', function() {
        isPaused = false;
        updateDimensions();
        animate();
    });
    
    window.addEventListener('resize', updateDimensions);
}

// 设置右下角弹窗广告
function setupPopupAd() {
    const popupAd = document.querySelector('.popup-ad');
    if (!popupAd) return;
    
    const closeButton = popupAd.querySelector('.popup-close');
    if (!closeButton) return;
    
    const leftCloseBtn = document.querySelector('.left-close-btn');
    const popupAudio = document.getElementById('popup-audio');
    
    function updateLeftCloseBtnPosition() {
        if (leftCloseBtn && popupAd.style.display === 'block') {
            const popupHeight = popupAd.offsetHeight;
            leftCloseBtn.style.bottom = popupHeight + 'px';
            leftCloseBtn.style.right = '0';
        }
    }
    
    // 立即显示弹窗广告和左侧假关闭按钮
    setTimeout(function() {
        console.log('Showing popup ad...');
        popupAd.style.display = 'block';
        popupAd.style.visibility = 'visible';
        popupAd.style.opacity = '1';
        if (leftCloseBtn) {
            leftCloseBtn.style.display = 'block';
            leftCloseBtn.style.visibility = 'visible';
            leftCloseBtn.style.opacity = '1';
            updateLeftCloseBtnPosition();
        }
    }, 3000);
    
    // 鼠标悬停时开始动画和播放音频
    popupAd.addEventListener('mouseenter', function() {
        popupAd.style.animation = 'pulse 0.5s infinite ease-in-out';
        if (popupAudio) {
            popupAudio.play().catch(function(error) {
                console.log('Popup audio playback prevented:', error);
            });
        }
    });
    
    // 鼠标移开时停止动画和暂停音频
    popupAd.addEventListener('mouseleave', function() {
        popupAd.style.animation = 'none';
        if (popupAudio) {
            popupAudio.pause();
        }
    });
    
    // 监听窗口大小变化，更新假关闭按钮位置
    window.addEventListener('resize', function() {
        updateLeftCloseBtnPosition();
    });
    
    closeButton.addEventListener('click', function(e) {
        e.stopPropagation();
        popupAd.style.display = 'none';
        if (leftCloseBtn) {
            leftCloseBtn.style.display = 'none';
        }
        if (popupAudio) {
            popupAudio.pause();
        }
    });

    // 处理假关闭按钮的点击跳转
    const fakeCloseBtn = popupAd.querySelector('.fake-close-btn');
    if (fakeCloseBtn) {
        fakeCloseBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            window.location.href = 'https://www.bilibili.com/video/BV1UT42167xb?t=0';
        });
    }

    if (leftCloseBtn) {
        const sideFakeBtn = leftCloseBtn.querySelector('.popup-close');
        if (sideFakeBtn) {
            sideFakeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                window.location.href = 'https://www.bilibili.com/video/BV1UT42167xb?t=0';
            });
        }
    }
}
