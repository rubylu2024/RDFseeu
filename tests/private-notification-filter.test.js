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
    const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const sandbox = {
        console,
        String
    };

    vm.createContext(sandbox);
    ['isByobuPrivateDiscussionNotificationType', 'mapFlarumNotificationKind'].forEach((functionName) => {
        vm.runInContext(extractFunction(source, functionName), sandbox);
    });
    return sandbox;
}

(() => {
    const sandbox = loadSandbox();
    assert.strictEqual(sandbox.isByobuPrivateDiscussionNotificationType('byobuPrivateDiscussionCreated'), true);
    assert.strictEqual(sandbox.isByobuPrivateDiscussionNotificationType('byobuPrivateDiscussionReplied'), true);
    assert.strictEqual(sandbox.isByobuPrivateDiscussionNotificationType('byobuPrivateDiscussionAdded'), true);
    assert.strictEqual(sandbox.isByobuPrivateDiscussionNotificationType('byobuRecipientRemoved'), true);
    assert.strictEqual(sandbox.isByobuPrivateDiscussionNotificationType('newPostInDiscussion'), false);
    assert.strictEqual(sandbox.isByobuPrivateDiscussionNotificationType('userMentioned'), false);
})();

(() => {
    const sandbox = loadSandbox();
    const notificationTypes = [
        'byobuPrivateDiscussionCreated',
        'byobuPrivateDiscussionReplied',
        'byobuPrivateDiscussionAdded',
        'newPostInDiscussion',
        'userMentioned'
    ];
    const visibleTypes = notificationTypes.filter((item) => !sandbox.isByobuPrivateDiscussionNotificationType(item));
    assert.deepStrictEqual(visibleTypes, ['newPostInDiscussion', 'userMentioned']);
})();

(() => {
    const sandbox = loadSandbox();
    assert.strictEqual(sandbox.mapFlarumNotificationKind('newPostInDiscussion', null), 'reply');
    assert.strictEqual(sandbox.mapFlarumNotificationKind('userMentioned', null), 'mention');
})();

console.log('private-notification-filter.test.js passed');
