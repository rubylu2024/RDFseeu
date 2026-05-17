const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function extractFunction(source, functionName) {
    const candidates = [
        `function ${functionName}(`,
        `async function ${functionName}(`
    ];
    const start = candidates
        .map((marker) => source.indexOf(marker))
        .find((index) => index >= 0);

    if (start == null || start < 0) {
        throw new Error(`未找到函数: ${functionName}`);
    }

    const braceStart = source.indexOf('{', start);
    if (braceStart < 0) {
        throw new Error(`未找到函数体: ${functionName}`);
    }

    let i = braceStart;
    let depth = 0;
    let mode = 'normal';
    let templateExprDepth = 0;

    while (i < source.length) {
        const char = source[i];
        const next = source[i + 1];

        if (mode === 'normal') {
            if (char === "'" || char === '"') {
                mode = char;
            } else if (char === '`') {
                mode = 'template';
            } else if (char === '/' && next === '/') {
                mode = 'line_comment';
                i += 1;
            } else if (char === '/' && next === '*') {
                mode = 'block_comment';
                i += 1;
            } else if (char === '{') {
                depth += 1;
            } else if (char === '}') {
                depth -= 1;
                if (depth === 0) {
                    return source.slice(start, i + 1);
                }
            }
        } else if (mode === "'" || mode === '"') {
            if (char === '\\') {
                i += 1;
            } else if (char === mode) {
                mode = 'normal';
            }
        } else if (mode === 'line_comment') {
            if (char === '\n') {
                mode = 'normal';
            }
        } else if (mode === 'block_comment') {
            if (char === '*' && next === '/') {
                mode = 'normal';
                i += 1;
            }
        } else if (mode === 'template') {
            if (char === '\\') {
                i += 1;
            } else if (char === '`') {
                mode = 'normal';
            } else if (char === '$' && next === '{') {
                mode = 'template_expr';
                templateExprDepth = 1;
                depth += 1;
                i += 1;
            }
        } else if (mode === 'template_expr') {
            if (char === "'" || char === '"') {
                mode = `template_expr_${char}`;
            } else if (char === '`') {
                mode = 'template_expr_template';
            } else if (char === '/' && next === '/') {
                mode = 'template_expr_line_comment';
                i += 1;
            } else if (char === '/' && next === '*') {
                mode = 'template_expr_block_comment';
                i += 1;
            } else if (char === '{') {
                depth += 1;
                templateExprDepth += 1;
            } else if (char === '}') {
                depth -= 1;
                templateExprDepth -= 1;
                if (templateExprDepth === 0) {
                    mode = 'template';
                }
            }
        } else if (mode === "template_expr_'" || mode === 'template_expr_"') {
            const quote = mode.endsWith("'") ? "'" : '"';
            if (char === '\\') {
                i += 1;
            } else if (char === quote) {
                mode = 'template_expr';
            }
        } else if (mode === 'template_expr_template') {
            if (char === '\\') {
                i += 1;
            } else if (char === '`') {
                mode = 'template_expr';
            }
        } else if (mode === 'template_expr_line_comment') {
            if (char === '\n') {
                mode = 'template_expr';
            }
        } else if (mode === 'template_expr_block_comment') {
            if (char === '*' && next === '/') {
                mode = 'template_expr';
                i += 1;
            }
        }

        i += 1;
    }

    throw new Error(`函数提取失败: ${functionName}`);
}

function createListElement(id) {
    return { id, innerHTML: '' };
}

function createSandbox() {
    const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
    const elements = {};
    const warnings = [];

    const sandbox = {
        console: {
            log: () => {},
            warn: (...args) => warnings.push(args.map((item) => String(item)).join(' ')),
            error: () => {}
        },
        encodeURIComponent,
        String,
        Number,
        Array,
        Object,
        Math,
        Promise,
        document: {
            getElementById(id) {
                return elements[id] || null;
            }
        },
        flarumLoadDiscussionList: async () => [],
        getFlarumToken: () => '',
        flarumRequest: async () => {
            throw new Error('不应触发单帖补拉');
        },
        getDiscussionViewCount: () => 0,
        formatFlarumTime: (value) => String(value || '')
    };

    vm.createContext(sandbox);

    [
        'escapeHtml',
        'renderTopicListMessage',
        'renderDiscussionLinksIntoList',
        'renderDynamicHomeLinks'
    ].forEach((functionName) => {
        vm.runInContext(extractFunction(source, functionName), sandbox);
    });

    sandbox.elements = elements;
    sandbox.warnings = warnings;
    return sandbox;
}

async function testPostPageRecentHotListUsesDynamicData() {
    const sandbox = createSandbox();
    sandbox.elements['recent-hot-list'] = createListElement('recent-hot-list');
    sandbox.flarumLoadDiscussionList = async () => ([
        { id: 12, title: '最新主题<测试>', views: 3 },
        { id: 13, title: '第二条主题', views: 2 }
    ]);

    await sandbox.renderDynamicHomeLinks();

    const html = sandbox.elements['recent-hot-list'].innerHTML;
    assert.ok(html.includes('post.html?id=12'));
    assert.ok(html.includes('最新主题&lt;测试&gt;'));
    assert.ok(html.includes('第二条主题'));
}

async function testRecentHotListRendersEmptyState() {
    const sandbox = createSandbox();
    sandbox.elements['recent-hot-list'] = createListElement('recent-hot-list');
    sandbox.flarumLoadDiscussionList = async () => [];

    await sandbox.renderDynamicHomeLinks();

    assert.ok(sandbox.elements['recent-hot-list'].innerHTML.includes('暂无近期帖子'));
}

async function testRecentHotListRendersFailureState() {
    const sandbox = createSandbox();
    sandbox.elements['recent-hot-list'] = createListElement('recent-hot-list');
    sandbox.flarumLoadDiscussionList = async () => {
        throw new Error('network failed');
    };

    await sandbox.renderDynamicHomeLinks();

    assert.ok(sandbox.elements['recent-hot-list'].innerHTML.includes('近期帖子加载失败，请稍后刷新重试'));
    assert.ok(sandbox.warnings.some((line) => line.includes('动态加载首页帖子列表失败')));
}

async function testIndexHotTopicsFollowStandardOrder() {
    const sandbox = createSandbox();
    sandbox.elements['hot-topics-list'] = createListElement('hot-topics-list');
    sandbox.elements['recent-hot-list'] = createListElement('recent-hot-list');
    sandbox.flarumLoadDiscussionList = async () => ([
        { id: 6, title: '关于开展“拒绝黄赌毒、共建平安社区”宣传教育活动的通知', views: 999 },
        { id: 4, title: '求助帖，真实经历，感觉自己被脑控了', views: 888 },
        { id: 21, title: '热门第一', views: 800 },
        { id: 22, title: '热门第二', views: 700 },
        { id: 23, title: '热门第三', views: 600 },
        { id: 24, title: '热门第四', views: 500 },
        { id: 25, title: '热门第五', views: 400 },
        { id: 26, title: '热门第六', views: 300 }
    ]);

    await sandbox.renderDynamicHomeLinks();

    const hotHtml = sandbox.elements['hot-topics-list'].innerHTML;
    assert.ok(hotHtml.includes('violation.html'));
    assert.ok(hotHtml.includes('pin-badge'));
    assert.ok(hotHtml.includes('hot-badge'));
    assert.ok(hotHtml.indexOf('热门第一') < hotHtml.indexOf('热门第二'));
    assert.ok(hotHtml.indexOf('热门第四') < hotHtml.indexOf('求助帖，真实经历，感觉自己被脑控了'));
}

async function main() {
    await testPostPageRecentHotListUsesDynamicData();
    await testRecentHotListRendersEmptyState();
    await testRecentHotListRendersFailureState();
    await testIndexHotTopicsFollowStandardOrder();
    console.log('recent-hot-posts tests passed');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
