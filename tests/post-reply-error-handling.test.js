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

function createConsoleRecorder() {
    const entries = [];
    return {
        entries,
        console: {
            groupCollapsed: (...args) => entries.push(['groupCollapsed', ...args]),
            groupEnd: (...args) => entries.push(['groupEnd', ...args]),
            error: (...args) => entries.push(['error', ...args])
        }
    };
}

function buildSandbox() {
    const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
    const consoleRecorder = createConsoleRecorder();
    const toastCalls = [];
    const alertCalls = [];

    const sandbox = {
        console: consoleRecorder.console,
        JSON,
        Date,
        Math,
        Number,
        String,
        Array,
        Object,
        RegExp,
        TypeError,
        Error,
        parseInt,
        parseFloat,
        isFinite,
        toastCalls,
        alertCalls,
        alert: (message) => {
            alertCalls.push(message);
        },
        showUiToast: (options) => {
            const call = { ...options, closed: false };
            toastCalls.push(call);
            return {
                close() {
                    call.closed = true;
                }
            };
        }
    };

    vm.createContext(sandbox);

    [
        'cloneDebugValue',
        'maskDebugHeaderValue',
        'getLoggableRequestHeaders',
        'getResponseHeadersForDebug',
        'parseApiErrorDetail',
        'getComposerFieldLabel',
        'createComposerValidationError',
        'isComposerValidationError',
        'parseApiErrorList',
        'getApiValidationIssues',
        'getComposerValidationIssues',
        'formatComposerValidationSummary',
        'classifyComposerSubmissionError',
        'getFriendlyErrorMessage',
        'buildComposerUserErrorMessage',
        'buildComposerErrorDebugInfo',
        'logComposerSubmissionError',
        'presentComposerSubmissionError'
    ].forEach((functionName) => {
        vm.runInContext(extractFunction(source, functionName), sandbox);
    });

    sandbox.consoleEntries = consoleRecorder.entries;
    return sandbox;
}

function createServerError() {
    const detail = JSON.stringify({
        errors: [
            {
                status: '422',
                code: 'validation_error',
                title: '验证失败',
                detail: '标题不能为空',
                source: {
                    pointer: '/data/attributes/title'
                }
            }
        ]
    });

    const error = new Error('Flarum API 请求失败: 422 Unprocessable Content');
    error.httpStatus = 422;
    error.detail = detail;
    error.apiError = null;
    error.request = {
        requestTime: '2026-05-17T10:00:00.000Z',
        url: 'https://forum.example.test/api/discussions',
        method: 'POST',
        headers: {
            Accept: 'application/vnd.api+json',
            Authorization: '***masked***'
        },
        params: {
            data: {
                type: 'discussions',
                attributes: {
                    title: '',
                    content: '测试正文'
                }
            }
        }
    };
    error.response = {
        status: 422,
        statusText: 'Unprocessable Content',
        headers: {
            'content-type': 'application/vnd.api+json'
        },
        detail
    };
    return error;
}

function createNetworkError() {
    const error = new Error('Failed to fetch');
    error.isNetworkError = true;
    error.code = 'ECONNRESET';
    error.request = {
        requestTime: '2026-05-17T09:59:00.000Z',
        url: 'https://forum.example.test/api/posts',
        method: 'POST',
        headers: {
            Accept: 'application/vnd.api+json',
            Authorization: '***masked***'
        },
        params: {
            data: {
                type: 'posts',
                attributes: {
                    content: '回复内容'
                }
            }
        }
    };
    return error;
}

function runTests() {
    const sandbox = buildSandbox();
    const {
        getLoggableRequestHeaders,
        createComposerValidationError,
        classifyComposerSubmissionError,
        buildComposerUserErrorMessage,
        logComposerSubmissionError,
        presentComposerSubmissionError,
        parseApiErrorDetail
    } = sandbox;

    const maskedHeaders = getLoggableRequestHeaders({
        Accept: 'application/json',
        Authorization: 'Token abc123'
    });
    assert.strictEqual(maskedHeaders.Accept, 'application/json');
    assert.strictEqual(maskedHeaders.Authorization, '***masked***');

    const networkError = createNetworkError();
    assert.strictEqual(classifyComposerSubmissionError(networkError), 'network');
    assert.ok(buildComposerUserErrorMessage(networkError, 'create_post').includes('当前网络连接不稳定，请检查网络后重试'));

    logComposerSubmissionError(networkError, 'create_post', { operationLabel: '回帖' });
    const networkLogs = sandbox.consoleEntries.map((entry) => entry.join(' ')).join('\n');
    assert.ok(networkLogs.includes('网络错误码:'));
    assert.ok(networkLogs.includes('请求时间:'));
    assert.ok(networkLogs.includes('请求参数:'));

    const serverError = createServerError();
    serverError.apiError = parseApiErrorDetail(serverError.detail);
    assert.strictEqual(classifyComposerSubmissionError(serverError), 'server');
    const serverUserMessage = buildComposerUserErrorMessage(serverError, 'create_discussion');
    assert.ok(serverUserMessage.includes('标题：标题不能为空'));

    logComposerSubmissionError(serverError, 'create_discussion', { operationLabel: '发帖' });
    const serverLogs = sandbox.consoleEntries.map((entry) => entry.join(' ')).join('\n');
    assert.ok(serverLogs.includes('服务器返回详情:'));
    assert.ok(serverLogs.includes('响应状态码:'));
    assert.ok(serverLogs.includes('请求 URL:'));

    const validationError = createComposerValidationError('请输入内容', [
        { field: 'content', reason: '回复内容不能为空', value: '' }
    ]);
    assert.strictEqual(classifyComposerSubmissionError(validationError), 'validation');
    assert.ok(buildComposerUserErrorMessage(validationError, 'create_post').includes('内容：回复内容不能为空'));

    logComposerSubmissionError(validationError, 'create_post', {
        operationLabel: '回帖',
        requestParams: {
            discussionId: '1001',
            contentLength: 0
        }
    });
    const validationLogs = sandbox.consoleEntries.map((entry) => entry.join(' ')).join('\n');
    assert.ok(validationLogs.includes('参数校验失败字段:'));
    assert.ok(validationLogs.includes('校验失败原因:'));

    let retried = false;
    presentComposerSubmissionError(networkError, {
        context: 'create_post',
        operationLabel: '回帖',
        onRetry: () => {
            retried = true;
        }
    });
    assert.strictEqual(sandbox.toastCalls.length > 0, true);
    const retryToast = sandbox.toastCalls[sandbox.toastCalls.length - 1];
    assert.strictEqual(retryToast.actionText, '重试');
    assert.ok(retryToast.message.includes('可点击“重试”再次提交'));
    retryToast.onAction();
    assert.strictEqual(retried, true);
    assert.strictEqual(retryToast.closed, true);

    presentComposerSubmissionError(validationError, {
        context: 'create_post',
        operationLabel: '回帖'
    });
    const validationToast = sandbox.toastCalls[sandbox.toastCalls.length - 1];
    assert.strictEqual(validationToast.actionText, '');

    console.log('post-reply-error-handling tests passed');
}

try {
    runTests();
} catch (error) {
    console.error(error);
    process.exit(1);
}
