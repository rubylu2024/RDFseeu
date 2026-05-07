// 椤甸潰鍔犺浇瀹屾垚鍚庢墽琛?
// 椤甸潰鍔犺浇瀹屾垚鍚庢墽琛屽凡缁忓寘鍚湪涓嬫柟鐨?window.addEventListener('DOMContentLoaded', ...)

const FLARUM_BASE_URL = '';
const AD_TARGET_URL = 'https://www.dihai.wiki/';
const POST_PAGE_SIZE = 20;

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
    window.dispatchEvent(new Event('flarum-auth-changed'));
}

let lastUserErrorMessage = '';

function setLastUserErrorMessage(message) {
    lastUserErrorMessage = typeof message === 'string' ? message : '';
}

function consumeLastUserErrorMessage() {
    const message = lastUserErrorMessage;
    lastUserErrorMessage = '';
    return message;
}

function parseApiErrorDetail(detail) {
    if (!detail || typeof detail !== 'string') return null;

    try {
        const parsed = JSON.parse(detail);
        const firstError = Array.isArray(parsed?.errors) ? parsed.errors[0] : null;
        return {
            raw: parsed,
            status: firstError?.status ? Number(firstError.status) : null,
            code: firstError?.code || '',
            title: firstError?.title || '',
            detail: firstError?.detail || ''
        };
    } catch {
        return null;
    }
}

function getPreferredDisplayName(userAttributes, fallback = '鍖垮悕鐢ㄦ埛') {
    const preferredName = [
        userAttributes?.nickname,
        userAttributes?.displayName,
        userAttributes?.username
    ].find((value) => typeof value === 'string' && value.trim());

    return preferredName ? preferredName.trim() : fallback;
}

function getFriendlyErrorMessage(error, context = 'generic') {
    const parsed = error?.apiError || parseApiErrorDetail(error?.detail);
    const status = error?.httpStatus || parsed?.status || null;
    const code = parsed?.code || error?.code || '';
    const rawMessage = String(error?.message || '');
    const activationHint = '璇风‘璁よ处鍙峰凡缁忔縺娲伙紝濡備粛鏈夐棶棰樿鑱旂郴缃戠銆?;

    if (error instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(rawMessage)) {
        return '缃戠粶杩炴帴寮傚父锛屾殏鏃舵棤娉曡繛鎺ヨ鍧涳紝璇锋鏌ョ綉缁滃悗閲嶈瘯銆?;
    }

    if (status === 401 || code === 'not_authenticated') {
        switch (context) {
            case 'login':
                return '鐧诲綍澶辫触锛岃妫€鏌ヨ处鍙峰拰瀵嗙爜鏄惁姝ｇ‘銆?;
            case 'create_discussion':
            case 'create_post':
            case 'delete_post':
            case 'delete_discussion':
            case 'profile':
            case 'upload_image':
            case 'upload_avatar':
                return '鐧诲綍鐘舵€佸凡澶辨晥锛岃閲嶆柊鐧诲綍鍚庡啀璇曘€?;
            default:
                return '褰撳墠鐧诲綍鐘舵€佸凡澶辨晥锛岃閲嶆柊鐧诲綍鍚庡啀璇曘€?;
        }
    }

    if (status === 403 || code === 'permission_denied') {
        switch (context) {
            case 'create_discussion':
                return `褰撳墠璐﹀彿娌℃湁鍙戝笘鏉冮檺銆?{activationHint}`;
            case 'create_post':
                return `褰撳墠璐﹀彿娌℃湁鍥炲笘鏉冮檺銆?{activationHint}`;
            case 'delete_post':
                return `褰撳墠璐﹀彿娌℃湁鍒犻櫎杩欐潯鍥炲鐨勬潈闄愶紝鍙兘鍒犻櫎鑷繁鐨勫唴瀹广€?{activationHint}`;
            case 'delete_discussion':
                return `褰撳墠璐﹀彿娌℃湁鍒犻櫎杩欎釜甯栧瓙鐨勬潈闄愶紝鍙兘鍒犻櫎鑷繁鐨勫唴瀹广€?{activationHint}`;
            case 'upload_image':
                return `褰撳墠璐﹀彿娌℃湁涓婁紶鍥剧墖鐨勬潈闄愩€?{activationHint}`;
            case 'upload_avatar':
                return `褰撳墠璐﹀彿娌℃湁淇敼澶村儚鐨勬潈闄愩€?{activationHint}`;
            case 'profile':
                return `褰撳墠璐﹀彿娌℃湁鏌ョ湅璇ラ〉闈㈠唴瀹圭殑鏉冮檺銆?{activationHint}`;
            case 'load_discussion':
                return `褰撳墠璐﹀彿鏆傛椂娌℃湁鏌ョ湅璇ュ唴瀹圭殑鏉冮檺銆?{activationHint}`;
            case 'register':
                return '褰撳墠璁哄潧鏆備笉鍏佽鏅€氱敤鎴锋敞鍐屻€?;
            default:
                return `褰撳墠璐﹀彿娌℃湁鎵ц姝ゆ搷浣滅殑鏉冮檺銆?{activationHint}`;
        }
    }

    if (status === 404 || code === 'not_found') {
        switch (context) {
            case 'load_discussion':
                return '杩欑瘒甯栧瓙涓嶅瓨鍦紝鎴栧凡缁忚鍒犻櫎銆?;
            case 'profile':
                return '鏈壘鍒板搴旂殑鐢ㄦ埛璧勬枡銆?;
            default:
                return '浣犺闂殑鍐呭涓嶅瓨鍦紝鎴栧凡缁忚鍒犻櫎銆?;
        }
    }

    if (status === 429 || code === 'rate_limit_exceeded') {
        return '鎿嶄綔澶绻佷簡锛岃绋嶅悗鍐嶈瘯銆?;
    }

    if (code === 'validation_error') {
        switch (context) {
            case 'register':
                return '娉ㄥ唽淇℃伅濉啓涓嶅畬鏁达紝鎴栨牸寮忎笉姝ｇ‘锛岃妫€鏌ュ悗閲嶈瘯銆?;
            case 'create_discussion':
                return '甯栧瓙鍐呭涓嶇鍚堣姹傦紝璇锋鏌ユ爣棰樺拰姝ｆ枃鍚庨噸璇曘€?;
            case 'create_post':
                return '鍥炲鍐呭涓嶇鍚堣姹傦紝璇蜂慨鏀瑰悗鍐嶈瘯銆?;
            default:
                return '鎻愪氦鐨勪俊鎭笉绗﹀悎瑕佹眰锛岃妫€鏌ュ悗閲嶈瘯銆?;
        }
    }

    if (status && status >= 500) {
        return '璁哄潧鏈嶅姟鍣ㄦ殏鏃剁箒蹇欙紝璇风◢鍚庡啀璇曘€?;
    }

    switch (context) {
        case 'login':
            return '鐧诲綍澶辫触锛岃妫€鏌ヨ处鍙峰拰瀵嗙爜鍚庨噸璇曘€?;
        case 'register':
            return '娉ㄥ唽澶辫触锛岃绋嶅悗鍐嶈瘯銆?;
        case 'create_discussion':
            return '鍙戝笘澶辫触锛岃绋嶅悗鍐嶈瘯銆?;
        case 'create_post':
            return '鍥炲澶辫触锛岃绋嶅悗鍐嶈瘯銆?;
        case 'delete_post':
        case 'delete_discussion':
            return '鍒犻櫎澶辫触锛岃绋嶅悗鍐嶈瘯銆?;
        case 'load_discussion':
            return '甯栧瓙鏆傛椂鏃犳硶鍔犺浇锛岃鍒锋柊椤甸潰鍚庨噸璇曘€?;
        case 'profile':
            return '涓汉璧勬枡鏆傛椂鏃犳硶鍔犺浇锛岃绋嶅悗鍐嶈瘯銆?;
        case 'upload_image':
            return '鍥剧墖涓婁紶澶辫触锛岃绋嶅悗鍐嶈瘯銆?;
        case 'upload_avatar':
            return '澶村儚涓婁紶澶辫触锛岃绋嶅悗鍐嶈瘯銆?;
        default:
            return '鎿嶄綔澶辫触锛岃绋嶅悗鍐嶈瘯銆?;
    }
}

function buildPostFloorLink(discussionId, floor) {
    const normalizedFloor = Number(floor);
    const safeFloor = Number.isFinite(normalizedFloor) && normalizedFloor > 0 ? normalizedFloor : 1;
    const targetPage = Math.max(1, Math.ceil(safeFloor / POST_PAGE_SIZE));

    return `post.html?id=${encodeURIComponent(discussionId)}&page=${targetPage}#post-${safeFloor}`;
}

function isOriginalPosterReply(post, postData) {
    if (!post || !postData) return false;
    if (post.isOp) return true;

    const postUserId = post.userId;
    const originalPosterUserId = postData.userId;

    if (postUserId != null && originalPosterUserId != null) {
        return String(postUserId) === String(originalPosterUserId);
    }

    return !!(post.author && postData.author && post.author === postData.author);
}

// Flarum 鐧诲綍
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
                // 灏濊瘯鑾峰彇鐢ㄦ埛淇℃伅
                try {
                    const userJson = await flarumRequest(`/users/${json.userId}`, { auth: true });
                    if (userJson?.data?.attributes) {
                        const displayName = getPreferredDisplayName(userJson.data.attributes, '宸茬櫥褰曠敤鎴?);
                        localStorage.setItem('flarumUsername', displayName);
                    }
                } catch (e) {
                    console.error('鑾峰彇鐢ㄦ埛淇℃伅澶辫触:', e);
                }
            }
            updateUserLinks();
            window.dispatchEvent(new Event('flarum-auth-changed'));
            return true;
        }
        return false;
    } catch (e) {
        console.error('Flarum login error:', e);
        setLastUserErrorMessage(getFriendlyErrorMessage(e, 'login'));
        return false;
    }
}

// Flarum 娉ㄥ唽
async function flarumRegister(username, email, password) {
    const json = await flarumRequest('/users', {
        method: 'POST',
        json: {
            data: {
                type: 'users',
                attributes: {
                    username,
                    email,
                    password
                }
            }
        }
    });

    return !!(json?.data?.id);
}

async function flarumRequest(path, options = {}) {
    const apiBase = getFlarumApiBase();
    const url = apiBase + (path.startsWith('/') ? path : '/' + path);

    const headers = {
        'Accept': 'application/vnd.api+json',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers
    };

    if (options.json !== undefined) {
        headers['Content-Type'] = 'application/vnd.api+json';
    } else if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const token = getFlarumToken();
    const userId = localStorage.getItem('flarumUserId');

    const shouldAttachAuthHeader = !!(token && options.auth !== false && !headers.Authorization);

    if (shouldAttachAuthHeader) {
        headers.Authorization = userId
            ? `Token ${token}; userId=${userId}`
            : `Token ${token}`;
    }

    const createFetchOptions = (requestHeaders) => ({
        method: options.method || 'GET',
        headers: requestHeaders,
        body: options.json !== undefined ? JSON.stringify(options.json) : options.body
    });

    let response = await fetch(url, createFetchOptions(headers));
    const initialStatus = response.status;

    // 瀵瑰叕寮€鎺ュ彛鍋氫竴娆℃棤閴存潈閲嶈瘯锛岄伩鍏嶆湰鍦拌繃鏈?token 瀵艰嚧鈥滅櫥褰曞悗鍙嶈€岀湅涓嶅埌鍐呭鈥濄€?
    if (
        (response.status === 401 || response.status === 403) &&
        shouldAttachAuthHeader &&
        options.auth !== true
    ) {
        const retryHeaders = { ...headers };
        delete retryHeaders.Authorization;
        response = await fetch(url, createFetchOptions(retryHeaders));

        // 閲嶈瘯鎴愬姛璇存槑鏄湰鍦?token 闂锛屾竻鐞嗗悗鍚屾鍒锋柊鐧诲綍鎬?UI銆?
        if (response.ok && initialStatus === 401) {
            clearFlarumToken();
        }
    }

    if (!response.ok) {
        let detail = '';
        try {
            const errorJson = await response.json();
            detail = JSON.stringify(errorJson);
        } catch {
            detail = await response.text();
        }
        const error = new Error(`Flarum API 璇锋眰澶辫触: ${response.status} ${response.statusText}`);
        error.detail = detail;
        error.httpStatus = response.status;
        error.apiError = parseApiErrorDetail(detail);
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
    return 'images/鐢ㄦ埛澶村儚.png';
}

function getFlarumReplyStorageKey(discussionId, postId) {
    return `flarumReplyTo:${String(discussionId)}:${String(postId)}`;
}

function getStoredFlarumReplyToFloor(discussionId, postId) {
    const raw = localStorage.getItem(getFlarumReplyStorageKey(discussionId, postId));
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
}

function storeFlarumReplyToFloor(discussionId, postId, replyToFloor) {
    const n = Number(replyToFloor);
    if (!Number.isFinite(n) || n <= 0) return;
    localStorage.setItem(getFlarumReplyStorageKey(discussionId, postId), String(n));
}

function extractReplyMetaFromContentHtml(contentHtml) {
    const original = typeof contentHtml === 'string' ? contentHtml : '';

    try {
        const doc = new DOMParser().parseFromString(original, 'text/html');
        const first = doc.body.firstElementChild;

        if (first && first.tagName === 'P') {
            let text = (first.textContent || '').trim();

            // 鏀寔锛?
            // 鍥炲 3妤硷細
            // 鍥炲 寮犱笁(3妤?锛?
            // 鍥炲 寮犱笁(3妤?锛歕n\n姝ｆ枃
            const m = text.match(/^鍥炲\s+(?:.*?\()?(\d+)妤糪)?锛??:\\n\\n|\n\n|\s*)?/);

            if (m) {
                const replyToFloor = Number(m[1]);

                text = text.replace(/^鍥炲\s+(?:.*?\()?(\d+)妤糪)?锛??:\\n\\n|\n\n|\s*)?/, '').trim();

                if (text) {
                    first.textContent = text;
                } else {
                    first.remove();
                }

                return {
                    replyToFloor,
                    cleanedHtml: doc.body.innerHTML
                        .replace(/\\n\\n/g, '')
                        .replace(/\n\n/g, '')
                };
            }
        }

        return {
            replyToFloor: null,
            cleanedHtml: original
                .replace(/\\n\\n/g, '')
                .replace(/\n\n/g, '')
        };
    } catch {
        return {
            replyToFloor: null,
            cleanedHtml: original
                .replace(/\\n\\n/g, '')
                .replace(/\n\n/g, '')
        };
    }
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

    // 鍒涘缓甯栧瓙ID鍒版ゼ灞傚彿鐨勬槧灏?
    const postIdToFloor = new Map();
    posts.forEach((p) => {
        const number = p.attributes?.number;
        if (typeof number === 'number') {
            postIdToFloor.set(String(p.id), number);
        }
    });

    const firstPost = posts.find((p) => p.attributes?.number === 1) || posts[0];
    const firstUserId = firstPost?.relationships?.user?.data?.id || discussion.relationships?.user?.data?.id;
    const firstUser = firstUserId ? pickIncluded(included, 'users', firstUserId) : null;

    const viewCount = discussion.attributes?.viewCount;
    const commentCount = discussion.attributes?.commentCount;

    const postData = {
        id: Number(discussion.id),
        userId: firstUserId ? Number(firstUserId) : null,
        title: discussion.attributes?.title || '',
        author: getPreferredDisplayName(firstUser?.attributes),
        authorLevel: 'Lv.1 鏂版墜涓婅矾',
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

                const html = p.attributes?.contentHtml || p.attributes?.content || '';
                const extracted = extractReplyMetaFromContentHtml(html);
                const stored = getStoredFlarumReplyToFloor(discussion.id, p.id);
                const replyTo = extracted.replyToFloor || stored || null;

                return {
                    id: Number(p.id),
                    userId: userId ? Number(userId) : null,
                    author: getPreferredDisplayName(user?.attributes),
                    authorLevel: 'Lv.1 鏂版墜涓婅矾',
                    authorAvatar: getUserAvatarUrl(user),
                    time: formatFlarumTime(p.attributes?.createdAt),
                    floor: typeof number === 'number' ? number : 0,
                    content: extracted.cleanedHtml,
                    replyTo
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

    try {
        // 鑾峰彇 discussion 鍩烘湰淇℃伅
        const discussionJson = await flarumRequest(
            `/discussions/${encodeURIComponent(id)}?include=user`,
            { auth: false }
        );

        if (!discussionJson?.data) {
            return null;
        }

        // 鍙姞杞藉墠30鏉″笘瀛愶紙鏍稿績浼樺寲鐐癸級
        const limit = 30;

        const postsJson = await flarumRequest(
            `/posts?filter[discussion]=${encodeURIComponent(id)}&sort=number&page[limit]=${limit}&page[offset]=0&include=user`,
            { auth: false }
        );

        const allPosts = Array.isArray(postsJson.data) ? postsJson.data : [];

        // 鍚堝苟鏁版嵁缁撴瀯锛堜繚鎸佸吋瀹癸級
        discussionJson.included = [
            ...(discussionJson.included || []),
            ...(postsJson.included || []),
            ...allPosts
        ];

        discussionJson.data.relationships = discussionJson.data.relationships || {};
        discussionJson.data.relationships.posts = {
            data: allPosts.map(p => ({ type: 'posts', id: String(p.id) }))
        };

        return flarumDiscussionToPostData(discussionJson);
    } catch (error) {
        console.error('flarumLoadDiscussion: 鍔犺浇甯栧瓙澶辫触:', error);
        console.error('閿欒璇︽儏:', error.detail);
        throw error;
    }
}

async function flarumLoadDiscussionList() {
    try {
        const json = await flarumRequest('/discussions?sort=-createdAt&page[limit]=20&include=user', { auth: false });
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
                author: getPreferredDisplayName(user?.attributes),
                date: (d.attributes?.createdAt || '').slice(0, 10),
                views: typeof viewCount === 'number' ? viewCount : (typeof commentCount === 'number' ? commentCount : 0)
            };
        });
    } catch (error) {
        console.warn('鑾峰彇甯栧瓙鍒楄〃澶辫触:', error);
        return [];
    }
}

// 鑾峰彇鏈€鏂板洖澶嶅垪琛?
async function flarumLoadRecentReplies() {
    try {
        const json = await flarumRequest('/posts?sort=-createdAt&page[limit]=20&include=discussion,user', { auth: false });
        const posts = Array.isArray(json?.data) ? json.data : [];
        const included = json?.included || [];
        
        const results = [];
        const seenDiscussionIds = new Set();
        
        for (const post of posts) {
            // 璺宠繃甯栧瓙鐨勭涓€鏉★紙涓婚甯栵級锛屽彧鏄剧ず鍥炲
            if (post.attributes?.number === 1) continue;
            
            const discussionId = post.relationships?.discussion?.data?.id;
            if (!discussionId || seenDiscussionIds.has(discussionId)) continue;
            
            // 鎵惧埌瀵瑰簲鐨勮璁?
            const discussion = included.find(i => i.type === 'discussions' && i.id === discussionId);
            const userId = post.relationships?.user?.data?.id;
            const user = userId ? included.find(i => i.type === 'users' && i.id === userId) : null;
            
            seenDiscussionIds.add(discussionId);
            
            results.push({
                discussionId: Number(discussionId),
                postId: Number(post.id),
                floor: post.attributes?.number, // 娣诲姞妤煎眰鍙风敤浜庨敋鐐硅烦杞?
                title: discussion?.attributes?.title || '',
                author: getPreferredDisplayName(user?.attributes),
                time: post.attributes?.createdAt || '',
                content: post.attributes?.content || ''
            });
            
            // 鍙彇5鏉′笉閲嶅鐨勫洖澶?
            if (results.length >= 5) break;
        }
        
        return results;
    } catch (error) {
        console.warn('鑾峰彇鏈€鏂板洖澶嶅け璐?', error);
        return [];
    }
}

// 鍔ㄦ€佸姞杞介椤电儹甯栧拰杩戞湡甯栧瓙閾炬帴
async function renderDynamicHomeLinks() {
    try {
        const discussions = await flarumLoadDiscussionList();
        
        const hotTopicsList = document.getElementById('hot-topics-list');
        const recentHotList = document.getElementById('recent-hot-list');
        
        if (hotTopicsList) {
            // 鍥哄畾缃《甯栨爣棰?
            const pin1Title = '绾㈣溁铚撹鍧浡风増鍔″叕鍛?;
            const pin2Title = '鍏充簬寮€灞曗€滄嫆缁濋粍璧屾瘨銆佸叡寤哄钩瀹夌ぞ鍖衡€濆浼犳暀鑲叉椿鍔ㄧ殑閫氱煡';
            const hotTitle = '姹傚姪甯栵紝鐪熷疄缁忓巻锛屾劅瑙夎嚜宸辫鑴戞帶浜?;
            
            // 浠嶢PI鏁版嵁涓壘鍒板搴旂殑甯栧瓙
            const pin2Post = discussions.find(d => d.title.includes(pin2Title) || d.title.includes('鎷掔粷榛勮祵姣?));
            const hotPost = discussions.find(d => d.title.includes(hotTitle) || d.title.includes('鑴戞帶') || d.title.includes('鑴戞帶浜?));
            
            // 杩囨护鎺夊凡鍥哄畾鐨勫笘瀛愶紝鐢ㄤ簬濉厖鍏朵粬浣嶇疆
            const remainingDiscussions = discussions.filter(d => 
                !d.title.includes(pin2Title) && !d.title.includes('鎷掔粷榛勮祵姣?) &&
                !d.title.includes(hotTitle) && !d.title.includes('鑴戞帶') && !d.title.includes('鑴戞帶浜?)
            );
            
            // 鏋勫缓鐑笘姒滐紙鍏?2鏉★級
            const hotTopics = [];
            
            // 绗?鏉★細鍥哄畾閾炬帴鍒拌繚瑙勫叕绀?
            hotTopics.push(`<li><span class="pin-badge">缃《</span><a href="violation.html">${pin1Title}</a></li>`);
            
            // 绗?鏉★細鍥哄畾缃《甯?
            if (pin2Post) {
                hotTopics.push(`<li><span class="pin-badge">缃《</span><a href="post.html?id=${pin2Post.id}">${pin2Post.title}</a></li>`);
            }
            
            // 绗?-6鏉★細鎸夌儹搴︽帓搴忕殑鏅€氬笘瀛?
            const normalPosts = remainingDiscussions.slice(0, 4);
            normalPosts.forEach(p => {
                hotTopics.push(`<li><a href="post.html?id=${p.id}">${p.title}</a></li>`);
            });
            
            // 绗?鏉★細鍥哄畾HOT甯?
            if (hotPost) {
                hotTopics.push(`<li><span class="hot-badge">HOT</span><a href="post.html?id=${hotPost.id}">${hotPost.title}</a></li>`);
            }
            
            // 绗?-12鏉★細鎸夌儹搴︽帓搴忕殑鏅€氬笘瀛?
            const remainingPosts = remainingDiscussions.slice(4, 9);
            remainingPosts.forEach(p => {
                hotTopics.push(`<li><a href="post.html?id=${p.id}">${p.title}</a></li>`);
            });
            
            // 濡傛灉鎬绘暟涓嶈冻12鏉★紝鐢ㄥ墿浣欏笘瀛愯ˉ榻?
            if (hotTopics.length < 12 && remainingDiscussions.length > 9) {
                remainingDiscussions.slice(9, 12 - hotTopics.length + 9).forEach(p => {
                    hotTopics.push(`<li><a href="post.html?id=${p.id}">${p.title}</a></li>`);
                });
            }
            
            hotTopicsList.innerHTML = hotTopics.join('');
        }
        
        // 鏈€鏂板彂甯栵細鏄剧ず鏈€鏂?0涓笘瀛愶紝鎸夋棩鏈熼『搴?
        if (recentHotList && discussions.length > 0) {
            recentHotList.innerHTML = discussions.slice(0, 20).map(p => 
                `<li><a href="post.html?id=${p.id}">${p.title}</a></li>`
            ).join('');
        }
    } catch (error) {
        console.warn('鍔ㄦ€佸姞杞介椤靛笘瀛愬垪琛ㄥけ璐?', error);
        // 鍗充娇鍔犺浇澶辫触涔熶笉鏄剧ず閿欒淇℃伅锛屼繚鎸侀〉闈㈠畨闈?
    }
}



async function flarumCreateDiscussion({ title, content, tagIds = [] }) {
    const token = getFlarumToken();
    if (!token) {
        alert('璇峰厛鐧诲綍鍚庡啀鍙戝笘銆?);
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
        auth: true,
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
        alert('璇峰厛鐧诲綍鍚庡啀鍥炲笘銆?);
        return null;
    }

    const json = await flarumRequest('/posts', {
        method: 'POST',
        auth: true,
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

// 鍒犻櫎甯栧瓙锛堟敼涓烘洿鏂板笘瀛愬唴瀹逛负鍒犻櫎鎻愮ず锛?
async function flarumDeletePost(postId, floor) {
    const token = getFlarumToken();
    if (!token) {
        alert('璇峰厛鐧诲綍鍚庡啀鎿嶄綔銆?);
        return false;
    }

    try {
        const currentUsername = localStorage.getItem('flarumUsername') || '鍖垮悕鐢ㄦ埛';
        const now = new Date();
        const deleteTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        
        // 鏋勯€犲垹闄ゆ彁绀哄唴瀹癸紙浣跨敤鐗规畩鏍囪渚夸簬璇嗗埆锛?
        const deleteContent = `[DELETED]{"deletedBy":"${currentUsername}","deletedAt":"${deleteTime}"}[/DELETED]`;
        
        // 浣跨敤PATCH鏇存柊甯栧瓙鍐呭锛岃€屼笉鏄疍ELETE鍒犻櫎
        await flarumRequest(`/posts/${postId}`, {
            method: 'PATCH',
            auth: true,
            json: {
                data: {
                    type: 'posts',
                    id: String(postId),
                    attributes: {
                        content: deleteContent
                    }
                }
            }
        });
        
        return true;
    } catch (error) {
        console.error('鍒犻櫎甯栧瓙澶辫触:', error);
        alert(getFriendlyErrorMessage(error, 'delete_post'));
        return false;
    }
}

// 妫€鏌ュ苟瑙ｆ瀽鍒犻櫎鏍囪
function parseDeletedContent(content) {
    const deletedMatch = content.match(/\[DELETED\](\{.*?\})\[\/DELETED\]/);
    if (deletedMatch) {
        try {
            const deleteInfo = JSON.parse(deletedMatch[1]);
            return {
                deleted: true,
                deletedBy: deleteInfo.deletedBy || '鍖垮悕鐢ㄦ埛',
                deletedAt: deleteInfo.deletedAt || ''
            };
        } catch {
            return null;
        }
    }
    return null;
}

// 鍒犻櫎鏁翠釜璁ㄨ锛堝笘瀛愶級
async function flarumDeleteDiscussion(discussionId) {
    const token = getFlarumToken();
    if (!token) {
        alert('璇峰厛鐧诲綍鍚庡啀鎿嶄綔銆?);
        return false;
    }

    try {
        await flarumRequest(`/discussions/${discussionId}`, {
            method: 'DELETE',
            auth: true
        });
        return true;
    } catch (error) {
        console.error('鍒犻櫎璁ㄨ澶辫触:', error);
        alert(getFriendlyErrorMessage(error, 'delete_discussion'));
        return false;
    }
}

// 妫€鏌ョ敤鎴锋槸鍚︽湁鏉冮檺鍒犻櫎甯栧瓙
async function canDeletePost(post) {
    const token = getFlarumToken();
    if (!token) return false;
    
    const currentUserId = localStorage.getItem('flarumUserId');
    
    // 濡傛灉鏄嚜宸辩殑甯栧瓙锛屽彲浠ュ垹闄?
    if (post.userId && currentUserId && String(post.userId) === String(currentUserId)) {
        return true;
    }
    
    // 妫€鏌ユ槸鍚︽槸绠＄悊鍛樻垨鐗堜富锛堢畝鍖栧鐞嗭級
    try {
        const userJson = await flarumRequest(`/users/${currentUserId}`, { auth: true });
        const groups = userJson?.data?.relationships?.groups?.data || [];
        // 妫€鏌ユ槸鍚﹀湪绠＄悊鍛樻垨鐗堜富缁?
        const isAdminOrMod = groups.some(g => ['1', '2'].includes(g.id)); // 1=绠＄悊鍛? 2=鐗堜富
        return isAdminOrMod;
    } catch {
        return false;
    }
}

// 鍔ㄦ€佸姞杞藉笘瀛愭暟鎹?
async function loadPostData(postId) {
    try {
        console.log('褰撳墠浣跨敤鐨勬槸 Flarum API 鐗堟湰 loadPostData');
        console.log('loadPostData: 寮€濮嬪姞杞藉笘瀛愭暟鎹紝postId:', postId);
        
        // 鏄剧ず鍔犺浇鐘舵€?
        const threadContainer = document.getElementById('forum-thread');
        if (threadContainer) {
            threadContainer.innerHTML = '<div style="padding: 20px; text-align: center;">鍔犺浇涓?..</div>';
        }
        
        if (isFlarumConfigured()) {
            console.log('loadPostData: 灏濊瘯浠嶧larum API鍔犺浇甯栧瓙');
            const fromApi = await flarumLoadDiscussion(postId);
            console.log('loadPostData: Flarum API杩斿洖缁撴灉:', fromApi);
            if (fromApi) {
                console.log('loadPostData: 鎴愬姛鍔犺浇甯栧瓙鏁版嵁');
                return fromApi;
            }
            
            // API 杩斿洖 null锛岃〃绀哄姞杞藉け璐?
            throw new Error('鏃犳硶浠?Flarum API 鍔犺浇甯栧瓙鏁版嵁');
        }
        
        throw new Error('璁哄潧鍚庣鏈厤缃?);
    } catch (error) {
        console.error('loadPostData: 鍔犺浇甯栧瓙鏁版嵁澶辫触:', error);
        console.error('loadPostData: 閿欒璇︽儏:', error.detail);
        
        const threadContainer = document.getElementById('forum-thread');
        if (threadContainer) {
            const friendlyMessage = getFriendlyErrorMessage(error, 'load_discussion');
            threadContainer.innerHTML = `
                <div style="padding: 40px 20px; text-align: center;">
                    <p style="color: #cc0000; font-size: 16px; margin-bottom: 10px;">鎶辨瓑锛屽姞杞芥鍐呭鏃跺嚭閿?/p>
                    <p style="color: #666; font-size: 14px;">${friendlyMessage}</p>
                </div>
            `;
        }
        return null;
    }
}

// 澶囩敤甯栧瓙鏁版嵁锛坒allback锛?
function getFallbackPostData(postId) {
    const fallbackData = {
        "1": {
            "id": 1,
            "title": "璇磋浣犲湪鐨勫煄甯傦紝涓€涓湀宸ヨ祫鑳戒拱鍑犲钩绫筹紵鎴夸环鍒板簳鎬庝箞娑紵",
            "author": "鈽哶鎴夸骇銇瀵熷_鈽?,
            "authorLevel": "Lv.3 涓骇浼氬憳",
            "authorAvatar": "images/鐢ㄦ埛澶村儚.png",
            "publishTime": "2010-04-17 10:30:45",
            "viewCount": 2345,
            "content": "<p>鎴夸环涓€鐩存槸澶у鍏虫敞鐨勭儹鐐硅瘽棰橈紝灏ゅ叾鏄湪涓€绾垮煄甯傦紝鎴夸环鐨勬定骞呰寰堝骞磋交浜烘湜鑰屽嵈姝ャ€備粖澶╂垜浠潵璁ㄨ涓€涓嬶紝鍦ㄤ綘鎵€鍦ㄧ殑鍩庡競锛屼竴涓湀鐨勫伐璧勮兘涔板嚑骞崇背鎴垮瓙锛?/p><h3>涓€绾垮煄甯傛儏鍐?/h3><p>鍦ㄥ寳浜€佷笂娴枫€佹繁鍦崇瓑涓€绾垮煄甯傦紝鎴夸环鏅亶鍦ㄦ瘡骞崇背1-3涓囧厓涔嬮棿锛?010骞存暟鎹級锛岃€屽钩鍧囧伐璧勫ぇ绾﹀湪3000-6000鍏冨乏鍙炽€傝繖鎰忓懗鐫€锛屼竴涓湀鐨勫伐璧勫彧鑳戒拱0.2-0.4骞崇背鐨勬埧瀛愶紝鎯宠涔颁竴濂?00骞崇背鐨勬埧瀛愶紝涓嶅悆涓嶅枬涔熷緱鍑犲崄骞淬€?/p><h3>浜岀嚎鍩庡競鎯呭喌</h3><p>鍦ㄦ澀宸炪€佸崡浜€佹垚閮界瓑浜岀嚎鍩庡競锛屾埧浠峰ぇ绾﹀湪姣忓钩绫?000-15000鍏冧箣闂达紝骞冲潎宸ヨ祫鍦?000-4000鍏冨乏鍙炽€備竴涓湀鐨勫伐璧勮兘涔?.25-0.5骞崇背鐨勬埧瀛愶紝鍘嬪姏鍚屾牱涓嶅皬銆?/p><h3>缃戝弸璁ㄨ</h3><p>@绁為┈閮芥槸娴簯锛氬湪娣卞湷宸ヤ綔3骞达紝鏈堣柂4000锛屼緷鐒朵拱涓嶈捣鎴匡紝鍙兘绉熸埧浣忥紝涔熸槸閱変簡銆?/p><p>@缁欒藩浜嗭細鍦ㄥ崡浜湁濂楁埧锛岀幇鍦ㄦ埧浠风炕浜嗕竴鍊嶏紝鎰熻鑷繁瑕佸彂璐簡锛屼笉瑙ｉ噴銆?/p><p>@鏉叿鐨勫皬鏄庯細鍒氭瘯涓氬伐璧?000锛屾埧浠?涓囷紝浣犻€犲悧锛熸垜鍕掍釜鍘伙紒</p><p>浣犳墍鍦ㄧ殑鍩庡競鎴夸环濡備綍锛熶竴涓湀宸ヨ祫鑳戒拱鍑犲钩绫筹紵娆㈣繋鍦ㄨ瘎璁哄尯鍒嗕韩浣犵殑鎯呭喌锛?/p>",
            "comments": [
                {"id": 1, "author": "銈炴唱娴佹弧闈㈢殑灏忔槑味", "authorLevel": "Lv.2 鍒濈骇浼氬憳", "authorAvatar": "images/鐢ㄦ埛澶村儚.png", "time": "2010-04-18 09:15:32", "floor": 2, "content": "<p>鍓嶆帓鍗犲骇锛佸潗鏍囦笂娴凤紝鏈堣柂3500锛屾埧浠?涓?骞筹紝涓€涓湀宸ヨ祫鑳戒拱0.175骞筹紝鎯虫兂灏辨唱娴佹弧闈?.. T_T</p><p>宸ヤ綔3骞翠簡锛岃繛棣栦粯鐨勯浂澶撮兘娌℃敀澶燂紝绁為┈閮芥槸娴簯鍟婏紒</p>"},
                {"id": 2, "author": "o慰銈炴澀宸炴柊甯傛皯銈炍縪", "authorLevel": "Lv.2 鍒濈骇浼氬憳", "authorAvatar": "images/鐢ㄦ埛澶村儚.png", "time": "2010-04-18 10:42:18", "floor": 3, "content": "<p>娌欏彂锛佹澀宸炲煄瑗匡紝鏈堣柂3000锛屾埧浠?.2涓?骞筹紝涓€涓湀鑳戒拱0.25骞筹紝鍔姏鍑犲勾杩樻槸鏈夊笇鏈涚殑锛?/p><p>鎵撶畻鍐嶆敀涓ゅ勾閽憋紝鍔犱笂瀹堕噷鏀寔涓€鐐癸紝浜夊彇鏄庡勾涓婅溅. 缁欒藩浜嗭紒</p>"},
                {"id": 3, "author": "鎴愰兘瀹夐€稿摜(锟ｂ柦锟?", "authorLevel": "Lv.4 楂樼骇浼氬憳", "authorAvatar": "images/鐢ㄦ埛澶村儚.png", "time": "2010-04-19 14:28:55", "floor": 4, "content": "<p>鏉垮嚦銆傛垚閮戒簩鐜矾锛屾湀钖?500锛屾埧浠?000/骞筹紝涓€涓湀鑳戒拱0.4骞筹紝鎰熻鍘嬪姏杩樺ソ銆?/p><p>鎴愰兘鐢熸椿鑺傚鎱紝鎴夸环鐩稿鍙嬪ソ锛岄€傚悎瀹滃眳銆傝禐涓€涓紝涓嶈В閲婏紒</p>"},
                {"id": 4, "author": "尉鍖椾含杩芥ⅵ浜何?, "authorLevel": "Lv.1 鏂版墜涓婅矾", "authorAvatar": "images/鐢ㄦ埛澶村儚.png", "time": "2010-04-19 16:55:03", "floor": 5, "content": "<p>鍦版澘銆傚寳浜簲鐜锛屾湀钖?000锛屾埧浠?.5涓?骞筹紝涓€涓湀0.26骞筹紝浣嗘槸棣栦粯澶毦浜?.. 涔熸槸閱変簡銆?/p><p>瀹堕噷鏉′欢涓€鑸紝鍏ㄩ潬鑷繁锛屼笉鐭ラ亾浠€涔堟椂鍊欐墠鑳藉噾澶熼浠? 鎴戝嫆涓幓锛?/p>"},
                {"id": 5, "author": "骞垮窞鎵撳伐浜篲bule", "authorLevel": "Lv.2 鍒濈骇浼氬憳", "authorAvatar": "images/鐢ㄦ埛澶村儚.png", "time": "2010-04-20 09:30:17", "floor": 6, "content": "<p>鍦颁笅瀹ゃ€傚箍宸炲ぉ娌筹紝鏈堣柂3500锛屾埧浠?.2涓?骞筹紝涓€涓湀0.29骞筹紝鎱㈡參鏉ュ惂銆?/p><p>鐩告瘮鍖椾笂娣憋紝骞垮窞鐨勬埧浠疯繕鏄瘮杈冨弸濂界殑锛屽挰鍜墮杩樻槸鏈夊笇鏈涚殑. 缁欏姏锛?/p>"},
                {"id": 6, "author": "鐏挸鐣欏悕銇姹夋柊闈掑勾", "authorLevel": "Lv.2 鍒濈骇浼氬憳", "authorAvatar": "images/鐢ㄦ埛澶村儚.png", "time": "2010-04-20 11:22:44", "floor": 7, "content": "<p>璺繃鎵撻叡娌广€傛姹夊厜璋凤紝鏈堣柂2000锛屾埧浠?000/骞筹紝涓€涓湀0.4骞筹紝鎰熻杩樺彲浠ユ帴鍙椼€?/p><p>鏂颁竴绾块噷姝︽眽鎬т环姣旀尯楂樼殑锛屽彂灞曚篃蹇紝鐪嬪ソ鏈潵. 鐏挸鐣欏悕锛?/p>"},
                {"id": 7, "author": "鈫樻繁鍦冲鏂楄€呪問", "authorLevel": "Lv.3 涓骇浼氬憳", "authorAvatar": "images/鐢ㄦ埛澶村儚.png", "time": "2010-04-21 15:48:30", "floor": 8, "content": "<p>鍥磋銆傛繁鍦冲崡灞憋紝鏈堣柂5000锛屾埧浠?.5涓?骞筹紝涓€涓湀0.2骞筹紝澶毦浜嗗お闅句簡. 浣犻€犲悧锛?/p><p>鍑嗗鍥炶€佸鍙戝睍浜嗭紝娣卞湷瀹炲湪鏄拱涓嶈捣锛屽帇鍔涘お澶т簡. 楦ⅷ灞卞ぇ鍟婏紒</p>"},
                {"id": 8, "author": "鑻忓窞灏忕櫧棰?^_鈭?鈽?, "authorLevel": "Lv.2 鍒濈骇浼氬憳", "authorAvatar": "images/鐢ㄦ埛澶村儚.png", "time": "2010-04-21 17:15:08", "floor": 9, "content": "<p>娼滄按澶氬勾鍐掍釜娉°€傝嫃宸炲洯鍖猴紝鏈堣柂3000锛屾埧浠?000/骞筹紝涓€涓湀0.375骞筹紝鍔犳补鏀掗挶涓€?/p><p>鑻忓窞鐜濂斤紝绂讳笂娴疯繎锛屾劅瑙夋槸涓笉閿欑殑閫夋嫨. 濡ュΕ鐨勶紒</p>"},
                {"id": 9, "author": "鉁块噸搴嗗湡钁椻溈", "authorLevel": "Lv.3 涓骇浼氬憳", "authorAvatar": "images/鐢ㄦ埛澶村儚.png", "time": "2010-04-22 10:30:00", "floor": 10, "content": "<p>閲嶅簡姹熷寳锛屾湀钖?200锛屾埧浠?000/骞筹紝涓€涓湀0.55骞筹紒绠€鐩村お骞哥浜嗭紒</p><p>閲嶅簡鎴夸环鐪熺殑寰堣壇蹇冿紝鐢熸椿鍘嬪姏灏忓緢澶氾紝鎺ㄨ崘澶у鏉ラ噸搴嗗彂灞? 鍚勭缇℃厱瀚夊鎭紒</p>"},
                {"id": 10, "author": "瑗垮畨濂嬫枟鍝?1", "authorLevel": "Lv.2 鍒濈骇浼氬憳", "authorAvatar": "images/鐢ㄦ埛澶村儚.png", "time": "2010-04-22 14:20:15", "floor": 11, "content": "<p>瑗垮畨楂樻柊鍖猴紝鏈堣柂2800锛屾埧浠?500/骞筹紝涓€涓湀0.5骞筹紝杩樺彲浠ユ帴鍙椼€?/p><p>瑗垮畨鍙戝睍寰堝揩锛屾枃鍖栧簳钑存繁鍘氾紝閫傚悎瀹氬眳. 妤间笂+1锛?/p>"},
                {"id": 11, "author": "鍧戠埞o鍘﹂棬宀涙皯", "authorLevel": "Lv.4 楂樼骇浼氬憳", "authorAvatar": "images/鐢ㄦ埛澶村儚.png", "time": "2010-04-23 09:45:30", "floor": 12, "content": "<p>鍘﹂棬宀涘唴锛屾湀钖?500锛屾埧浠?.5涓?骞筹紝涓€涓湀0.23骞筹紝鍘嬪姏灞卞ぇ...</p><p>涓嶈繃鍘﹂棬鐜鐪熺殑濂斤紝闈㈡湞澶ф捣鏄ユ殩鑺卞紑锛屽挰鍜墮鍧氭寔鍚? 鍧戠埞鍟婏紒</p>"},
                {"id": 12, "author": "閮戝窞涓婄彮鏃?鍏冭姵浣犳€庝箞鐪?", "authorLevel": "Lv.2 鍒濈骇浼氬憳", "authorAvatar": "images/鐢ㄦ埛澶村儚.png", "time": "2010-04-23 16:00:00", "floor": 13, "content": "<p>閮戝窞涓滃尯锛屾湀钖?000锛屾埧浠?000/骞筹紝涓€涓湀0.4骞筹紝鎰熻杩樿銆?/p><p>閮戝窞浣滀负涓師鏍稿績锛屽彂灞曟綔鍔涘ぇ锛屾埧浠风浉瀵瑰弸濂? 鍏冭姵锛屼綘鎬庝箞鐪嬶紵</p>"},
                {"id": 13, "author": "妤间腑妤兼祴璇曞憳", "authorLevel": "Lv.1 鏂版墜涓婅矾", "authorAvatar": "images/鐢ㄦ埛澶村儚.png", "time": "2010-04-24 10:00:00", "floor": 14, "content": "<p>浣犺寰楀锛屼笂娴风殑鎴夸环纭疄璁╀汉鏈涘皹鑾強. 鎴戜篃鏄唹浜嗐€?/p>", "replyTo": 2},
                {"id": 14, "author": "娣卞害璇勮瀹?, "authorLevel": "Lv.5 绀惧尯鍏冭€?, "authorAvatar": "images/鐢ㄦ埛澶村儚.png", "time": "2010-04-24 11:30:00", "floor": 15, "content": "<p>鎴戜篃瑙夊緱涓婃捣鐨勭敓娲绘垚鏈お楂樹簡锛屽叾瀹炰簩绾垮煄甯備篃涓嶉敊. 缁欏姏涓嶈В閲婏紒</p>", "replyTo": 14},
                {"id": 15, "author": "缁堟瀬鍥炲鑰?, "authorLevel": "Lv.2 鍒濈骇浼氬憳", "authorAvatar": "images/鐢ㄦ埛澶村儚.png", "time": "2010-04-24 12:45:00", "floor": 16, "content": "<p>璧炲悓妤间笂鐨勬繁搴﹀垎鏋愶紒鐜板湪鐨勫勾杞讳汉纭疄闇€瑕佹洿澶氱殑閫夋嫨. 鐏挸鐣欏悕锛?/p>", "replyTo": 15}
            ]
        },
        "2": {
            "id": 2,
            "title": "鍏充簬寮€灞曗€滄嫆缁濋粍璧屾瘨銆佸叡寤哄钩瀹夌ぞ鍖衡€濆浼犳暀鑲叉椿鍔ㄧ殑閫氱煡",
            "author": "瀹佹按甯傚叕瀹夊眬闂垫睙鍒嗗眬娌诲畨澶ч槦",
            "authorLevel": "Lv.5 绀惧尯鍏冭€?,
            "authorAvatar": "images/鐢ㄦ埛澶村儚.png",
            "publishTime": "2012-08-20 09:00:00",
            "viewCount": 567,
            "allowComments": false,
            "content": "<p>绂忎簯璺部琛楀悇鍟嗛摵銆佸僵绁ㄩ攢鍞綉鐐广€佹鐗屽銆佺綉鍚с€佽尪妤煎強鍏ㄤ綋灞呮皯锛?/p><p>杩戞湡鎺ョ兢浼楀弽鏄狅紝鎴戣緰鍖轰釜鍒満鎵€瀛樺湪鐤戜技鑱氫紬璧屽崥銆佸湴涓嬪瓧璋滄姇娉ㄧ瓑涓嶈壇鐜拌薄銆備负杩涗竴姝ュ噣鍖栫ぞ鍖虹幆澧冿紝鐗规閲嶇敵锛?/p><p>涓€銆佷弗绂佷换浣曞舰寮忕殑璧屽崥琛屼负銆傚寘鎷絾涓嶉檺浜庯細浠ヨ惀鍒╀负鐩殑鐨勬鐗屽眬銆佸埄鐢ㄧ綉缁滃钩鍙拌繘琛岀殑绗笁鏂规姇娉ㄣ€佷互鈥滃瓧鐢荤珵鐚溾€濇垨鈥滅敓鑲栬蛋鍔垮垎鏋愨€濅负鍚嶄箟鐨勫彉鐩歌仛璧屻€?/p><p>浜屻€佸僵绁ㄩ攢鍞綉鐐归』鎸佽瘉缁忚惀銆備笉寰楃鑷彁渚涘紑濂栬秼鍔垮浘銆佲€滃唴閮ㄥ弬鑰冨浘鈥濇垨浠讳綍褰㈠紡鐨勨€滆寰嬪垎鏋愬浘鈥濓紝涓嶅緱鍚戞湭鎴愬勾浜哄嚭鍞僵绁ㄣ€傛墍璋撯€滅绮€濃€滃唴鍙傗€濃€滅巹鏈衡€濈瓑闈炴硶鍗板埛鍝佷竴缁忓彂鐜帮紝绔嬪嵆鏀剁即銆?/p><p>涓夈€佹鐗屽銆佽尪妤肩瓑鍦烘墍椤诲湪鏅?3鏃跺墠鍋滄钀ヤ笟銆備弗绂佷互鈥滄湅鍙嬫秷閬ｂ€濅负鍚嶇粍缁囧ぇ瑙勬ā鐜伴噾楹诲皢灞€锛屼笉寰楀鐣欓檶鐢熶汉鍛樿繘琛岀害瀹氭椂闂寸殑杞崲鐗屽眬銆傚鏈夊彂鐜版寜鑱氫紬璧屽崥璁哄</p><p>鍥涖€佽鎯曚互鈥滄枃鍖栦氦娴佲€濅负鍚嶇殑闈炴硶鍑虹増鐗┿€傝繎鏈熷彂鐜版湁浜轰互鈥滃瓧鑺扁€濇棫鎶ュ悎璁㈡湰绛夊舰寮忓す甯︽晱鎰熷唴瀹瑰悜涓€佸勾浜哄厹鍞€傛绫荤墿鍝佷腑甯稿嵃鏈夋墍璋撯€滄煇鏌愬ぇ甯堢嫭瀹惰В瀵嗏€濈瓑璇卞鎬ц瘽鏈紝鏈川鏄祵鍗氭姇娉ㄧ殑鍙樹綋锛岃灞呮皯涓€鏃﹀彂鐜板強鏃朵妇鎶ャ€?/p><p>浜斻€佽灏嗘湰鍏憡寮犺创浜庡悇妤兼爧鍗曞厓鍏ュ彛銆傛湰鍛ㄤ笁涓婂崍涔濈偣灏嗗湪绂忎簯灏忓尯涓績骞垮満涓惧姙鈥滃钩瀹夌ぞ鍖衡€濈幇鍦哄璁诧紝灞婃椂浼氭湁瀹炵墿灞曠ず锛堝惈杩戞湡鏌ヨ幏鐨勫嵃鍒峰搧濡傗€滅绮浘鈥濇暀鍏凤級渚涘眳姘戣鲸鍒€?/p><p>涓炬姤鐢佃瘽锛氬畞姘村競鍏畨灞€闂垫睙鍒嗗眬娌诲畨澶ч槦 053X-XXXXXXX<br>瀹佹按甯傞椀姹熷尯绂忎簯璺閬撳姙<br>2012骞?鏈?0鏃?/p>",
            "comments": []
        },
        "4": {
            "id": 4,
            "title": "缁撳涓ゅ勾锛岃€佸叕瀚屾垜鑳栵紝鎴戞兂绂诲浜嗭紝璇ユ€庝箞缁х画鈥︹€?,
            "author": "绱壊鐨勬ⅵ",
            "authorLevel": "Lv.2 鍒濈骇浼氬憳",
            "authorAvatar": "姊?,
            "publishTime": "2010-07-15 14:23:00",
            "viewCount": 1582,
            "allowComments": true,
            "content": "<p>鎴戝拰鑰佸叕鏄ぇ瀛﹀悓瀛︼紝鎭嬬埍浜斿勾缁撲簡濠氾紝鍒扮幇鍦ㄥ垰濂戒袱骞淬€傜粨濠氬墠 I 98鏂わ紝浠栧ぉ澶╄灏卞枩娆㈡垜杩欐牱鑲夎倝鐨勩€傜粨濠氬悗鎴戝洜涓哄伐浣滃帇鍔涘ぇ銆佸唴鍒嗘硨澶辫皟鑳栦簡宸笉澶氫笁鍗佹枻锛屽攭锛屾垜鑷繁閮藉ぉ澶╃劍铏戝憿鈥︹€︿笂涓湀浠栧紑濮嬪珜鎴戣儢锛屼竴寮€濮嬭繕鏄紑鐜╃瑧鍛紝鍚庢潵鍙堣鐪熷湴璇磋鎴戝噺鑲ワ紝浠栦互鍓嶄粠涓嶈繖鏍疯鎴戠殑銆傛垜璇曠潃鍑忎簡锛屾瘡澶╀笅鐝洖鏉ユ櫄楗笉鍚冿紝杩樿烦缁筹紝鐦︿簡浜旀枻鍙堝弽寮逛簡銆傛槰澶╂櫄涓婁粬鍘绘礂婢′簡锛屾垜鐪嬭浠栧拰鍫傚紵鐨勫井淇¤亰澶╄褰曪紝璇存垜鑳栵紝娌℃湁鑵版懜璧锋潵娌℃湁鐏甸瓊銆備笉濡備粬鐨勫墠濂冲弸鐦﹀彲浠ュ悇绉嶅Э鍔匡紝鐜╁緱濂藉ぉ澶╂兂銆傝繕鏈夊崐涓湀灏卞埌鎴戜滑涓ゅ懆骞寸邯蹇垫棩浜嗭紝鐪嬪埌鍚庢垜娌¤窡浠栬锛屼笉杩囧績閲屾兂绂诲銆傛垜鍙互鐦︼紝鍙互鍑忚偉锛屼絾鎴戜笉鎯宠濂戒竴涓湡蹇冨珜寮冩垜鐨勪汉銆?/p><p>浠栨瘮鎴戝皬鍗佷釜鏈堬紝鎴戜粖骞翠篃蹇笁鍗佷簡锛岃繕娌¤瀛╁瓙銆傛垜瑙夊緱浠栨槸涓€涓嚜绉佺殑浜猴紝杩欎箞澶т簡鍙【鑷繁锛岄挶涔熻禋涓嶄簡澶氬皯锛屽彲鎴戣嚜宸辨病鏈夊瓨娆撅紝涔熶笉鏁㈢濠氥€?/p><p>蹇冮噷鑻︼紒涓嶇煡閬撹瀵硅皝璇粹€︹€﹀コ浜轰笂鍝幓鎵句竴涓湡蹇冪埍鑷繁鐨勭敺浜猴紵</p>",
            "comments": [
                {
                    "id": 1,
                    "author": "鏆栧績灏忚创澹?,
                    "authorLevel": "Lv.2 鍒濈骇浼氬憳",
                    "authorAvatar": "璐?,
                    "time": "2010-07-15 15:10:22",
                    "floor": 2,
                    "content": "<p>鎶辨姳妤间富銆傛垜鑰佸叕浠ュ墠涔熷珜 v 鑳栵紝鎴戝綋鏃剁洿鎺ュ洖浜嗕竴鍙モ€滅湅鐪嬩綘鑷繁鐨勬牱瀛愨€濄€傜敺浜哄氨鏄瑺鏁欒偛</p>"
                },
                {
                    "id": 2,
                    "author": "鑱屽満鐞嗘櫤濮?,
                    "authorLevel": "Lv.4 楂樼骇浼氬憳",
                    "authorAvatar": "濮?,
                    "time": "2010-07-15 15:45:10",
                    "floor": 3,
                    "content": "<p>杩欎綋閲嶄篃涓嶈儢鍛€锛熶綘闀胯儢鏄洜涓哄唴鍒嗘硨澶辫皟锛屽唴鍒嗘硨澶辫皟鏄洜涓哄帇鍔涘ぇ锛屽帇鍔涘ぇ鏄洜涓轰粈涔堜綘蹇冮噷娓呮銆傚惉濮愮殑锛屾妸鍘嬪姏婧愬ご瑙ｅ喅鎺夛紝姣斿噺鑲ョ鐢紒</p>"
                },
                {
                    "id": 3,
                    "author": "绱壊鐨勬ⅵ",
                    "authorLevel": "Lv.2 鍒濈骇浼氬憳",
                    "authorAvatar": "姊?,
                    "time": "2010-07-15 16:02:45",
                    "floor": 4,
                    "content": "<p>璋㈣阿銆傚帇鍔涙簮澶村彲鑳芥槸鎴戝﹩濠嗭紝濂逛竴鐩存兂璁╂垜浠敓瀛╁瓙锛屼絾鎴戣€佸叕璇寸幇鍦ㄤ笉鏄椂鍊欍€傛瘡娆″洖鍘诲悆楗ス閮界敤閭ｇ鐪肩鐪嬫垜锛屾垜鍘诲ス瀹舵瘮涓婄彮杩樼疮锛屾洿鍙仺鐨勬槸鎴戣€佸叕褰撶潃瀹朵汉鏈嬪弸鐨勯潰浠庝笉瀚屾垜锛岃繕璇磋儢鐐瑰ソ锛屽彨鎴戝鍚冪偣銆?/p>",
                    "replyTo": 3
                },
                {
                    "id": 4,
                    "author": "杈ｅ钀屽疂",
                    "authorLevel": "Lv.3 涓骇浼氬憳",
                    "authorAvatar": "瀹?,
                    "time": "2010-07-15 16:30:15",
                    "floor": 5,
                    "content": "<p>鏈夊瀛愪簡鍚楋紵娌℃湁鐨勮瘽杩樺ソ鍔炪€傛垜鐢熷畬瀛╁瓙鑳栦簡浜屽崄鏂わ紝鎴戣€佸叕灞侀兘涓嶆暍鏀撅紝鏁㈢鎴戝氨鏁㈠甫瀛╁瓙璧帮紝浠栨湁璇濊涓嶏紵鑳栫偣鍙堝拫浜嗭紵浣犲氨鏄お鍦ㄦ剰浠栨€庝箞鐪嬩綘浜?/p>"
                },
                {
                    "id": 5,
                    "author": "鍋ヨ韩杈句汉闃垮己",
                    "authorLevel": "Lv.5 绀惧尯鍏冭€?,
                    "authorAvatar": "寮?,
                    "time": "2010-07-15 17:15:40",
                    "floor": 6,
                    "content": "<p>濮愬浠惉鎴戣锛屾垜涓変釜鏈堢槮浜嗕簩鍗佹枻锛屾病闈犱粈涔堣嵂鐗╁拰鎵嬫湳锛屽氨鏄浣忓槾杩堝紑鑵匡紝姣忓ぉ涓€涓囨锛佺⒊姘村叏鏂紝鏅氶鍏偣涔嬪墠鍚冨畬銆傚彉缇庝笉鏄负浜嗙敺浜猴紝鏄负浜嗚嚜宸憋紒</p>"
                },
                {
                    "id": 6,
                    "author": "绱壊鐨勬ⅵ",
                    "authorLevel": "Lv.2 鍒濈骇浼氬憳",
                    "authorAvatar": "姊?,
                    "time": "2010-07-15 17:45:12",
                    "floor": 7,
                    "content": "<p>鎴戣瘯杩囨柇纰虫按锛屼絾涓婄彮寰堥毦鎻愯捣绮剧锛岄泦涓笉浜嗘敞鎰忓姏鍛€</p>",
                    "replyTo": 6
                },
                {
                    "id": 7,
                    "author": "鎯呮劅灏忛瓟濂?,
                    "authorLevel": "Lv.3 涓骇浼氬憳",
                    "authorAvatar": "榄?,
                    "time": "2010-07-15 18:20:05",
                    "floor": 8,
                    "content": "<p>杩欑鐢风殑灏辨瑺娌伙紝妤间富鎴戞暀浣犱竴鎷涳紝浣犱篃寮€濮嬪珜寮冧粬銆傚珜浠栧ご鍙戝皯锛屽珜浠栨專閽变笉澶氾紝瀚屼粬濡堝疂锛屽珜浠栧悇绉嶏紒鐒跺悗褰撲綘鐪熺殑寮€濮嬫寫鍓斾粬锛屼綘灏变笉閭ｄ箞瀹虫€曚粬鎸戝墧浣犱簡锛屼翰娴嬫湁鏁堬紒鍝堝搱鍝堬紒</p>"
                },
                {
                    "id": 8,
                    "author": "璺竟灏忚崏",
                    "authorLevel": "Lv.1 鏂版墜涓婅矾",
                    "authorAvatar": "鑽?,
                    "time": "2010-07-15 19:10:30",
                    "floor": 9,
                    "content": "<p>璇村埌杩欎釜鎴戠獊鐒舵兂璧锋潵锛屾ゼ涓绘湁娌℃湁璇曡繃鎶ヤ釜璇撅紵浣犺繖绉嶅睘浜庡績鐞嗛棶棰橈紝鎴戣〃濮愬綋骞翠篃鏄洜涓虹被浼肩殑浜嬮椆寰楀樊鐐圭濠氾紝鍚庢潵濂逛篃鏄墦绠楁姤涓€涓粈涔堝府浜鸿皟鏁村績鎬佺殑鏈烘瀯锛屼笉杩囧ソ鍍忔病鎶ヤ笂鍚?/p>"
                },
                {
                    "id": 9,
                    "author": "绱壊鐨勬ⅵ",
                    "authorLevel": "Lv.2 鍒濈骇浼氬憳",
                    "authorAvatar": "姊?,
                    "time": "2010-07-15 19:35:18",
                    "floor": 10,
                    "content": "<p>浣犺鐨勯偅绉嶆満鏋勬垜涓嶄簡瑙ｃ€傛垜鍚屼簨鍊掓槸鎺ㄨ崘杩囦竴涓粈涔堝績鐞嗚绋嬶紝鎴戣繕娌″幓闂€?/p>",
                    "replyTo": 9
                },
                {
                    "id": 10,
                    "author": "鐪熺浉鍙湁涓€涓?,
                    "authorLevel": "Lv.4 楂樼骇浼氬憳",
                    "authorAvatar": "鐪?,
                    "time": "2010-07-15 20:15:00",
                    "floor": 11,
                    "content": "<p>鍙互鏄彲浠ワ紝浣嗕篃寰楄皑鎱庨€夋嫨锛佹垜涓€涓悓瀛︿互鍓嶅氨杩涜繃杩欑鏈烘瀯锛屽叆瀛﹁垂濂藉儚浜斿叚鍗冭繕鏄灏戙€傚悗鏉ュ簲璇ユ槸鍑轰粈涔堜簨浜嗗惂锛屽弽姝ｆ惉璧颁簡锛屽幓骞磋矾杩囩湅鍒板闈㈡寕鐫€鎷涚鐨勭墝瀛愩€傛彁閱掓ゼ涓荤湅鍒伴偅绉嶅鏍＄粫鐫€璧般€傛瑙勫績鐞嗗挩璇㈠幓涓夌敳鍖婚櫌锛岃秺绁炵鐨勮秺鏈夌尗鑵?/p>"
                },
                {
                    "id": 11,
                    "author": "绱壊鐨勬ⅵ",
                    "authorLevel": "Lv.2 鍒濈骇浼氬憳",
                    "authorAvatar": "姊?,
                    "time": "2010-07-15 20:45:00",
                    "floor": 12,
                    "content": "<p>璋㈣阿鎻愰啋锛屾垜娌℃墦绠楁姤浠€涔堝鏍★紝娌￠挶涔熸病鏃堕棿鈥︹€?/p>",
                    "replyTo": 11
                },
                {
                    "id": 12,
                    "author": "鐞嗘櫤鍒嗘瀽甯?,
                    "authorLevel": "Lv.4 楂樼骇浼氬憳",
                    "authorAvatar": "鐞?,
                    "time": "2010-07-15 21:10:00",
                    "floor": 13,
                    "content": "<p>甯栧瓙鏈夌偣姝簡鍝堬紝姝ｄ釜妤硷紝绂讳笉绂绘槸澶т簨锛屼絾鍦ㄦ涔嬪墠锛岃瘯鐫€鎵句竴浠戒笉闇€瑕佸湪鎰忎粬鐪煎厜鐨勪簨鍋氾紝涓氫綑鏃堕棿鏈夎嚜宸辫兘鎶曞叆鐨勪笢瑗匡紝浣犵殑鎯呯华鐙珛鎬т細寮哄緢澶氥€傝嚦浜庡噺鑲ワ紝绛変綘涓嶉偅涔堢劍铏戜簡鑷劧浼氱槮锛岃韩浣撳緢璇氬疄</p>"
                },
                {
                    "id": 13,
                    "author": "姹熸箹鐧炬檽鐢?,
                    "authorLevel": "Lv.3 涓骇浼氬憳",
                    "authorAvatar": "鐢?,
                    "time": "2010-07-15 21:35:00",
                    "floor": 14,
                    "content": "<p>瀵瑰瀵癸紝鎴戣〃濮愪篃鏄紝涓嶇煡閬撲粠鍝惉鏉ヨ繖涔堜釜鏈烘瀯锛屽彧涓嶈繃鎴戝澶寰楁槸楠楅挶鐨勬病璁╁ス鍘伙紝鍚庢潵灏辨病鍚杩囦簡銆備及璁＄湡鏄獥閽辩殑锛屽€掗棴浜嗗惂锛佸懙鍛碉紒</p>",
                    "replyTo": 11
                },
                {
                    "id": 14,
                    "author": "绱壊鐨勬ⅵ",
                    "authorLevel": "Lv.2 鍒濈骇浼氬憳",
                    "authorAvatar": "姊?,
                    "time": "2010-07-15 22:05:00",
                    "floor": 15,
                    "content": "<p>浣犺寰楀锛屾垜纭疄浠€涔堣嚜宸辩殑浜嬮兘娌″湪鍋氥€傝嚜浠庣粨浜嗗锛岃嚜宸辩殑鏃堕棿灏辫瑜ず浜嗭紝浠ュ墠杩樼敾鐐圭敾锛岀粨濠氬悗鍐嶄篃娌＄杩囷紝涓烘煷绫虫补鐩愰叡閱嬭尪鎿嶇浜嗗績锛佹垜浠婃櫄涓婄炕涓€缈讳互鍓嶇殑鏈瓙</p>",
                    "replyTo": 13
                },
                {
                    "id": 15,
                    "author": "鐢荤瑪鐢熻姳",
                    "authorLevel": "Lv.3 涓骇浼氬憳",
                    "authorAvatar": "鐢?,
                    "time": "2010-07-15 22:30:00",
                    "floor": 16,
                    "content": "<p>鐢伙紒鐢昏捣鏉ワ紒鐢诲緱濂戒笉濂戒笉閲嶈锛岄噸瑕佺殑鏄偅鏄綘鑷繁鐨勪笢瑗裤€備綘鑰佸叕瀚屼綘鑳栨槸浠栫殑闂锛屼綘鎶婄敾绗旀崱璧锋潵鏄綘鐨勯棶棰樸€傚姞娌规ゼ涓伙紒</p>"
                },
                {
                    "id": 16,
                    "author": "绱壊鐨勬ⅵ",
                    "authorLevel": "Lv.2 鍒濈骇浼氬憳",
                    "authorAvatar": "姊?,
                    "time": "2010-07-15 22:50:00",
                    "floor": 17,
                    "content": "<p>璋㈣阿澶у锛屾垜鍘绘壘閫熷啓鏈簡銆傚濮荤殑浜嬫垜鍐嶆兂鎯炽€?/p>"
                }
            ]
        }
    };
    return fallbackData[postId] || null;
}


// 鑾峰彇甯栧瓙鍒楄〃锛堜粠data鏂囦欢澶硅鍙栵級
async function loadPostList() {
    // 鏄剧ず鍔犺浇鐘舵€?
    const container = document.querySelector('.forum-posts');
    if (container) {
        container.innerHTML = '<div style="padding: 20px; text-align: center;">鍔犺浇涓?..</div>';
    }
    
    if (isFlarumConfigured()) {
        try {
            return await flarumLoadDiscussionList();
        } catch (error) {
            console.error('鍔犺浇甯栧瓙鍒楄〃澶辫触:', error);
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
            // 濡傛灉鏂囦欢涓嶅瓨鍦紝璺宠繃
        }
    }
    return postList;
}

function renderPostListIntoIndex(recentReplies) {
    const container = document.querySelector('.forum-posts');
    if (!container) return;

    const safeList = Array.isArray(recentReplies) ? recentReplies : [];

    // 鎴彇瀛楃涓插嚱鏁?
    const truncate = (str, maxLength) => {
        if (!str) return '';
        const text = str.replace(/<[^>]*>/g, '').trim(); // 绉婚櫎HTML鏍囩
        return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
    };

    const buildReplyHref = (reply) => buildPostFloorLink(reply.discussionId, reply.floor);

    container.innerHTML = `
        <h3>鏈€鏂板洖澶?/h3>
        <table class="posts-table">
            <thead>
                <tr>
                    <th style="width: 30%;">鍥炲笘鍐呭</th>
                    <th style="width: 18%;">鍥炲笘浜?/th>
                    <th style="width: 17%;">鏃堕棿</th>
                    <th style="width: 35%;">甯栧瓙鏍囬</th>
                </tr>
            </thead>
            <tbody>
                ${safeList.length > 0 ? safeList.map((r) => `
                    <tr>
                        <td><a href="${buildReplyHref(r)}" style="color: #0066cc;">${truncate(r.content || '', 20)}</a></td>
                        <td>${r.author || ''}</td>
                        <td>${(r.time || '').slice(0, 16).replace('T', ' ') || ''}</td>
                        <td><a href="post.html?id=${encodeURIComponent(r.discussionId)}">${truncate(r.title || '', 20)}</a></td>
                    </tr>
                `).join('') : `<tr><td colspan="4" style="text-align: center; padding: 20px;">鏆傛棤鍥炲</td></tr>`}
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

// 椤甸潰鍔犺浇瀹屾垚鍚庢墽琛?
window.addEventListener('DOMContentLoaded', function() {
    // 澶勭悊鎵€鏈?href="#" 鐨勯摼鎺?
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a');
        if (target && target.getAttribute('href') === '#') {
            // 鎺掗櫎鎺夊凡缁忔湁鐗瑰畾鍔熻兘鐨勯摼鎺ワ紙濡傚洖澶嶃€佸彇娑堝洖澶嶃€侀€€鍑虹櫥褰曠瓑锛?
            if (target.classList.contains('reply-link') || 
                target.id === 'cancel-reply' || 
                target.id === 'logout-btn' ||
                target.id === 'nav-logout-btn' ||
                target.id === 'login-btn' ||
                target.id === 'register-btn') {
                return;
            }
            e.preventDefault();
        }
        
        // 澶勭悊妤间腑妤兼ゼ灞傞摼鎺ョ殑骞虫粦婊氬姩
        if (target && target.classList.contains('quote-floor-link')) {
            e.preventDefault();
            const href = target.getAttribute('href');
            if (href) {
                // 鍒ゆ柇鏄惁闇€瑕佽烦杞埌鍏朵粬椤甸潰
                if (href.startsWith('?')) {
                    // 璺宠浆鍒板叾浠栭〉闈紝璁╂祻瑙堝櫒澶勭悊
                    window.location.href = href;
                } else if (href.startsWith('#post-')) {
                    // 鍦ㄥ綋鍓嶉〉鍐呰烦杞?
                    const floorId = href.substring(6);
                    const targetElement = document.getElementById(`post-${floorId}`);
                    if (targetElement) {
                        targetElement.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                        });
                        // 娣诲姞楂樹寒鏁堟灉
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
    
    // 娴嬭瘯Flarum API杩炴帴鍜屽姩鎬佸姞杞介椤电儹甯栵紙鍚堝苟涓轰竴涓皟鐢紝閬垮厤閲嶅璇锋眰锛?
    if (isFlarumConfigured()) {
        console.log('Flarum API 閰嶇疆宸插畬鎴愶紝姝ｅ湪鍔犺浇棣栭〉鍐呭...');
        renderDynamicHomeLinks();
    } else {
        console.log('Flarum API 鏈厤缃?);
    }
    
    // 妫€鏌ユ槸鍚︽槸甯栧瓙璇︽儏椤甸潰
    if (window.location.pathname.includes('post.html')) {
        // 鏇存柊鐢ㄦ埛閾炬帴鐘舵€侊紙鐧诲綍/娉ㄥ唽鎸夐挳锛?
        updateUserLinks();
        loadPostDetailsFromJson();
        // 琛ㄥ崟浜嬩欢鍙粦瀹氫竴娆?
        setupReplyForm();
        
        // 椤甸潰鍔犺浇鏃舵鏌ョ櫥褰曠姸鎬侊紝淇敼鍥炲琛ㄥ崟
        updateReplyFormForLoginStatus();
    }

    if (document.querySelector('.forum-posts')) {
        flarumLoadRecentReplies().then(renderPostListIntoIndex).catch((error) => {
            console.error('鍔犺浇鏈€鏂板洖澶嶅け璐?', error);
        });
    }

    // 骞虫粦婊氬姩鏁堟灉
    setupSmoothScroll();
    
    // 娴獥骞垮憡
    // setupFloatingAd();
    setupFloatingAd2();
    
    // 鍙充笅瑙掑脊绐楀箍鍛?
    setupPopupAd();
    
    // 闊抽鎺у埗
    setupAudio();
    
    // 鏇存柊鐢ㄦ埛瀵艰埅閾炬帴
    updateUserLinks();
    
    // 灏嗚繎鏈熺儹甯栨粴鍔ㄥ尯鍩熸粴鍔ㄥ埌椤堕儴
    const scrollableContent = document.querySelector('.scrollable-content');
    if (scrollableContent) {
        scrollableContent.scrollTop = 0;
    }
});

// 娴嬭瘯Flarum API杩炴帴
async function testFlarumConnection() {
    try {
        console.log('姝ｅ湪娴嬭瘯Flarum API杩炴帴...');
        const response = await flarumRequest('/');
        console.log('Flarum API 杩炴帴鎴愬姛:', response);
        
        // 娴嬭瘯鑾峰彇璁ㄨ鍒楄〃
        const discussions = await flarumRequest('/discussions?sort=-createdAt&page[limit]=5&include=user');
        console.log('鑾峰彇璁ㄨ鍒楄〃鎴愬姛:', discussions);
        
        console.log('Flarum API 娴嬭瘯瀹屾垚锛岃繛鎺ユ甯革紒');
    } catch (error) {
        console.error('Flarum API 杩炴帴澶辫触:', error);
        console.error('鍙兘鐨勫師鍥? 1. Flarum璁哄潧鏈繍琛?2. 璺ㄥ煙閰嶇疆闂 3. 缃戠粶杩炴帴闂');
    }
}

// 璁剧疆闊抽鎺у埗
function setupAudio() {
    const audio = document.getElementById('background-music');
    const audioToggle = document.getElementById('audio-toggle');
    
    if (audio && audioToggle) {
        // 鍒濆鐘舵€佷负鏆傚仠
        audio.pause();
        audioToggle.classList.add('paused');
        
        // 鐐瑰嚮鍒囨崲鎾斁鐘舵€?
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
        
        // 鐩戝惉鎾斁鐘舵€?
        audio.addEventListener('play', function() {
            audioToggle.classList.remove('paused');
        });
        
        audio.addEventListener('pause', function() {
            audioToggle.classList.add('paused');
        });
    }
}

// 浠嶫SON鏂囦欢鍔犺浇甯栧瓙璇︽儏骞舵覆鏌?
async function loadPostDetailsFromJson() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id') || '1';
    
    const postData = await loadPostData(postId);
    if (!postData) {
        console.error('鏃犳硶鍔犺浇甯栧瓙鏁版嵁');
        return;
    }
    
    renderForumThread(postData);
}

// 娓叉煋璁哄潧甯栧瓙
function renderForumThread(postData) {
    const threadContainer = document.querySelector('.forum-thread');
    if (!threadContainer) return;
    
    // 淇濆瓨甯栧瓙鏁版嵁鍒板叏灞€鍙橀噺锛屼緵鍚庣画浣跨敤锛堥伩鍏嶉噸澶嶅姞杞斤級
    window.currentPostData = postData;
    const isLoggedIn = !!getFlarumToken();

    // 鏇存柊椤甸潰鏍囬
    document.title = `绾㈣溁铚撹鍧?- ${postData.title}`;

    // 澶勭悊涓嶅彲鍥炲笘鐨勬儏鍐?
    const replyBox = document.getElementById('reply-box');
    if (replyBox) {
        if (postData.allowComments === false) {
            replyBox.innerHTML = '<div class="comments-disabled-msg" style="padding: 20px; text-align: center; color: #666; background: #f9f9f9; border: 1px solid #ddd; margin-top: 20px;">璇ュ笘瀛愬凡璁剧疆涓嶅彲鍥炲笘</div>';
        } else {
            // 鎭㈠鍥炲笘琛ㄥ崟锛堝鏋滀箣鍓嶈绂佺敤浜嗭級
            if (replyBox.querySelector('.comments-disabled-msg')) {
                if (isLoggedIn) {
                    // 宸茬櫥褰曪細鏄剧ず鐢ㄦ埛淇℃伅鍜岃〃鍗?
                    replyBox.innerHTML = `
                        <h4>鍙戣〃鍥炲</h4>
                        <div class="current-user-info" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
                            <img src="images/鐢ㄦ埛澶村儚.png" alt="澶村儚" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <div style="font-weight: bold; color: #333;">${localStorage.getItem('flarumUsername') || '宸茬櫥褰曠敤鎴?}</div>
                                <div style="font-size: 12px; color: #999;">Lv.1 鏂版墜涓婅矾</div>
                            </div>
                        </div>
                        <form class="reply-form" id="reply-form">
                            <!-- 瀵屾枃鏈伐鍏锋爮 -->
                            <div class="toolbar" style="margin-bottom: 10px; padding: 5px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px;">
                                <button type="button" class="toolbar-btn" data-action="bold" title="绮椾綋 (Ctrl+B)">
                                    <b>B</b>
                                </button>
                                <button type="button" class="toolbar-btn" data-action="italic" title="鏂滀綋 (Ctrl+I)">
                                    <i>I</i>
                                </button>
                                <button type="button" class="toolbar-btn" data-action="underline" title="涓嬪垝绾?(Ctrl+U)">
                                    <u>U</u>
                                </button>
                                <button type="button" class="toolbar-btn" data-action="strike" title="鍒犻櫎绾?>
                                    <s>S</s>
                                </button>
                                <span style="display: inline-block; width: 1px; height: 20px; background: #ddd; margin: 0 5px;"></span>
                                <button type="button" class="toolbar-btn" data-action="quote" title="寮曠敤">
                                    "
                                </button>
                                <button type="button" class="toolbar-btn" data-action="code" title="浠ｇ爜">
                                    &lt;/&gt;
                                </button>
                                <span style="display: inline-block; width: 1px; height: 20px; background: #ddd; margin: 0 5px;"></span>
                                <button type="button" class="toolbar-btn emoji-btn" data-action="emoji" title="琛ㄦ儏">
                                    馃槉
                                </button>
                                <button type="button" class="toolbar-btn image-btn" data-action="image" title="鎻掑叆鍥剧墖" id="insert-image-btn" style="display: none;">
                                    馃柤锔?
                                </button>
                            </div>
                            <!-- emoji閫夋嫨鍣?-->
                            <div class="emoji-picker" id="emoji-picker" style="display: none; position: absolute; background: #fff; border: 1px solid #ddd; border-radius: 4px; padding: 10px; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-height: 200px; overflow-y: auto;">
                                <div class="emoji-grid" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px;">
                                    ${['馃榾','馃槂','馃槃','馃榿','馃槅','馃槄','馃ぃ','馃槀','馃檪','馃槉','馃槆','馃グ','馃槏','馃ぉ','馃槝','馃槜','馃槡','馃槞','馃ゲ','馃構','馃槢','馃槣','馃お','馃槤','馃','馃','馃き','馃か','馃','馃','馃え','馃槓','馃槕','馃樁','馃槒','馃槖','馃檮','馃槵','馃ぅ','馃槍','馃様','馃槳','馃い','馃槾','馃樂','馃','馃','馃あ','馃ぎ','馃サ','馃ザ','馃ゴ','馃樀','馃く','馃','馃コ','馃ジ','馃槑','馃','馃','馃槙','馃槦','馃檨','鈽癸笍','馃槷鈥嶐煉?,'馃槬','馃槩','馃槶','馃槺','馃槰','馃槹','馃槬','馃く','馃槻','馃槼','馃サ','馃い','馃ゴ','馃樀','馃挮','馃あ','馃ぎ','馃','馃','馃樂','馃ぇ','馃ザ','馃サ','馃槾','馃槳','馃か','馃き','馃','馃','馃い','馃構','馃槢','馃槣','馃お','馃槤','馃','馃','馃え','馃槓','馃槕','馃樁','馃槒','馃槖','馃檮','馃槵','馃ぅ','馃槍','馃様','馃','馃','馃槑','馃ジ','馃コ','馃','馃グ','馃槏','馃ぉ','馃槝','馃槜','馃槡','馃槞','馃檪','馃槉','馃槆','馃ぃ','馃槀','馃槄','馃槅','馃榿','馃槃','馃槂','馃榾'].map(e => `<span class="emoji-item" style="font-size: 18px; cursor: pointer; padding: 4px; text-align: center;" data-emoji="${e}">${e}</span>`).join('')}
                                </div>
                            </div>
                            <!-- 闅愯棌鐨勫浘鐗囦笂浼犺緭鍏?-->
                            <input type="file" id="image-upload" accept="image/*" style="display: none;">
                            <textarea id="reply-content" placeholder="鍒嗕韩浣犵殑鐪嬫硶..."></textarea>
                            <input type="hidden" id="reply-target" name="reply-target" value="">
                            <div>
                                <button type="submit">鍙戣〃鍥炲</button>
                                <a href="#" class="cancel-reply" id="cancel-reply" style="display: none;">鍙栨秷鍥炲</a>
                            </div>
                        </form>
                    `;
                } else {
                    // 鏈櫥褰曪細鏄剧ず鐧诲綍鎻愮ず
                    replyBox.innerHTML = `
                        <h4>鍙戣〃鍥炲</h4>
                        <div class="login-prompt" style="padding: 20px; text-align: center; color: #666; background: #f9f9f9; border: 1px solid #ddd; margin-bottom: 10px;">
                            <p style="margin-bottom: 10px;">鏈櫥褰曠敤鎴蜂笉鍙洖澶?/p>
                            <a href="login.html?redirect=${encodeURIComponent(window.location.href)}" style="color: #0066cc; text-decoration: none;">绔嬪嵆鐧诲綍</a>
                        </div>
                    `;
                }
                // 閲嶆柊缁戝畾鎻愪氦浜嬩欢锛堝洜涓?innerHTML 浼氱Щ闄や簨浠剁洃鍚級
                if (isLoggedIn) {
                    setupReplyForm();
                }
            }
        }
    }

    if (!isLoggedIn) {
        threadContainer.innerHTML = `
            <div class="thread-header">
                <div class="thread-title">${postData.title}</div>
                <span>浣滆€咃細<a href="#" style="color: #0066cc;">${postData.author}</a></span> | 
                <span>鍙戣〃浜庯細${postData.publishTime}</span> | 
                <span>娴忚锛?{postData.viewCount}娆?/span>
            </div>
            <div class="post" style="padding: 30px 20px; text-align: center;">
                <div style="font-size: 16px; color: #cc0000; margin-bottom: 12px;">鏈笘鍐呭浠呴檺鐧诲綍鍚庢煡鐪?/div>
                <div style="color: #666; margin-bottom: 12px;">璇峰厛鐧诲綍鍚庢煡鐪嬫鏂囧拰鍥炲笘鍐呭</div>
                <a href="login.html?redirect=${encodeURIComponent(window.location.href)}" style="color: #0066cc; text-decoration: none;">绔嬪嵆鐧诲綍</a>
            </div>
        `;
        return;
    }

    const allPosts = [{
        id: 0,
        userId: null,
        author: postData.author,
        authorLevel: postData.authorLevel,
        authorAvatar: postData.authorAvatar,
        time: postData.publishTime,
        floor: 1,
        content: postData.content,
        isOp: true,
        replyTo: null
    }, ...postData.comments.map((comment) => ({
        ...comment,
        isOp: isOriginalPosterReply(comment, postData)
    }))];

    // 鍒嗛〉閰嶇疆
    const PAGE_SIZE = POST_PAGE_SIZE;
    const urlParams = new URLSearchParams(window.location.search);
    const totalPosts = allPosts.length;
    const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));
    const requestedPage = parseInt(urlParams.get('page'), 10) || 1;
    const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
    
    // 璁＄畻褰撳墠椤垫樉绀虹殑甯栧瓙鑼冨洿
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, totalPosts);
    const currentPagePosts = allPosts.slice(startIndex, endIndex);
    
    // 鑾峰彇褰撳墠椤靛彲瑙佺殑妤煎眰鑼冨洿锛堢敤浜庢ゼ涓ゼ璺宠浆鍒ゆ柇锛?
    const visibleFloors = currentPagePosts.map(p => p.floor);

    // 閫掑綊鐢熸垚寮曠敤 HTML
    function generateQuoteHTML(replyToFloor, allPosts, depth = 0) {
        if (!replyToFloor || depth >= 3) return '';
        const target = allPosts.find(p => p.floor === replyToFloor);
        if (!target) return '';

        // 妫€鏌ョ洰鏍囨ゼ灞傛槸鍚﹁鍒犻櫎
        const deletedInfo = parseDeletedContent(target.content);
        if (deletedInfo) {
            return `
                <div class="quote-box quote-level-${depth}">
                    <div class="quote-author">寮曠敤 ${target.author}(<span style="color: #999; cursor: default;">${target.floor}妤?/span>) 鐨勫彂瑷€锛?/div>
                    <div class="quote-content" style="color: #999;">璇ユゼ灞傚凡琚垹闄?/div>
                </div>
            `;
        }

        const parentQuote = generateQuoteHTML(target.replyTo, allPosts, depth + 1);
        const plainContent = target.content.replace(/<[^>]*>/g, '').substring(0, 100);
        
        // 鍒ゆ柇鐩爣妤煎眰鏄惁鍦ㄥ綋鍓嶉〉
        const isOnCurrentPage = visibleFloors.includes(target.floor);
        
        return `
            <div class="quote-box quote-level-${depth}">
                ${parentQuote}
                <div class="quote-author">寮曠敤 ${target.author}(<a href="${isOnCurrentPage ? `#post-${target.floor}` : `?id=${postData.id}&page=${Math.ceil(target.floor / PAGE_SIZE)}#post-${target.floor}`}" class="quote-floor-link" style="color: #0066cc; cursor: pointer; text-decoration: underline;">${target.floor}妤?/a>) 鐨勫彂瑷€锛?/div>
                <div class="quote-content">${plainContent}${target.content.replace(/<[^>]*>/g, '').length > 100 ? '...' : ''}</div>
            </div>
        `;
    }

    // 鐢熸垚鍒嗛〉瀵艰埅HTML
    function generatePaginationHTML() {
        if (totalPages <= 1) return '';
        
        let html = '<div class="pagination" style="margin-top: 20px; text-align: center;">';
        
        // 棣栭〉鍜屼笂涓€椤?
        if (currentPage > 1) {
            html += `<a href="?id=${postData.id}&page=1" style="margin: 0 5px; padding: 4px 8px; border: 1px solid #ccc; text-decoration: none; color: #0066cc;">棣栭〉</a>`;
            html += `<a href="?id=${postData.id}&page=${currentPage - 1}" style="margin: 0 5px; padding: 4px 8px; border: 1px solid #ccc; text-decoration: none; color: #0066cc;">涓婁竴椤?/a>`;
        }
        
        // 椤电爜
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                html += `<span style="margin: 0 5px; padding: 4px 8px; background: #cc0000; color: white;">${i}</span>`;
            } else {
                // 鍙樉绀哄綋鍓嶉〉闄勮繎鐨勯〉鐮?
                if (Math.abs(i - currentPage) <= 2 || i === 1 || i === totalPages) {
                    html += `<a href="?id=${postData.id}&page=${i}" style="margin: 0 5px; padding: 4px 8px; border: 1px solid #ccc; text-decoration: none; color: #0066cc;">${i}</a>`;
                } else if (Math.abs(i - currentPage) === 3) {
                    html += `<span style="margin: 0 5px; color: #999;">...</span>`;
                }
            }
        }
        
        // 涓嬩竴椤靛拰鏈〉
        if (currentPage < totalPages) {
            html += `<a href="?id=${postData.id}&page=${currentPage + 1}" style="margin: 0 5px; padding: 4px 8px; border: 1px solid #ccc; text-decoration: none; color: #0066cc;">涓嬩竴椤?/a>`;
            html += `<a href="?id=${postData.id}&page=${totalPages}" style="margin: 0 5px; padding: 4px 8px; border: 1px solid #ccc; text-decoration: none; color: #0066cc;">鏈〉</a>`;
        }
        
        html += `</div>`;
        return html;
    }

    threadContainer.innerHTML = `
        <div class="thread-header">
            <div class="thread-title">${postData.title}</div>
            <span>浣滆€咃細<a href="#" style="color: #0066cc;">${postData.author}</a></span> | 
            <span>鍙戣〃浜庯細${postData.publishTime}</span> | 
            <span>娴忚锛?{postData.viewCount}娆?/span>
            <a href="#" id="delete-discussion-link" style="display: none; margin-left: 10px; color: #cc0000;">鍒犻櫎甯栧瓙</a>
        </div>
        
        ${currentPagePosts.map((post, index) => {
            // 妫€鏌ユ槸鍚︽槸鍒犻櫎鏍囪
            const deletedInfo = parseDeletedContent(post.content);
            if (deletedInfo) {
                // 鏄剧ず鍒犻櫎鎻愮ず锛堝寘鍚ゼ灞傚彿锛?
                return `
                    <div class="post" id="post-${post.floor}" data-post-id="${post.id}" style="background-color: #f5f5f5; border: 1px dashed #ccc; padding: 15px; text-align: center;">
                        <p style="color: #999; font-size: 14px;">绗?${post.floor} 妤煎凡鍦ㄣ€?{deletedInfo.deletedAt}銆戣銆?{deletedInfo.deletedBy}銆戝垹闄?/p>
                    </div>
                `;
            }
            
            const quoteHTML = generateQuoteHTML(post.replyTo, allPosts);
            const plainContent = post.content.replace(/<[^>]*>/g, '').substring(0, 50) + (post.content.replace(/<[^>]*>/g, '').length > 50 ? '...' : '');
            
            return `
                <div class="post" id="post-${post.floor}" data-post-id="${post.id}">
                    ${quoteHTML}
                    <div class="post-header">
                        <div class="poster-info">
                            <div class="avatar">
                                ${post.authorAvatar && post.authorAvatar.length === 1 
                                    ? `<span style="font-size: 24px; color: #666; font-weight: bold;">${post.authorAvatar}</span>` 
                                    : `<img src="${post.authorAvatar || 'images/鐢ㄦ埛澶村儚.png'}" alt="avatar" style="width:100%; height:100%; border-radius:3px; object-fit:cover;">`
                                }
                            </div>
                            <div>
                                <div class="poster-name ${post.isOp ? 'op' : ''}">${post.author}${post.isOp ? '<span class="op-badge">妤间富</span>' : ''}</div>
                                <div style="font-size: 11px; color: #999;">${post.authorLevel}</div>
                            </div>
                        </div>
                        <div class="post-time">${post.time}</div>
                    </div>
                    <div class="post-content">${post.content}</div>
                    <div class="floor-info" style="display: flex; justify-content: flex-end; align-items: center;">
                        <span class="floor-number" style="margin-right: auto;">${post.floor}妤?/span>
                        ${postData.allowComments !== false ? `<a href="#" class="reply-link" data-floor="${post.floor}" data-author="${post.author}" data-content="${plainContent}">鍥炲</a>` : ''}
                        <span style="margin: 0 5px; color: #ccc; display: none;" class="reply-divider">|</span>
                        <a href="#" class="delete-link" data-post-id="${post.id}" data-floor="${post.floor}" style="display: none; color: #cc0000;">鍒犻櫎</a>
                    </div>
                </div>
            `;
        }).join('')}
        
        ${generatePaginationHTML()}
        
        <div class="forum-stats">
            <span>鍏?${totalPosts} 妤?/span>
            <span>褰撳墠绗?${currentPage} / ${totalPages} 椤?/span>
            <span>鏈€鍚庡洖澶嶏細${postData.comments.length > 0 ? postData.comments[postData.comments.length - 1].time : postData.publishTime}</span>
        </div>
    `;

    setupReplyButtons(postData);
    setupDeleteButtons(allPosts, postData);
    updatePostUserBadges(allPosts);
    
    // 椤甸潰鍔犺浇鍚庢鏌RL閿氱偣锛岃繘琛岄珮浜?
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

// 璁剧疆鍥炲鎸夐挳
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
            replyContent.value = `鍥炲 ${author}(${floor}妤?锛歚;
            replyBoxTitle.textContent = `鍥炲 ${author}(${floor}妤?`;
            document.getElementById('cancel-reply').style.display = 'inline';
            replyContent.focus();
        });
    });
}

// 璁剧疆鍒犻櫎鎸夐挳
async function setupDeleteButtons(allPosts, postData) {
    const deleteLinks = document.querySelectorAll('.delete-link');
    
    for (const link of deleteLinks) {
        const postId = Number(link.dataset.postId);
        const floor = Number(link.dataset.floor);
        
        // 鎵惧埌瀵瑰簲鐨勫笘瀛?
        const post = allPosts.find(p => p.id === postId || p.floor === floor);
        
        // 妫€鏌ユ槸鍚︽湁鏉冮檺鍒犻櫎
        if (post && await canDeletePost(post)) {
            link.style.display = 'inline';
            
            // 鏄剧ず鍒嗛殧绗?
            const divider = link.parentElement.querySelector('.reply-divider');
            if (divider) {
                divider.style.display = 'inline';
            }
            
            link.addEventListener('click', async function(e) {
                e.preventDefault();
                
                // 浜屾纭
                if (!confirm(`纭畾瑕佸垹闄ょ ${floor} 妤肩殑甯栧瓙鍚楋紵姝ゆ搷浣滀笉鍙挙閿€銆俙)) {
                    return;
                }
                
                // 鎵ц鍒犻櫎
                const success = await flarumDeletePost(postId, floor);
                if (success) {
                    // 鑾峰彇褰撳墠鐧诲綍鐢ㄦ埛淇℃伅
                    const currentUsername = localStorage.getItem('flarumUsername') || '鍖垮悕鐢ㄦ埛';
                    const now = new Date();
                    const deleteTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                    
                    // 鍦ㄥ師鍦版樉绀哄垹闄ゆ彁绀?
                    const postElement = document.getElementById(`post-${floor}`);
                    if (postElement) {
                        postElement.innerHTML = `
                            <div class="post" id="post-${floor}" style="background-color: #f5f5f5; border: 1px dashed #ccc; padding: 15px; text-align: center;">
                                <p style="color: #999; font-size: 14px;">姝ゆゼ灞傚凡鍦ㄣ€?{deleteTime}銆戣銆?{currentUsername}銆戝垹闄?/p>
                            </div>
                        `;
                    }
                }
            });
        }
    }
    
    // 璁剧疆鍒犻櫎鏁翠釜甯栧瓙鐨勬寜閽?
    const deleteDiscussionLink = document.getElementById('delete-discussion-link');
    if (deleteDiscussionLink && postData) {
        // 妫€鏌ユ槸鍚︽湁鏉冮檺鍒犻櫎鏁翠釜甯栧瓙锛堜富棰樺笘鐨勪綔鑰呮垨绠＄悊鍛橈級
        const isAuthor = localStorage.getItem('flarumUserId') === String(postData.userId);
        const isAdmin = await isCurrentUserAdmin();
        
        if (isAuthor || isAdmin) {
            deleteDiscussionLink.style.display = 'inline';
            
            deleteDiscussionLink.addEventListener('click', async function(e) {
                e.preventDefault();
                
                // 浜屾纭
                if (!confirm(`纭畾瑕佸垹闄ゆ暣涓笘瀛愩€?{postData.title}銆嶅悧锛熸鎿嶄綔灏嗗垹闄ゆ墍鏈夊洖澶嶏紝涓嶅彲鎾ら攢銆俙)) {
                    return;
                }
                
                // 鎵ц鍒犻櫎
                const success = await flarumDeleteDiscussion(postData.id);
                if (success) {
                    alert('鍒犻櫎鎴愬姛锛?);
                    // 杩斿洖棣栭〉
                    window.location.href = '/';
                }
            });
        }
    }
}

// 鏇存柊甯栧瓙涓殑鐢ㄦ埛鍚嶆樉绀猴紝娣诲姞鐢ㄦ埛缁勬爣蹇?
async function updatePostUserBadges(allPosts) {
    for (const post of allPosts) {
        if (!post.userId) continue;
        
        const badgeType = await getUserGroupBadgeType(post.userId);
        if (!badgeType) continue;
        
        // 鏇存柊甯栧瓙涓殑鐢ㄦ埛鍚嶆樉绀?
        const posterNameElements = document.querySelectorAll(`#post-${post.floor} .poster-name`);
        for (const element of posterNameElements) {
            // 妫€鏌ユ槸鍚﹀凡缁忔坊鍔犺繃鏍囧織
            if (element.querySelector('.group-badge')) continue;
            
            // 鍒涘缓鏍囧織鍏冪礌
            const badge = document.createElement('span');
            badge.className = 'group-badge group-badge-' + badgeType;
            badge.style.cssText = `
                display: inline-block;
                width: 16px;
                height: 16px;
                border-radius: 2px;
                margin-right: 4px;
                vertical-align: middle;
                text-align: center;
                font-size: 10px;
                line-height: 16px;
                color: white;
                font-weight: bold;
            `;
            
            if (badgeType === 'admin') {
                badge.style.backgroundColor = '#cc0000';
                badge.textContent = '绠?;
            } else if (badgeType === 'mod') {
                badge.style.backgroundColor = '#0066cc';
                badge.textContent = '鐗?;
            }
            
            element.insertBefore(badge, element.firstChild);
        }
    }
}

// 鑾峰彇鐢ㄦ埛缁勬爣蹇楃被鍨?
async function getUserGroupBadgeType(userId) {
    if (!userId) return '';
    
    try {
        const userJson = await flarumRequest(`/users/${userId}`);
        const groups = userJson?.data?.relationships?.groups?.data || [];
        
        // 妫€鏌ユ槸鍚︽槸绠＄悊鍛橈紙缁処D涓?锛?
        const isAdmin = groups.some(g => g.id === '1');
        if (isAdmin) return 'admin';
        
        // 妫€鏌ユ槸鍚︽槸鐗堜富锛堢粍ID涓?锛?
        const isMod = groups.some(g => g.id === '2');
        if (isMod) return 'mod';
    } catch {
        // 蹇界暐閿欒
    }
    
    return '';
}

// 妫€鏌ュ綋鍓嶇敤鎴锋槸鍚︽槸绠＄悊鍛?
async function isCurrentUserAdmin() {
    const token = getFlarumToken();
    if (!token) return false;
    
    const userId = localStorage.getItem('flarumUserId');
    if (!userId) return false;
    
    try {
        const userJson = await flarumRequest(`/users/${userId}`, { auth: true });
        const groups = userJson?.data?.relationships?.groups?.data || [];
        // 妫€鏌ユ槸鍚﹀湪绠＄悊鍛樼粍锛堥€氬父ID涓?锛?
        return groups.some(g => g.id === '1');
    } catch {
        return false;
    }
}

// 鑾峰彇褰撳墠鐧诲綍鐢ㄦ埛淇℃伅
async function getCurrentUser() {
    const token = getFlarumToken();
    const userId = localStorage.getItem('flarumUserId');
    
    if (!token || !userId) {
        return null;
    }
    
    try {
        const json = await flarumRequest(`/users/${userId}`, { auth: true });
        if (json?.data) {
            return {
                id: json.data.id,
                username: json.data.attributes?.username || '',
                displayName: getPreferredDisplayName(json.data.attributes, ''),
                avatar: getUserAvatarUrl(json.data),
                email: json.data.attributes?.email || ''
            };
        }
    } catch (error) {
        console.error('鑾峰彇褰撳墠鐢ㄦ埛淇℃伅澶辫触:', error);
    }
    
    return null;
}

// 鏇存柊鍥炲琛ㄥ崟浠ュ弽鏄犵櫥褰曠姸鎬?
async function updateReplyFormForLoginStatus() {
    const isLoggedIn = !!getFlarumToken();
    const replyBox = document.getElementById('reply-box');
    
    if (!replyBox) return;
    
    if (isLoggedIn) {
        // 宸茬櫥褰曪細鏄剧ず鐢ㄦ埛淇℃伅鍜屽洖澶嶈〃鍗?
        const username = localStorage.getItem('flarumUsername') || '宸茬櫥褰曠敤鎴?;
        
        // 鑾峰彇鐢ㄦ埛澶村儚
        let avatarUrl = 'images/鐢ㄦ埛澶村儚.png';
        if (isFlarumConfigured()) {
            const user = await getCurrentUser();
            if (user && user.avatar) {
                avatarUrl = user.avatar;
            }
        }
        
        replyBox.innerHTML = `
            <h4>鍙戣〃鍥炲</h4>
            <div class="current-user-info" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
                <img src="${avatarUrl}" alt="澶村儚" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
                <div>
                    <div style="font-weight: bold; color: #333;">${username}</div>
                    <div style="font-size: 12px; color: #999;">Lv.1 鏂版墜涓婅矾</div>
                </div>
            </div>
            <form class="reply-form" id="reply-form">
                <textarea id="reply-content" placeholder="鍒嗕韩浣犵殑鐪嬫硶..."></textarea>
                <input type="hidden" id="reply-target" name="reply-target" value="">
                <div>
                    <button type="submit">鍙戣〃鍥炲</button>
                    <a href="#" class="cancel-reply" id="cancel-reply" style="display: none;">鍙栨秷鍥炲</a>
                </div>
            </form>
        `;
        // 閲嶆柊缁戝畾琛ㄥ崟浜嬩欢
        setupReplyForm();
    } else {
        // 鏈櫥褰曪細鐩存帴鏄剧ず鐧诲綍鎻愮ず锛屾浛鎹㈡暣涓洖澶嶅尯鍩?
        replyBox.innerHTML = `
            <h4>鍙戣〃鍥炲</h4>
            <div style="padding: 20px; background: #fff3f3; border: 1px solid #ffcccc; border-radius: 4px; text-align: center;">
                <div style="font-size: 16px; color: #cc0000; margin-bottom: 10px;">鏈櫥褰曠敤鎴蜂笉鍙洖澶?/div>
                <a href="login.html?redirect=${encodeURIComponent(window.location.href)}" style="color: #0066cc; text-decoration: none;">鐐瑰嚮鐧诲綍</a>
            </div>
        `;
    }
}

// 璁剧疆鍥炲琛ㄥ崟浜嬩欢锛堝彧缁戝畾涓€娆★級
function setupReplyForm() {
    const replyTargetInput = document.getElementById('reply-target');
    const cancelReply = document.getElementById('cancel-reply');
    const replyContent = document.getElementById('reply-content');
    const replyBoxTitle = document.querySelector('.reply-box h4');
    const replyForm = document.getElementById('reply-form');
    const replyNameInput = document.getElementById('reply-name');

    // 鍒濆鍖栧伐鍏锋爮
    initToolbar();
    
    // 妫€鏌ョ敤鎴锋潈闄愶紝鏄剧ず/闅愯棌鍥剧墖鎸夐挳
    checkImagePermission();

    // 鍙栨秷鍥炲鎸夐挳
    cancelReply.removeEventListener('click', cancelReplyHandler);
    cancelReply.addEventListener('click', cancelReplyHandler);

    function cancelReplyHandler(e) {
        e.preventDefault();
        replyTargetInput.value = '';
        replyContent.value = '';
        replyBoxTitle.textContent = '鍙戣〃鍥炲';
        cancelReply.style.display = 'none';
    }

    // 琛ㄥ崟鎻愪氦锛堜娇鐢ㄤ簨浠跺鎵樻垨绉婚櫎鏃т簨浠讹級
    replyForm.removeEventListener('submit', submitHandler);
    replyForm.addEventListener('submit', submitHandler);

    async function submitHandler(e) {
        e.preventDefault();
        
        const name = replyNameInput?.value?.trim() || '';
        const content = replyContent.value.trim();
        const replyTo = replyTargetInput.value;

        if (!content) {
            alert('璇疯緭鍏ュ洖澶嶅唴瀹?);
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('id') || '1';
        
        // 鑾峰彇褰撳墠甯栧瓙鏁版嵁锛堜粠鍐呭瓨鎴栫紦瀛橈紝閬垮厤閲嶆柊鍔犺浇锛?
        let postData = window.currentPostData;
        if (!postData) {
            postData = await loadPostData(postId);
            if (!postData) {
                alert('鏃犳硶鑾峰彇甯栧瓙鏁版嵁');
                return;
            }
            window.currentPostData = postData;
        }

        // 鏄剧ず鎻愪氦涓姸鎬?
        const submitBtn = replyForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = '鎻愪氦涓?..';

        try {
            const contentToSend = replyTo 
                ? `鍥炲 ${replyTo}锛歕n${content}`
                : content;

            const response = await flarumRequest('/posts', {
                method: 'POST',
                auth: true,
                json: {
                    data: {
                        type: 'posts',
                        attributes: {
                            content: contentToSend
                        },
                        relationships: {
                            discussion: {
                                data: { type: 'discussions', id: String(postId) }
                            }
                        }
                    }
                }
            });

            if (response) {
                replyContent.value = '';
                replyTargetInput.value = '';
                cancelReply.style.display = 'none';
                replyBoxTitle.textContent = '鍙戣〃鍥炲';
                
                // 閲嶆柊鍔犺浇甯栧瓙鏁版嵁骞舵洿鏂癠I
                const newPostData = await loadPostData(postId);
                if (newPostData) {
                    window.currentPostData = newPostData;
                    renderForumThread(newPostData);
                }
                
                // 婊氬姩鍒版渶鏂板洖澶?
                setTimeout(() => {
                    const posts = document.querySelectorAll('.post');
                    if (posts.length > 0) {
                        posts[posts.length - 1].scrollIntoView({ behavior: 'smooth' });
                    }
                }, 100);
            }
        } catch (error) {
            console.error('鎻愪氦澶辫触:', error);
            alert(getFriendlyErrorMessage(error, 'create_post'));
        } finally {
            submitBtn.textContent = originalBtnText;
        }
    }
}

// 鍒濆鍖栧伐鍏锋爮
function initToolbar() {
    const toolbar = document.querySelector('.toolbar');
    const emojiPicker = document.getElementById('emoji-picker');
    const emojiBtn = document.querySelector('.emoji-btn');
    const imageBtn = document.getElementById('insert-image-btn');
    const imageUpload = document.getElementById('image-upload');
    const replyContent = document.getElementById('reply-content');

    if (!toolbar) return;

    // 宸ュ叿鏍忔寜閽偣鍑讳簨浠?
    toolbar.addEventListener('click', function(e) {
        const target = e.target.closest('.toolbar-btn');
        if (!target) return;
        
        const action = target.dataset.action;
        if (!action) return;

        switch (action) {
            case 'bold':
                wrapSelection(replyContent, '**', '**');
                break;
            case 'italic':
                wrapSelection(replyContent, '*', '*');
                break;
            case 'underline':
                wrapSelection(replyContent, '__', '__');
                break;
            case 'strike':
                wrapSelection(replyContent, '~~', '~~');
                break;
            case 'quote':
                wrapSelection(replyContent, '> ', '', true);
                break;
            case 'code':
                wrapSelection(replyContent, '`', '`');
                break;
            case 'emoji':
                toggleEmojiPicker();
                break;
            case 'image':
                imageUpload.click();
                break;
        }
    });

    // emoji閫夋嫨
    emojiPicker?.addEventListener('click', function(e) {
        const emojiItem = e.target.closest('.emoji-item');
        if (emojiItem) {
            insertAtCursor(replyContent, emojiItem.dataset.emoji);
            emojiPicker.style.display = 'none';
        }
    });

    // 鐐瑰嚮澶栭儴鍏抽棴emoji閫夋嫨鍣?
    document.addEventListener('click', function(e) {
        if (emojiPicker && emojiPicker.style.display === 'block') {
            const isInsideToolbar = e.target.closest('.toolbar');
            const isInsidePicker = e.target.closest('.emoji-picker');
            if (!isInsideToolbar && !isInsidePicker) {
                emojiPicker.style.display = 'none';
            }
        }
    });

    // 鍥剧墖涓婁紶
    imageUpload?.addEventListener('change', async function(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        // 鏂囦欢楠岃瘉
        if (!file.type.startsWith('image/')) {
            alert('璇烽€夋嫨鍥剧墖鏂囦欢');
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) {
            alert('鍥剧墖澶у皬涓嶈兘瓒呰繃2MB');
            return;
        }

        // 涓婁紶鍥剧墖
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await flarumRequest('/api/files', {
                method: 'POST',
                auth: true,
                body: formData
            });

            if (response && response.data?.attributes?.url) {
                // 鎻掑叆鍥剧墖Markdown
                insertAtCursor(replyContent, `![${file.name}](${response.data.attributes.url})`);
            }
        } catch (error) {
            console.error('鍥剧墖涓婁紶澶辫触:', error);
            alert(getFriendlyErrorMessage(error, 'upload_image'));
        }

        // 娓呯┖鏂囦欢閫夋嫨
        imageUpload.value = '';
    });

    // 蹇嵎閿敮鎸?
    replyContent?.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    wrapSelection(replyContent, '**', '**');
                    break;
                case 'i':
                    e.preventDefault();
                    wrapSelection(replyContent, '*', '*');
                    break;
                case 'u':
                    e.preventDefault();
                    wrapSelection(replyContent, '__', '__');
                    break;
            }
        }
    });
}

// 鍒囨崲emoji閫夋嫨鍣ㄦ樉绀?
function toggleEmojiPicker() {
    const emojiPicker = document.getElementById('emoji-picker');
    if (emojiPicker) {
        emojiPicker.style.display = emojiPicker.style.display === 'block' ? 'none' : 'block';
    }
}

// 鍦ㄥ厜鏍囦綅缃彃鍏ユ枃鏈?
function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    textarea.value = before + text + after;
    
    // 璁剧疆鍏夋爣浣嶇疆
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
}

// 鍖呰９閫変腑鐨勬枃鏈?
function wrapSelection(textarea, before, after, newLine = false) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);
    
    let newText;
    if (newLine) {
        // 寮曠敤闇€瑕佸湪鏂拌寮€濮?
        const lineStart = beforeText.lastIndexOf('\n') + 1;
        const lineBefore = beforeText.substring(0, lineStart);
        const lineAfter = beforeText.substring(lineStart);
        newText = lineBefore + before + lineAfter + selectedText + after + '\n' + afterText;
        textarea.value = newText;
        textarea.selectionStart = lineStart + before.length + lineAfter.length;
        textarea.selectionEnd = textarea.selectionStart + selectedText.length;
    } else {
        newText = beforeText + before + selectedText + after + afterText;
        textarea.value = newText;
        textarea.selectionStart = start + before.length;
        textarea.selectionEnd = end + before.length;
    }
    
    textarea.focus();
}

// 妫€鏌ョ敤鎴锋槸鍚︽湁鍥剧墖涓婁紶鏉冮檺
async function checkImagePermission() {
    const insertImageBtn = document.getElementById('insert-image-btn');
    if (!insertImageBtn) return;

    const token = getFlarumToken();
    if (!token) {
        insertImageBtn.style.display = 'none';
        return;
    }

    const currentUserId = localStorage.getItem('flarumUserId');
    if (!currentUserId) {
        insertImageBtn.style.display = 'none';
        return;
    }

    try {
        const userJson = await flarumRequest(`/users/${currentUserId}?include=groups`, { auth: true });
        const groups = userJson?.data?.relationships?.groups?.data || [];
        // 妫€鏌ユ槸鍚﹀湪绠＄悊鍛樻垨鐗堜富缁?
        const isAdminOrMod = groups.some(g => ['1', '2'].includes(g.id));
        insertImageBtn.style.display = isAdminOrMod ? 'inline-block' : 'none';
    } catch {
        insertImageBtn.style.display = 'none';
    }
}

// 灏嗘柊璇勮鐩存帴鎻掑叆鍒伴〉闈腑锛堟棤闇€閲嶆柊娓叉煋鏁翠釜甯栧瓙锛?
function insertNewCommentToPage(comment, postData) {
    const threadContainer = document.querySelector('.forum-thread');
    if (!threadContainer) return;
    
    // 鏇存柊璇勮璁℃暟
    const commentCountElement = document.querySelector('.post-stats span:last-child');
    if (commentCountElement) {
        const currentCount = postData.comments.length;
        commentCountElement.textContent = `璇勮: ${currentCount}`;
    }
    
    // 鐢熸垚鏂拌瘎璁虹殑HTML
    const allPosts = [{
        id: 0,
        userId: null,
        author: postData.author,
        authorLevel: postData.authorLevel,
        authorAvatar: postData.authorAvatar,
        time: postData.publishTime,
        floor: 1,
        content: postData.content,
        isOp: true,
        replyTo: null
    }, ...postData.comments.map((item) => ({
        ...item,
        isOp: isOriginalPosterReply(item, postData)
    }))];
    
    // 閫掑綊鐢熸垚寮曠敤 HTML
    function generateQuoteHTML(replyToFloor, allPosts, depth = 0) {
        if (!replyToFloor || depth >= 3) return '';
        const target = allPosts.find(p => p.floor === replyToFloor);
        if (!target) return '';

        // 妫€鏌ョ洰鏍囨ゼ灞傛槸鍚﹁鍒犻櫎
        const deletedInfo = parseDeletedContent(target.content);
        if (deletedInfo) {
            return `
                <div class="quote-box quote-level-${depth}">
                    <div class="quote-author">寮曠敤 ${target.author}(<span style="color: #999; cursor: default;">${target.floor}妤?/span>) 鐨勫彂瑷€锛?/div>
                    <div class="quote-content" style="color: #999;">璇ユゼ灞傚凡琚垹闄?/div>
                </div>
            `;
        }

        const parentQuote = generateQuoteHTML(target.replyTo, allPosts, depth + 1);
        const plainContent = target.content.replace(/<[^>]*>/g, '').substring(0, 100);
        
        return `
            <div class="quote-box quote-level-${depth}">
                ${parentQuote}
                <div class="quote-author">寮曠敤 ${target.author}(<a href="#post-${target.floor}" class="quote-floor-link" style="color: #0066cc; cursor: pointer; text-decoration: underline;">${target.floor}妤?/a>) 鐨勫彂瑷€锛?/div>
                <div class="quote-content">${plainContent}${target.content.replace(/<[^>]*>/g, '').length > 100 ? '...' : ''}</div>
            </div>
        `;
    }
    
    const quoteHTML = generateQuoteHTML(comment.replyTo, allPosts);
    
    const isOpReply = isOriginalPosterReply(comment, postData);

    const commentHTML = `
        <div class="post" id="post-${comment.floor}">
            <div class="post-header">
                <div class="post-author">
                    <img src="${comment.authorAvatar}" alt="澶村儚" class="author-avatar">
                    <div class="author-info">
                        <div class="author-name">${comment.author}${isOpReply ? '<span class="op-badge">妤间富</span>' : ''}</div>
                        <div class="author-level">${comment.authorLevel}</div>
                    </div>
                </div>
                <div class="post-meta">
                    <span class="post-time">${comment.time}</span>
                    <span class="post-floor">${comment.floor}妤?/span>
                </div>
            </div>
            <div class="post-content">
                ${quoteHTML}
                ${comment.content}
            </div>
            <div class="post-actions">
                <a href="#" class="reply-link" data-floor="${comment.floor}" data-author="${comment.author}" data-content="${comment.content.replace(/"/g, '&quot;')}">鍥炲</a>
            </div>
        </div>
    `;
    
    // 鎻掑叆鍒板笘瀛愬垪琛ㄦ湯灏?
    threadContainer.insertAdjacentHTML('beforeend', commentHTML);
    
    // 涓烘柊鎻掑叆鐨勫洖澶嶆寜閽粦瀹氫簨浠?
    const newReplyLink = threadContainer.querySelector(`#post-${comment.floor} .reply-link`);
    if (newReplyLink) {
        newReplyLink.addEventListener('click', function(e) {
            e.preventDefault();
            const floor = this.dataset.floor;
            const author = this.dataset.author;
            
            const replyTargetInput = document.getElementById('reply-target');
            const replyContent = document.getElementById('reply-content');
            const replyBoxTitle = document.querySelector('.reply-box h4');
            
            if (replyTargetInput && replyContent && replyBoxTitle) {
                replyTargetInput.value = floor;
                replyContent.value = `鍥炲 ${author}(${floor}妤?锛歚;
                replyBoxTitle.textContent = `鍥炲 ${author}(${floor}妤?`;
                document.getElementById('cancel-reply').style.display = 'inline';
                replyContent.focus();
            }
        });
    }
}

// 鏇存柊鐢ㄦ埛瀵艰埅閾炬帴
function updateUserLinks() {
    const userLinksContainer = document.getElementById('user-links-container');
    if (!userLinksContainer) return;
    
    const userLoggedIn = !!getFlarumToken();
    
    if (userLoggedIn) {
        userLinksContainer.innerHTML = `
            <a href="profile.html">涓汉璧勬枡</a>
            <a href="#" id="nav-logout-btn">閫€鍑虹櫥褰?/a>
        `;
        
        const logoutBtn = document.getElementById('nav-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                clearFlarumToken();
                window.location.href = '/';
            });
        }
    } else {
        userLinksContainer.innerHTML = `
            <a href="login.html?redirect=${encodeURIComponent(window.location.href)}" id="login-btn">鐧诲綍</a>
            <a href="register.html" id="register-btn">娉ㄥ唽</a>
        `;
    }
}

function refreshAuthDependentUI() {
    try {
        updateUserLinks();
    } catch (_) {}

    if (typeof updateReplyFormForLoginStatus === 'function') {
        try {
            updateReplyFormForLoginStatus();
        } catch (_) {}
    }

    if (typeof updateTopNavLoginStatus === 'function') {
        try {
            updateTopNavLoginStatus(!!getFlarumToken());
        } catch (_) {}
    }
}

window.addEventListener('flarum-auth-changed', refreshAuthDependentUI);

// 娴忚鍣ㄤ粠 bfcache 鎭㈠椤甸潰鏃讹紝DOMContentLoaded 涓嶄細鍐嶆瑙﹀彂銆?
// 鍦?pageshow/focus 闃舵涓诲姩鍒锋柊鐧诲綍鎬侊紝閬垮厤椤堕儴瀵艰埅鏄剧ず鏃х姸鎬併€?
window.addEventListener('pageshow', refreshAuthDependentUI);
window.addEventListener('focus', refreshAuthDependentUI);

window.addEventListener('storage', function(e) {
    if (!e || e.key === null || e.key === 'flarumToken' || e.key === 'flarumUserId' || e.key === 'flarumUsername') {
        refreshAuthDependentUI();
    }
});

// 璁剧疆骞虫粦婊氬姩
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

// 璁剧疆娴獥瀵艰埅鍥炬爣
function setupFloatingAd() {
    const ad = document.querySelector('.floating-ad');
    if (!ad) return;
    
    // 绔嬪嵆鏄剧ず娴獥瀵艰埅鍥炬爣
    ad.style.display = 'block';
    ad.style.position = 'fixed'; // 纭繚鏄?fixed 甯冨眬
    
    let adWidth = 0;
    let adHeight = 0;
    let windowWidth = 0;
    let windowHeight = 0;
    
    // 闅忔満鍒濆浣嶇疆鍜岄€熷害
    let x = Math.random() * (window.innerWidth - 100);
    let y = Math.random() * (window.innerHeight - 100);
    let dx = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.3);
    let dy = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.3);
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

        // 杈圭晫妫€娴嬪拰鍙嶅脊
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
    
    // 绛夊緟鍔犺浇鍚庡紑濮?
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

// 璁剧疆娴獥骞垮憡2
function setupFloatingAd2() {
    const ad = document.querySelector('.floating-ad2');
    if (!ad) return;
    
    // 绔嬪嵆鏄剧ず娴獥骞垮憡
    ad.style.display = 'block';
    ad.style.position = 'fixed';
    
    let adWidth = 0;
    let adHeight = 0;
    let windowWidth = 0;
    let windowHeight = 0;
    
    // 闅忔満鍒濆浣嶇疆鍜岄€熷害
    let x = Math.random() * (window.innerWidth - 100);
    let y = Math.random() * (window.innerHeight - 100);
    let dx = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.3);
    let dy = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.3);
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

        // 杈圭晫妫€娴嬪拰鍙嶅脊
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
    
    // 绛夊緟鍔犺浇鍚庡紑濮?
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

// 璁剧疆鍙充笅瑙掑脊绐楀箍鍛?
function setupPopupAd() {
    const popupAd = document.querySelector('.popup-ad');
    if (!popupAd) return;
    
    const closeButton = popupAd.querySelector('.popup-close');
    if (!closeButton) return;
    
    const leftCloseBtn = document.querySelector('.left-close-btn');
    const popupAudio = document.getElementById('popup-audio');
    
    // 璁剧疆寮圭獥骞垮憡闊抽噺涓?/3
    if (popupAudio) {
        popupAudio.volume = 1/3;
    }
    
    function updateLeftCloseBtnPosition() {
        if (leftCloseBtn && popupAd.style.display === 'block') {
            const popupHeight = popupAd.offsetHeight;
            leftCloseBtn.style.bottom = popupHeight + 'px';
            leftCloseBtn.style.right = '0';
        }
    }
    
    // 绔嬪嵆鏄剧ず寮圭獥骞垮憡鍜屽乏渚у亣鍏抽棴鎸夐挳
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
    
    // 榧犳爣鎮仠鏃跺紑濮嬪姩鐢诲拰鎾斁闊抽
    popupAd.addEventListener('mouseenter', function() {
        popupAd.style.animation = 'pulse 0.5s infinite ease-in-out';
        if (popupAudio) {
            popupAudio.volume = 1/3; // 鍦ㄦ挱鏀惧墠鍐嶆璁剧疆闊抽噺
            popupAudio.play().catch(function(error) {
                console.log('Popup audio playback prevented:', error);
            });
        }
    });
    
    // 榧犳爣绉诲紑鏃跺仠姝㈠姩鐢诲拰鏆傚仠闊抽
    popupAd.addEventListener('mouseleave', function() {
        popupAd.style.animation = 'none';
        if (popupAudio) {
            popupAudio.pause();
        }
    });
    
    // 鐩戝惉绐楀彛澶у皬鍙樺寲锛屾洿鏂板亣鍏抽棴鎸夐挳浣嶇疆
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

    // 澶勭悊鍋囧叧闂寜閽殑鐐瑰嚮璺宠浆
    const fakeCloseBtn = popupAd.querySelector('.fake-close-btn');
    if (fakeCloseBtn) {
        fakeCloseBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            window.location.href = AD_TARGET_URL;
        });
    }

    if (leftCloseBtn) {
        const sideFakeBtn = leftCloseBtn.querySelector('.popup-close');
        if (sideFakeBtn) {
            sideFakeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                window.location.href = AD_TARGET_URL;
            });
        }
    }
}

