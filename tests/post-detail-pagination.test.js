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

function loadFunctions(sandbox, functionNames) {
    const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
    vm.createContext(sandbox);
    functionNames.forEach((functionName) => {
        vm.runInContext(extractFunction(source, functionName), sandbox);
    });
}

function createPosts(startFloor, count) {
    return Array.from({ length: count }, (_, index) => {
        const floor = startFloor + index;
        return {
            id: String(floor),
            type: 'posts',
            attributes: {
                number: floor
            }
        };
    });
}

async function testLoadDiscussionPostsPagination() {
    const requestPaths = [];
    const sandbox = {
        POST_PAGE_SIZE: 20,
        DISCUSSION_POST_BATCH_SIZE: 100,
        encodeURIComponent,
        Array,
        Math,
        Number,
        String,
        Object,
        Set,
        URL,
        flarumRequest: async (requestPath) => {
            requestPaths.push(requestPath);
            const offsetMatch = /page\[offset\]=(\d+)/.exec(requestPath);
            const offset = offsetMatch ? Number(offsetMatch[1]) : 0;

            if (offset === 0) {
                return {
                    data: createPosts(1, 100),
                    included: [
                        { type: 'users', id: 'u1' },
                        { type: 'users', id: 'u2' }
                    ]
                };
            }

            if (offset === 100) {
                return {
                    data: createPosts(101, 35),
                    included: [
                        { type: 'users', id: 'u2' },
                        { type: 'users', id: 'u3' }
                    ]
                };
            }

            return { data: [], included: [] };
        }
    };

    loadFunctions(sandbox, ['mergeUniqueResources', 'parseOffsetFromPageLink', 'flarumLoadDiscussionPosts']);
    const result = await sandbox.flarumLoadDiscussionPosts('42', { expectedCount: 135, auth: false });

    assert.strictEqual(requestPaths.length, 2);
    assert.ok(requestPaths[0].includes('page[limit]=100'));
    assert.ok(requestPaths[0].includes('page[offset]=0'));
    assert.ok(requestPaths[1].includes('page[offset]=100'));
    assert.strictEqual(result.posts.length, 135);
    assert.strictEqual(result.posts[0].id, '1');
    assert.strictEqual(result.posts[result.posts.length - 1].id, '135');
    assert.deepStrictEqual(
        result.included.map((item) => `${item.type}:${item.id}`),
        ['users:u1', 'users:u2', 'users:u3']
    );
}

async function testLoadDiscussionPostsServerPageCap() {
    const requestPaths = [];
    const sandbox = {
        POST_PAGE_SIZE: 20,
        DISCUSSION_POST_BATCH_SIZE: 100,
        encodeURIComponent,
        Array,
        Math,
        Number,
        String,
        Object,
        Set,
        URL,
        flarumRequest: async (requestPath) => {
            requestPaths.push(requestPath);
            const offsetMatch = /page\[offset\]=(\d+)/.exec(requestPath);
            const offset = offsetMatch ? Number(offsetMatch[1]) : 0;

            if (offset === 0) {
                return {
                    data: createPosts(1, 50),
                    included: [{ type: 'users', id: 'u1' }],
                    links: {
                        next: 'https://forum.test/api/posts?page[offset]=50'
                    }
                };
            }

            if (offset === 50) {
                return {
                    data: createPosts(51, 50),
                    included: [{ type: 'users', id: 'u2' }],
                    links: {
                        next: 'https://forum.test/api/posts?page[offset]=100'
                    }
                };
            }

            if (offset === 100) {
                return {
                    data: createPosts(101, 35),
                    included: [{ type: 'users', id: 'u3' }],
                    links: {}
                };
            }

            return { data: [], included: [], links: {} };
        }
    };

    loadFunctions(sandbox, ['mergeUniqueResources', 'parseOffsetFromPageLink', 'flarumLoadDiscussionPosts']);
    const result = await sandbox.flarumLoadDiscussionPosts('42', { expectedCount: 135, auth: false });

    assert.strictEqual(requestPaths.length, 3);
    assert.ok(requestPaths[0].includes('page[limit]=100'));
    assert.ok(requestPaths[1].includes('page[offset]=50'));
    assert.ok(requestPaths[2].includes('page[offset]=100'));
    assert.strictEqual(result.posts.length, 135);
    assert.strictEqual(result.posts[0].id, '1');
    assert.strictEqual(result.posts[result.posts.length - 1].id, '135');
}

async function testLoadDiscussionPostsWithoutExpectedCountFollowsNextLink() {
    const requestPaths = [];
    const sandbox = {
        POST_PAGE_SIZE: 20,
        DISCUSSION_POST_BATCH_SIZE: 100,
        encodeURIComponent,
        Array,
        Math,
        Number,
        String,
        Object,
        Set,
        URL,
        flarumRequest: async (requestPath) => {
            requestPaths.push(requestPath);
            const offsetMatch = /page\[offset\]=(\d+)/.exec(requestPath);
            const offset = offsetMatch ? Number(offsetMatch[1]) : 0;

            if (offset === 0) {
                return {
                    data: createPosts(1, 50),
                    included: [],
                    links: {
                        next: 'https://forum.test/api/posts?page[offset]=50'
                    }
                };
            }

            if (offset === 50) {
                return {
                    data: createPosts(51, 50),
                    included: [],
                    links: {
                        next: 'https://forum.test/api/posts?page[offset]=100'
                    }
                };
            }

            if (offset === 100) {
                return {
                    data: createPosts(101, 20),
                    included: [],
                    links: {}
                };
            }

            return { data: [], included: [], links: {} };
        }
    };

    loadFunctions(sandbox, ['mergeUniqueResources', 'parseOffsetFromPageLink', 'flarumLoadDiscussionPosts']);
    const result = await sandbox.flarumLoadDiscussionPosts('99', { auth: false });

    assert.strictEqual(requestPaths.length, 3);
    assert.ok(requestPaths[1].includes('page[offset]=50'));
    assert.ok(requestPaths[2].includes('page[offset]=100'));
    assert.strictEqual(result.posts.length, 120);
    assert.strictEqual(result.posts[result.posts.length - 1].id, '120');
}

function testReplyTargetPagination() {
    const sandbox = {
        POST_PAGE_SIZE: 20,
        Array,
        Math,
        Number,
        String,
        Object,
        isOriginalPosterReply: () => false
    };

    loadFunctions(sandbox, ['buildDiscussionPostList', 'resolveDiscussionPageTarget']);

    const postData = {
        userId: 1,
        author: '楼主',
        authorLevel: 'Lv.1',
        authorAvatar: 'avatar.png',
        publishTime: '2026-05-17 12:00:00',
        content: '<p>首帖</p>',
        comments: Array.from({ length: 45 }, (_, index) => ({
            id: index + 2,
            floor: index + 2,
            content: `<p>回复 ${index + 2}</p>`
        }))
    };

    const allPosts = sandbox.buildDiscussionPostList(postData);
    const foundTarget = sandbox.resolveDiscussionPageTarget(allPosts, '46');
    const missingTarget = sandbox.resolveDiscussionPageTarget(allPosts, '9999');

    assert.strictEqual(allPosts.length, 46);
    assert.strictEqual(foundTarget.page, 3);
    assert.strictEqual(foundTarget.floor, 46);
    assert.strictEqual(missingTarget.page, 3);
    assert.strictEqual(missingTarget.floor, 46);
}

function testSyncDiscussionLocation() {
    const historyCalls = [];
    const sandbox = {
        URL,
        Number,
        String,
        window: {
            location: {
                href: 'https://example.test/post.html?id=9&page=3'
            },
            history: {
                replaceState: (_state, _title, url) => {
                    historyCalls.push(url);
                }
            }
        }
    };

    loadFunctions(sandbox, ['syncDiscussionLocation']);

    sandbox.syncDiscussionLocation('9', 1, 46);
    sandbox.syncDiscussionLocation('9', 3, 46);

    assert.strictEqual(historyCalls[0], '/post.html?id=9#post-46');
    assert.strictEqual(historyCalls[1], '/post.html?id=9&page=3#post-46');
}

async function runTests() {
    await testLoadDiscussionPostsPagination();
    await testLoadDiscussionPostsServerPageCap();
    await testLoadDiscussionPostsWithoutExpectedCountFollowsNextLink();
    testReplyTargetPagination();
    testSyncDiscussionLocation();
    console.log('post-detail-pagination tests passed');
}

runTests().catch((error) => {
    console.error(error);
    process.exit(1);
});
