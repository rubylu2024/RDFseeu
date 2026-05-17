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

function loadSandbox() {
    const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
    const sandbox = {
        console,
        Set,
        String,
        Number,
        Array
    };

    vm.createContext(sandbox);
    [
        'isPrivateDiscussionResource',
        'filterPublicDiscussions',
        'buildPublicDiscussionFilterQuery',
        'isPrivateDiscussionRelevantToActor',
        'filterPrivateDiscussionsForActor',
        'isAdminUserResource'
    ].forEach((functionName) => {
        vm.runInContext(extractFunction(source, functionName), sandbox);
    });

    return sandbox;
}

function createDiscussion({ id, starterId, recipientUserIds = [], recipientGroupIds = [], isPrivate = true }) {
    return {
        id: String(id),
        type: 'discussions',
        attributes: {
            title: `主题${id}`,
            isPrivateDiscussion: !!isPrivate
        },
        relationships: {
            user: {
                data: starterId ? { type: 'users', id: String(starterId) } : null
            },
            recipientUsers: {
                data: recipientUserIds.map((recipientId) => ({ type: 'users', id: String(recipientId) }))
            },
            recipientGroups: {
                data: recipientGroupIds.map((recipientId) => ({ type: 'groups', id: String(recipientId) }))
            }
        }
    };
}

(() => {
    const sandbox = loadSandbox();
    const actor = { userId: '1', groupIds: ['1'] };

    const startedByActor = createDiscussion({ id: 11, starterId: 1, recipientUserIds: ['2'] });
    const sentToActor = createDiscussion({ id: 12, starterId: 2, recipientUserIds: ['1'] });
    const sentToAdminGroup = createDiscussion({ id: 13, starterId: 2, recipientGroupIds: ['1'] });
    const unrelatedPrivate = createDiscussion({ id: 14, starterId: 3, recipientUserIds: ['4'] });
    const privateWithoutFlag = {
        id: '15',
        type: 'discussions',
        attributes: { title: '无私密标记' },
        relationships: {
            user: { data: { type: 'users', id: '1' } },
            recipientUsers: { data: [] },
            recipientGroups: { data: [] }
        }
    };
    const publicDiscussion = createDiscussion({ id: 16, starterId: 3, isPrivate: false });

    assert.strictEqual(sandbox.isPrivateDiscussionRelevantToActor(startedByActor, actor), true);
    assert.strictEqual(sandbox.isPrivateDiscussionRelevantToActor(sentToActor, actor), true);
    assert.strictEqual(sandbox.isPrivateDiscussionRelevantToActor(sentToAdminGroup, actor), true);
    assert.strictEqual(sandbox.isPrivateDiscussionRelevantToActor(privateWithoutFlag, actor), true);
    assert.strictEqual(sandbox.isPrivateDiscussionRelevantToActor(unrelatedPrivate, actor), false);
    assert.strictEqual(sandbox.isPrivateDiscussionRelevantToActor(publicDiscussion, actor), false);
})();

(() => {
    const sandbox = loadSandbox();
    const actor = { userId: '1', groupIds: ['1'] };

    const filteredPrivate = sandbox.filterPrivateDiscussionsForActor([
        createDiscussion({ id: 21, starterId: 1, recipientUserIds: ['2'] }),
        createDiscussion({ id: 22, starterId: 2, recipientUserIds: ['1'] }),
        createDiscussion({ id: 23, starterId: 3, recipientUserIds: ['4'] }),
        createDiscussion({ id: 24, starterId: 3, isPrivate: false }),
        {
            id: '25',
            type: 'discussions',
            attributes: { title: '后端已判私密' },
            relationships: {
                user: { data: { type: 'users', id: '2' } },
                recipientUsers: { data: [{ type: 'users', id: '1' }] },
                recipientGroups: { data: [] }
            }
        }
    ], actor);

    assert.deepStrictEqual(filteredPrivate.map((item) => item.id), ['21', '22', '25']);
})();

(() => {
    const sandbox = loadSandbox();
    const publicList = sandbox.filterPublicDiscussions([
        createDiscussion({ id: 31, starterId: 1, isPrivate: false }),
        createDiscussion({ id: 32, starterId: 1, recipientUserIds: ['2'] }),
        {
            id: '33',
            type: 'discussions',
            attributes: { title: '群组私密', recipientCount: 1 },
            relationships: {}
        }
    ]);

    assert.deepStrictEqual(publicList.map((item) => item.id), ['31']);
    assert.strictEqual(sandbox.buildPublicDiscussionFilterQuery(), '-is:private');
    assert.strictEqual(sandbox.buildPublicDiscussionFilterQuery('author:admin'), 'author:admin -is:private');
})();

(() => {
    const sandbox = loadSandbox();
    assert.strictEqual(sandbox.isAdminUserResource({
        relationships: { groups: { data: [{ id: '1' }, { id: '2' }] } }
    }), true);
    assert.strictEqual(sandbox.isAdminUserResource({
        relationships: { groups: { data: [{ id: '2' }] } }
    }), false);
})();

console.log('private-message-access.test.js passed');
