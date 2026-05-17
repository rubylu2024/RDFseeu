// 页面加载完成后执行
// 页面加载完成后执行已经包含在下方的 window.addEventListener('DOMContentLoaded', ...)

const FLARUM_BASE_URL = '';
const AD_TARGET_URL = 'https://www.dihai.wiki/';
const POST_PAGE_SIZE = 20;
const DISCUSSION_POST_BATCH_SIZE = 100;
const MAX_UPLOAD_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_UPLOAD_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const ALLOWED_UPLOAD_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const replyComposerDraft = {
    content: '',
    replyTarget: '',
    title: '发表回复',
    showCancel: false,
    selectionStart: 0,
    selectionEnd: 0
};
const CUSTOM_EMOJIS = Array.from({ length: 126 }, (_, i) => ({
    label: `表情${i + 1}`,
    file: `Forum${i + 1}.png`
}));

function getCustomEmojiToken(file) {
    const match = /^Forum(\d+)\.png$/i.exec(String(file || ''));
    if (!match) return '';
    const index = Number(match[1]);
    if (!Number.isInteger(index) || index < 1 || index > CUSTOM_EMOJIS.length) return '';
    return `[表情${index}]`;
}

function getCustomEmojiUrl(file) {
    return `https://www.reddragonfly.cyou/emojis/${encodeURIComponent(file)}`;
}

function expandCustomEmojiTokens(source) {
    return String(source || '').replace(/\[表情\s*(\d{1,3})\]/g, function(match, rawIndex) {
        const index = Number(rawIndex);
        if (!Number.isInteger(index) || index < 1 || index > CUSTOM_EMOJIS.length) {
            return match;
        }
        return `[img]${getCustomEmojiUrl(`Forum${index}.png`)}[/img]`;
    });
}

function buildCustomEmojiPickerHtml() {
    return `
        <div class="custom-emoji-picker" style="display:none;">
            <div class="custom-emoji-grid">
                ${CUSTOM_EMOJIS.map((item) => `
                    <button type="button" class="custom-emoji-item" data-file="${item.file}" title="${item.label}">
                        <img src="${getCustomEmojiUrl(item.file)}" alt="${item.label}">
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function bindCustomEmojiPicker(root, textarea) {
    if (!root || !textarea) return;

    const toggleBtn = root.querySelector('[data-action="custom-emoji"]');
    const picker = root.querySelector('.custom-emoji-picker');

    if (!toggleBtn || !picker) return;
    if (picker.dataset.boundCustomEmoji === '1') return;
    picker.dataset.boundCustomEmoji = '1';

    toggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        picker.style.display = picker.style.display === 'block' ? 'none' : 'block';
    });

    picker.addEventListener('click', function(e) {
        const item = e.target.closest('.custom-emoji-item');
        if (!item) return;

        const file = item.getAttribute('data-file');
        if (!file) return;

        insertAtCursor(textarea, getCustomEmojiToken(file) || '');
        picker.style.display = 'none';
    });
}

function renderComposerPreview(source) {
    const normalized = String(source || '').replace(/\r\n/g, '\n');
    const blocks = normalized.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

    if (blocks.length === 0) {
        return '';
    }

    return blocks.map((block) => renderPreviewBlock(block)).join('');
}

function renderPreviewBlock(block) {
    const lines = block.split('\n');
    const isQuote = lines.every((line) => line.trim().startsWith('>'));

    if (isQuote) {
        const quoteText = lines
            .map((line) => escapePreviewHtml(line.replace(/^\s*>\s?/, '')))
            .join('<br>');
        return `<blockquote>${applyInlineFormatting(quoteText)}</blockquote>`;
    }

    const paragraphHtml = lines
        .map((line) => escapePreviewHtml(line))
        .join('<br>');
    return `<p>${applyInlineFormatting(paragraphHtml)}</p>`;
}

function applyInlineFormatting(html) {
    return html
        .replace(/\[img\](https?:\/\/[^\s\[]+)\[\/img\]/gi, '<img src="$1" alt="表情">')
        .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1">')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<u>$1</u>')
        .replace(/~~([^~]+)~~/g, '<del>$1</del>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
}

function escapePreviewHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function createDebouncedPreviewUpdater(updateFn, delay = 300) {
    let timer = null;
    return function debouncedPreviewUpdate() {
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
            timer = null;
            updateFn();
        }, delay);
    };
}

function updateComposerPreviewBox(source, previewBox, previewContent, transformSource) {
    if (!previewBox || !previewContent) return;
    const rawText = String(source || '').trim();

    if (!rawText) {
        previewContent.innerHTML = '';
        previewBox.style.display = 'none';
        return;
    }

    const previewSource = typeof transformSource === 'function'
        ? transformSource(rawText)
        : rawText;
    previewContent.innerHTML = renderComposerPreview(previewSource);
    previewBox.style.display = 'block';
}

function stripComposerReplyPrefix(source) {
    return String(source || '').replace(/^回复\s+(?:(?:.*?\()?\d+楼\)?|.+?\(\d+楼\))：\s*/u, '');
}

function getUploadImageAcceptValue() {
    return '.jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp';
}

function getUploadImageMaxSizeBytes() {
    return MAX_UPLOAD_IMAGE_BYTES;
}

function getUploadImageMaxSizeLabel() {
    return '2MB';
}

function getUploadCompressionSuggestion() {
    return '建议先用 TinyPNG、Squoosh 等工具压缩后再上传。';
}

function isAllowedUploadImage(file) {
    if (!file) return false;
    const type = String(file.type || '').toLowerCase();
    if (ALLOWED_UPLOAD_IMAGE_MIME_TYPES.has(type)) return true;
    const name = String(file.name || '');
    const match = /\.([^.]+)$/.exec(name);
    const ext = match ? String(match[1] || '').toLowerCase() : '';
    return ALLOWED_UPLOAD_IMAGE_EXTENSIONS.has(ext);
}

function getUploadImageFormatHint() {
    return `仅支持 JPEG、PNG、GIF、WEBP 图片，且单张大小不能超过 ${getUploadImageMaxSizeLabel()}。${getUploadCompressionSuggestion()}`;
}

function getUploadImageSizeHint(label = '图片') {
    return `${label}大小不能超过 ${getUploadImageMaxSizeLabel()}。${getUploadCompressionSuggestion()}`;
}

function getUploadedContentForEditor(json, fileName) {
    const firstData = Array.isArray(json?.data) ? json.data[0] : null;
    const primaryAttrs = json?.data?.attributes || null;
    const firstAttrs = firstData?.attributes || null;
    const bbcode = primaryAttrs?.bbcode || firstAttrs?.bbcode || '';
    if (typeof bbcode === 'string' && bbcode.trim()) {
        return bbcode.trim();
    }

    const markdown = primaryAttrs?.markdown || firstAttrs?.markdown || '';
    if (typeof markdown === 'string' && markdown.trim()) {
        return markdown.trim();
    }

    const url = primaryAttrs?.url || firstAttrs?.url || '';
    if (typeof url === 'string' && url.trim()) {
        return `![${fileName}](${url.trim()})`;
    }

    return '';
}

function setUploadStatus(statusEl, message, kind) {
    if (!statusEl) return;
    const text = String(message || '').trim();
    const nextKind = kind || 'info';
    statusEl.textContent = text;
    statusEl.className = text ? `upload-status upload-status-${nextKind}` : 'upload-status';
    statusEl.style.display = text ? 'block' : 'none';
}

function syncReplyComposerDraft() {
    const replyTargetInput = document.getElementById('reply-target');
    const replyContent = document.getElementById('reply-content');
    const replyBoxTitle = document.querySelector('.reply-box h4');
    const cancelReply = document.getElementById('cancel-reply');
    if (replyTargetInput) replyComposerDraft.replyTarget = replyTargetInput.value || '';
    if (replyContent) {
        replyComposerDraft.content = replyContent.value || '';
        replyComposerDraft.selectionStart = Number.isFinite(replyContent.selectionStart) ? replyContent.selectionStart : replyComposerDraft.content.length;
        replyComposerDraft.selectionEnd = Number.isFinite(replyContent.selectionEnd) ? replyContent.selectionEnd : replyComposerDraft.selectionStart;
    }
    if (replyBoxTitle) replyComposerDraft.title = replyBoxTitle.textContent || '发表回复';
    replyComposerDraft.showCancel = !!(cancelReply && cancelReply.style.display !== 'none');
}

function restoreReplyComposerDraft() {
    const replyTargetInput = document.getElementById('reply-target');
    const replyContent = document.getElementById('reply-content');
    const replyBoxTitle = document.querySelector('.reply-box h4');
    const cancelReply = document.getElementById('cancel-reply');
    if (replyTargetInput) replyTargetInput.value = replyComposerDraft.replyTarget || '';
    if (replyContent) {
        replyContent.value = replyComposerDraft.content || '';
        replyContent.dataset.savedSelectionStart = String(Number.isFinite(replyComposerDraft.selectionStart) ? replyComposerDraft.selectionStart : 0);
        replyContent.dataset.savedSelectionEnd = String(Number.isFinite(replyComposerDraft.selectionEnd) ? replyComposerDraft.selectionEnd : 0);
    }
    if (replyBoxTitle) replyBoxTitle.textContent = replyComposerDraft.title || '发表回复';
    if (cancelReply) cancelReply.style.display = replyComposerDraft.showCancel ? 'inline' : 'none';
}

function clearReplyComposerDraft() {
    replyComposerDraft.content = '';
    replyComposerDraft.replyTarget = '';
    replyComposerDraft.title = '发表回复';
    replyComposerDraft.showCancel = false;
    replyComposerDraft.selectionStart = 0;
    replyComposerDraft.selectionEnd = 0;
}

function rememberTextareaSelection(textarea) {
    if (!textarea) return;
    const selectionStart = Number.isFinite(textarea.selectionStart) ? textarea.selectionStart : 0;
    const selectionEnd = Number.isFinite(textarea.selectionEnd) ? textarea.selectionEnd : selectionStart;
    textarea.dataset.savedSelectionStart = String(selectionStart);
    textarea.dataset.savedSelectionEnd = String(selectionEnd);
    if (textarea.id === 'reply-content') {
        replyComposerDraft.content = textarea.value || '';
        replyComposerDraft.selectionStart = selectionStart;
        replyComposerDraft.selectionEnd = selectionEnd;
    }
}

function restoreTextareaSelection(textarea) {
    if (!textarea) return;
    const rawStart = textarea.dataset.savedSelectionStart != null && textarea.dataset.savedSelectionStart !== ''
        ? Number(textarea.dataset.savedSelectionStart)
        : (textarea.id === 'reply-content' ? Number(replyComposerDraft.selectionStart) : Number.NaN);
    const rawEnd = textarea.dataset.savedSelectionEnd != null && textarea.dataset.savedSelectionEnd !== ''
        ? Number(textarea.dataset.savedSelectionEnd)
        : (textarea.id === 'reply-content' ? Number(replyComposerDraft.selectionEnd) : Number.NaN);
    const textLength = String(textarea.value || '').length;
    const start = Number.isFinite(rawStart) ? Math.min(Math.max(rawStart, 0), textLength) : textLength;
    const end = Number.isFinite(rawEnd) ? Math.min(Math.max(rawEnd, start), textLength) : start;
    textarea.focus();
    textarea.selectionStart = start;
    textarea.selectionEnd = end;
}

function openInNewTab(url) {
    const target = String(url || '').trim();
    if (!target) return false;
    try {
        const opened = window.open(target, '_blank', 'noopener');
        if (opened) {
            try { opened.opener = null; } catch (_) {}
            return true;
        }
    } catch (_) {}
    try {
        const a = document.createElement('a');
        a.href = target;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
        return true;
    } catch (_) {
        return false;
    }
}

function isFlarumConfigured() {
    return true;
}

function getFlarumApiBase() {
    return '/api';
}

function getFlarumToken() {
    return localStorage.getItem('flarumToken');
}

const AUTH_RETURN_STORAGE_KEY = 'auth:returnTo';

function isAuthPagePathname(pathname) {
    const p = String(pathname || '').toLowerCase();
    return p.endsWith('/login.html') || p.endsWith('/register.html');
}

function getSafeSameOriginUrl(rawUrl) {
    if (!rawUrl) return null;
    try {
        const url = new URL(String(rawUrl), window.location.href);
        if (url.origin !== window.location.origin) return null;
        const pathname = String(url.pathname || '').toLowerCase();
        if (pathname.endsWith('/login.html') || pathname.endsWith('/register.html')) return null;
        return url.href;
    } catch {
        return null;
    }
}

function storeAuthReturnUrlIfNeeded(rawUrl) {
    const safeUrl = getSafeSameOriginUrl(rawUrl);
    if (!safeUrl) return;

    const existing = sessionStorage.getItem(AUTH_RETURN_STORAGE_KEY);
    const existingSafe = existing ? getSafeSameOriginUrl(existing) : null;
    if (existingSafe) return;

    sessionStorage.setItem(AUTH_RETURN_STORAGE_KEY, safeUrl);
}

function consumeAuthReturnUrl() {
    const value = sessionStorage.getItem(AUTH_RETURN_STORAGE_KEY);
    if (value) sessionStorage.removeItem(AUTH_RETURN_STORAGE_KEY);
    return value ? getSafeSameOriginUrl(value) : null;
}

function getAuthRedirectParamUrl() {
    try {
        const params = new URLSearchParams(window.location.search);
        const redirectParam = params.get('redirect');
        return redirectParam ? getSafeSameOriginUrl(redirectParam) : null;
    } catch {
        return null;
    }
}

function resolveAuthReturnUrl() {
    const stored = consumeAuthReturnUrl();
    const fromParam = getAuthRedirectParamUrl();
    return fromParam || stored || getSafeSameOriginUrl(document.referrer) || 'index.html';
}

function ensureToastOverlay() {
    let overlay = document.getElementById('ui-toast-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'ui-toast-overlay';
    overlay.className = 'ui-toast-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);
    return overlay;
}

function showUiToast(options) {
    const message = typeof options?.message === 'string' ? options.message : '';
    const type = typeof options?.type === 'string' ? options.type : '';
    const actionText = typeof options?.actionText === 'string' ? options.actionText : '';
    const onAction = typeof options?.onAction === 'function' ? options.onAction : null;
    const autoCloseMs = typeof options?.autoCloseMs === 'number' && isFinite(options.autoCloseMs) && options.autoCloseMs > 0 ? Math.floor(options.autoCloseMs) : 0;
    const messageFormatter = typeof options?.messageFormatter === 'function' ? options.messageFormatter : null;
    const actionTextFormatter = typeof options?.actionTextFormatter === 'function' ? options.actionTextFormatter : null;
    const shouldRenderAction = !!(actionText || actionTextFormatter);

    const overlay = ensureToastOverlay();
    overlay.innerHTML = `
        <div class="ui-toast-card ${escapeHtml(type)}" role="dialog" aria-modal="true">
            <div class="ui-toast-head">
                <div class="ui-toast-title">${type === 'error' ? '提示' : '提示'}</div>
                <button type="button" class="ui-toast-close" aria-label="关闭">×</button>
            </div>
            <div class="ui-toast-body">${escapeHtml(message).replace(/\n/g, '<br>')}</div>
            ${shouldRenderAction ? `<div class="ui-toast-actions"><button type="button" class="ui-toast-action">${escapeHtml(actionText)}</button></div>` : ''}
        </div>
    `;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');

    const bodyEl = overlay.querySelector('.ui-toast-body');
    const closeBtn = overlay.querySelector('.ui-toast-close');
    const actionBtn = overlay.querySelector('.ui-toast-action');
    const countdownEndAt = autoCloseMs > 0 ? Date.now() + autoCloseMs : 0;

    let closed = false;
    let autoCloseTimer = null;
    let countdownTimer = null;
    const renderCountdown = () => {
        if (closed || autoCloseMs <= 0) return;
        const secondsLeft = Math.max(0, Math.ceil((countdownEndAt - Date.now()) / 1000));
        if (bodyEl && messageFormatter) {
            bodyEl.innerHTML = escapeHtml(messageFormatter(secondsLeft)).replace(/\n/g, '<br>');
        }
        if (actionBtn && actionTextFormatter) {
            actionBtn.textContent = actionTextFormatter(secondsLeft);
        }
    };
    const close = () => {
        if (closed) return;
        closed = true;
        if (autoCloseTimer) window.clearTimeout(autoCloseTimer);
        if (countdownTimer) window.clearInterval(countdownTimer);
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = '';
    };

    if (closeBtn) closeBtn.onclick = close;
    if (actionBtn) {
        actionBtn.onclick = () => {
            if (onAction) onAction();
        };
    }

    if (autoCloseMs > 0) {
        renderCountdown();
        if (messageFormatter || actionTextFormatter) {
            countdownTimer = window.setInterval(renderCountdown, 250);
        }
        autoCloseTimer = window.setTimeout(close, autoCloseMs);
    }

    return { close };
}

function getBeijingNowParts() {
    const dtf = new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        hour12: false,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const parts = dtf.formatToParts(new Date());
    const get = (type) => {
        const p = parts.find((x) => x.type === type);
        return p ? p.value : '';
    };
    const year = Number(get('year'));
    const month = Number(get('month'));
    const day = Number(get('day'));
    const hour = Number(get('hour'));
    const minute = get('minute');
    const second = get('second');
    return { year, month, day, hour, minute, second };
}

function getTimeGreetingByHour(hour) {
    const h = Number(hour);
    if (!Number.isFinite(h)) return '晚上好';
    if (h >= 6 && h <= 10) return '早上好';
    if (h >= 11 && h <= 13) return '中午好';
    if (h >= 14 && h <= 18) return '下午好';
    return '晚上好';
}

function setupStatusBarClock() {
    const containers = Array.from(document.querySelectorAll('.status-container'));
    if (containers.length === 0) return;

    containers.forEach((container) => {
        if (!container) return;
        const existing = container.querySelector('.status-center');
        if (existing) return;

        const el = document.createElement('span');
        el.className = 'status-center';
        el.setAttribute('aria-live', 'polite');

        const first = container.firstElementChild;
        if (first && first.nextSibling) {
            container.insertBefore(el, first.nextSibling);
        } else {
            container.appendChild(el);
        }
    });

    const update = () => {
        const { year, month, day, hour, minute, second } = getBeijingNowParts();
        const greeting = getTimeGreetingByHour(hour);
        const y = Number.isFinite(year) ? year - 11 : '';
        const timeText = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
        const text = `${greeting}！现在是北京时间\n${y}年${month}月${day}日 ${timeText}`;
        document.querySelectorAll('.status-center').forEach((node) => {
            node.textContent = text;
        });
    };

    update();
    if (window.__statusClockTimer) clearInterval(window.__statusClockTimer);
    window.__statusClockTimer = setInterval(update, 1000);
}

function setupAuthReturnCapture() {
    document.addEventListener('click', (event) => {
        const anchor = event.target && event.target.closest ? event.target.closest('a') : null;
        if (!anchor) return;
        const hrefAttr = anchor.getAttribute('href') || '';
        if (!hrefAttr) return;
        const href = String(hrefAttr).trim();
        const normalized = href.split('#')[0];
        const isLogin = /(^|\/)login\.html(\?|$)/i.test(normalized);
        const isRegister = /(^|\/)register\.html(\?|$)/i.test(normalized);
        if (!isLogin && !isRegister) return;
        if (isAuthPagePathname(window.location.pathname)) return;
        storeAuthReturnUrlIfNeeded(window.location.href);
    }, true);

    if (isAuthPagePathname(window.location.pathname)) {
        const existing = sessionStorage.getItem(AUTH_RETURN_STORAGE_KEY);
        const existingSafe = existing ? getSafeSameOriginUrl(existing) : null;
        if (!existingSafe) {
            const fromParam = getAuthRedirectParamUrl();
            if (fromParam) {
                storeAuthReturnUrlIfNeeded(fromParam);
            } else if (document.referrer) {
                storeAuthReturnUrlIfNeeded(document.referrer);
            }
        }
    }
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

function cloneDebugValue(value) {
    if (value == null) return value;
    if (typeof value === 'string') {
        return value.length > 5000 ? `${value.slice(0, 5000)}...(truncated)` : value;
    }

    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return String(value);
    }
}

function maskDebugHeaderValue(name, value) {
    const headerName = String(name || '').toLowerCase();
    if (headerName === 'authorization') {
        return typeof value === 'string' && value ? '***masked***' : value;
    }
    return value;
}

function getLoggableRequestHeaders(headers) {
    const result = {};
    if (!headers || typeof headers !== 'object') return result;

    Object.keys(headers).forEach((key) => {
        result[key] = maskDebugHeaderValue(key, headers[key]);
    });
    return result;
}

function getResponseHeadersForDebug(headers) {
    const result = {};
    if (!headers || typeof headers.forEach !== 'function') return result;

    headers.forEach((value, key) => {
        result[key] = value;
    });
    return result;
}

function getComposerFieldLabel(field) {
    switch (String(field || '')) {
        case 'title':
            return '标题';
        case 'content':
            return '内容';
        case 'discussionId':
            return '帖子编号';
        case 'consumablePoints':
            return '积分';
        case 'auth':
            return '登录状态';
        default:
            return field ? String(field) : '未知字段';
    }
}

function formatComposerIssuePath(pointer) {
    const rawPointer = String(pointer || '').trim();
    if (!rawPointer) return '';

    if (!rawPointer.startsWith('/')) {
        return rawPointer;
    }

    const segments = rawPointer.split('/').filter(Boolean);
    return segments.join('.');
}

function buildComposerIssueLabel(issue) {
    const field = String(issue?.field || '').trim();
    const pointer = String(issue?.pointer || '').trim();
    const parameter = String(issue?.parameter || '').trim();
    const mappedLabel = field ? getComposerFieldLabel(field) : '';
    const label = String(issue?.label || mappedLabel || '').trim() || '未知字段';
    const details = [];
    const pathLabel = formatComposerIssuePath(pointer);

    if (label === '未知字段' && field) {
        details.push(`字段 ${field}`);
    }
    if (parameter && parameter !== field) {
        details.push(`参数 ${parameter}`);
    }
    if (pathLabel && pathLabel !== field && pathLabel !== parameter) {
        details.push(`路径 ${pathLabel}`);
    }

    return details.length > 0 ? `${label}（${details.join('，')}）` : label;
}

function createComposerValidationError(message, issues = []) {
    const error = new Error(message || '提交参数校验失败');
    error.code = 'local_validation_error';
    error.errorCategory = 'validation';
    error.validationIssues = Array.isArray(issues)
        ? issues.map((issue) => ({
            field: issue?.field ? String(issue.field) : '',
            label: getComposerFieldLabel(issue?.field),
            reason: issue?.reason ? String(issue.reason) : '参数不符合要求',
            value: cloneDebugValue(issue?.value)
        }))
        : [];
    return error;
}

function isComposerValidationError(error) {
    return !!(error?.errorCategory === 'validation' || Array.isArray(error?.validationIssues));
}

function parseApiErrorList(detail) {
    if (!detail || typeof detail !== 'string') return [];

    try {
        const parsed = JSON.parse(detail);
        return Array.isArray(parsed?.errors) ? parsed.errors : [];
    } catch {
        return [];
    }
}

function getApiValidationIssues(error) {
    return parseApiErrorList(error?.detail).map((item) => {
        const pointer = String(item?.source?.pointer || '');
        const parameter = String(item?.source?.parameter || '');
        const sourceKey = pointer || parameter;
        const pointerSegments = pointer.split('/').filter(Boolean);
        const field = pointerSegments[pointerSegments.length - 1] || parameter || '';
        const reason = String(item?.detail || item?.title || item?.code || '参数不符合要求').trim() || '参数不符合要求';
        return {
            field,
            label: getComposerFieldLabel(field),
            reason,
            pointer,
            parameter,
            sourceKey,
            code: String(item?.code || '')
        };
    }).filter((item) => item.reason);
}

function getComposerValidationIssues(error) {
    if (Array.isArray(error?.validationIssues) && error.validationIssues.length > 0) {
        return error.validationIssues;
    }
    return getApiValidationIssues(error);
}

function formatComposerValidationSummary(issues, fallbackMessage) {
    if (!Array.isArray(issues) || issues.length === 0) {
        return fallbackMessage;
    }

    return issues.slice(0, 3).map((issue) => {
        const label = buildComposerIssueLabel(issue);
        const reason = issue?.reason || '参数不符合要求';
        return `${label}：${reason}`;
    }).join('\n');
}

function classifyComposerSubmissionError(error) {
    if (isComposerValidationError(error)) return 'validation';

    const parsed = error?.apiError || parseApiErrorDetail(error?.detail);
    const status = error?.httpStatus || parsed?.status || error?.response?.status || null;
    const rawMessage = String(error?.message || '');

    if (error?.isNetworkError || error instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(rawMessage)) {
        return 'network';
    }

    if (status || parsed || error?.response?.detail) {
        return 'server';
    }

    return 'unknown';
}

function buildComposerUserErrorMessage(error, context = 'generic') {
    const category = classifyComposerSubmissionError(error);
    const fallbackMessage = getFriendlyErrorMessage(error, context);

    if (category === 'network') {
        return '当前网络连接不稳定，请检查网络后重试。';
    }

    if (category === 'validation') {
        return formatComposerValidationSummary(getComposerValidationIssues(error), fallbackMessage);
    }

    if (category === 'server') {
        const parsed = error?.apiError || parseApiErrorDetail(error?.detail);
        const validationMessage = formatComposerValidationSummary(getApiValidationIssues(error), '');
        const serverMessage = String(parsed?.detail || parsed?.title || '').trim();

        if (validationMessage) return validationMessage;
        if (serverMessage && !fallbackMessage.includes(serverMessage)) {
            return `${fallbackMessage}\n服务器提示：${serverMessage}`;
        }
    }

    return fallbackMessage;
}

function buildComposerErrorDebugInfo(error, context = 'generic', meta = {}) {
    const parsed = error?.apiError || parseApiErrorDetail(error?.detail);
    const requestInfo = error?.request || {};
    const responseInfo = error?.response || {};

    return {
        context,
        category: classifyComposerSubmissionError(error),
        operationLabel: meta?.operationLabel || '',
        userMessage: buildComposerUserErrorMessage(error, context),
        errorCode: parsed?.code || error?.code || (error?.isNetworkError ? 'NETWORK_REQUEST_FAILED' : ''),
        httpStatus: error?.httpStatus || parsed?.status || responseInfo?.status || null,
        requestTime: requestInfo?.requestTime || meta?.requestTime || '',
        requestUrl: requestInfo?.url || meta?.requestUrl || '',
        requestMethod: requestInfo?.method || meta?.requestMethod || '',
        requestHeaders: requestInfo?.headers || meta?.requestHeaders || null,
        requestParams: requestInfo?.params !== undefined ? requestInfo.params : meta?.requestParams,
        responseStatus: responseInfo?.status || error?.httpStatus || null,
        responseStatusText: responseInfo?.statusText || '',
        responseHeaders: responseInfo?.headers || null,
        responseDetail: responseInfo?.detail !== undefined ? responseInfo.detail : error?.detail,
        validationIssues: getComposerValidationIssues(error),
        rawMessage: String(error?.message || ''),
        rawError: error
    };
}

function logComposerSubmissionError(error, context = 'generic', meta = {}) {
    const debugInfo = buildComposerErrorDebugInfo(error, context, meta);
    const operationLabel = meta?.operationLabel || context || '提交';
    const title = `[${operationLabel}失败][${debugInfo.category}] ${debugInfo.userMessage.split('\n')[0]}`;

    console.groupCollapsed(title);
    console.error('用户提示:', debugInfo.userMessage);

    if (debugInfo.category === 'network') {
        console.error('网络错误码:', debugInfo.errorCode || 'UNKNOWN_NETWORK_ERROR');
        console.error('请求时间:', debugInfo.requestTime || '');
        console.error('请求 URL:', debugInfo.requestUrl || '');
        console.error('请求头:', debugInfo.requestHeaders);
        console.error('请求参数:', debugInfo.requestParams);
    } else if (debugInfo.category === 'server') {
        console.error('服务器返回详情:', debugInfo.responseDetail);
        console.error('请求 URL:', debugInfo.requestUrl || '');
        console.error('请求头:', debugInfo.requestHeaders);
        console.error('请求参数:', debugInfo.requestParams);
        console.error('响应状态码:', debugInfo.responseStatus || debugInfo.httpStatus || '');
        if (debugInfo.responseStatusText) {
            console.error('响应状态文本:', debugInfo.responseStatusText);
        }
        if (debugInfo.responseHeaders) {
            console.error('响应头:', debugInfo.responseHeaders);
        }
    } else if (debugInfo.category === 'validation') {
        console.error('参数校验失败字段:', debugInfo.validationIssues);
        console.error('校验失败原因:', formatComposerValidationSummary(debugInfo.validationIssues, debugInfo.rawMessage));
        console.error('提交参数:', debugInfo.requestParams);
    } else {
        console.error('请求 URL:', debugInfo.requestUrl || '');
        console.error('请求头:', debugInfo.requestHeaders);
        console.error('请求参数:', debugInfo.requestParams);
        console.error('响应详情:', debugInfo.responseDetail);
    }

    console.error('原始错误对象:', debugInfo.rawError);
    console.groupEnd();
    return debugInfo;
}

function presentComposerSubmissionError(error, options = {}) {
    const context = options?.context || 'generic';
    const debugInfo = logComposerSubmissionError(error, context, options);
    const canRetry = typeof options?.onRetry === 'function' && debugInfo.category !== 'validation';
    const userMessage = canRetry
        ? `${debugInfo.userMessage}\n如为临时故障，可点击“重试”再次提交。`
        : debugInfo.userMessage;

    if (typeof showUiToast === 'function') {
        let toastController = null;
        toastController = showUiToast({
            type: 'error',
            message: userMessage,
            actionText: canRetry ? (options?.retryText || '重试') : '',
            onAction: () => {
                if (toastController && typeof toastController.close === 'function') {
                    toastController.close();
                }
                if (canRetry) {
                    try {
                        options.onRetry();
                    } catch (retryError) {
                        console.error(`${options?.operationLabel || '操作'}重试入口触发失败:`, retryError);
                    }
                }
            }
        });
        return debugInfo;
    }

    alert(userMessage);
    return debugInfo;
}

function getPreferredDisplayName(userAttributes, fallback = '匿名用户') {
    const preferredName = [
        userAttributes?.nickname,
        userAttributes?.displayName,
        userAttributes?.username
    ].find((value) => typeof value === 'string' && value.trim());

    return preferredName ? preferredName.trim() : fallback;
}

function getUserPoints(userAttributes) {
    // 私信积分回滚由服务器 SQL 处理，不在前端扣减。
    const candidates = [
        userAttributes?.money,
        userAttributes?.moneyAmount,
        userAttributes?.money_balance,
        userAttributes?.balance
    ];

    for (const value of candidates) {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim()) {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
        }
    }
    return null;
}

function getUserExperience(userAttributes) {
    const candidates = [
        userAttributes?.points,
        userAttributes?.votes,
        userAttributes?.reputation,
        userAttributes?.rank,
        userAttributes?.gamificationPoints
    ];

    for (const value of candidates) {
        const n = Number(value);
        if (Number.isFinite(n) && n >= 0) return n;
    }

    return 0;
}

function getFriendlyErrorMessage(error, context = 'generic') {
    const parsed = error?.apiError || parseApiErrorDetail(error?.detail);
    const status = error?.httpStatus || parsed?.status || null;
    const code = parsed?.code || error?.code || '';
    const rawMessage = String(error?.message || '');
    const detailMessage = String(parsed?.detail || error?.detail || '');
    const activationHint = '请确认账号已经激活，如仍有问题请联系网管。';

    if (error instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(rawMessage)) {
        return '网络连接异常，暂时无法连接论坛，请检查网络后重试。';
    }

    if (status === 401 || code === 'not_authenticated') {
        switch (context) {
            case 'login':
                return '登录失败，请检查账号和密码是否正确。';
            case 'create_discussion':
            case 'create_post':
            case 'delete_post':
            case 'delete_discussion':
            case 'profile':
            case 'upload_image':
            case 'upload_avatar':
                return '登录状态已失效，请重新登录后再试。';
            default:
                return '当前登录状态已失效，请重新登录后再试。';
        }
    }

    if (status === 403 || code === 'permission_denied') {
        switch (context) {
            case 'create_discussion':
                return `当前账号没有发帖权限。${activationHint}`;
            case 'create_post':
                return `当前账号没有回帖权限。${activationHint}`;
            case 'delete_post':
                return `当前账号没有删除这条回复的权限，只能删除自己的内容。${activationHint}`;
            case 'delete_discussion':
                return `当前账号没有删除这个帖子的权限，只能删除自己的内容。${activationHint}`;
            case 'upload_image':
                return `当前账号没有上传图片的权限。${activationHint}`;
            case 'upload_avatar':
                return `当前账号没有修改头像的权限。${activationHint}`;
            case 'profile':
                return `当前账号没有查看该页面内容的权限。${activationHint}`;
            case 'load_discussion':
                return `当前账号暂时没有查看该内容的权限。${activationHint}`;
            case 'register':
                return '当前论坛暂不允许普通用户注册。';
            default:
                return `当前账号没有执行此操作的权限。${activationHint}`;
        }
    }

    if (status === 404 || code === 'not_found') {
        switch (context) {
            case 'load_discussion':
                return '这篇帖子不存在，或已经被删除。';
            case 'profile':
                return '未找到对应的用户资料。';
            default:
                return '你访问的内容不存在，或已经被删除。';
        }
    }

    if (status === 429 || code === 'rate_limit_exceeded') {
        return '操作太频繁了，请稍后再试。';
    }

    if (
        (status === 400 || code === 'upload_file_too_large') &&
        (
            code === 'upload_file_too_large' ||
            /2\s*mb|too\s*large|文件过大|大小不能超过/i.test(`${detailMessage} ${rawMessage}`)
        )
    ) {
        return context === 'upload_avatar'
            ? getUploadImageSizeHint('头像图片')
            : getUploadImageSizeHint('图片');
    }

    if (code === 'validation_error') {
        switch (context) {
            case 'register':
                return '注册信息填写不完整，或格式不正确，请检查后重试。';
            case 'create_discussion':
                return '帖子内容不符合要求，请检查标题和正文后重试。';
            case 'create_post':
                return '回复内容不符合要求，请修改后再试。';
            default:
                return '提交的信息不符合要求，请检查后重试。';
        }
    }

    if (status && status >= 500) {
        return '论坛服务器暂时繁忙，请稍后再试。';
    }

    switch (context) {
        case 'login':
            return '登录失败，请检查账号和密码后重试。';
        case 'register':
            return '注册失败，请稍后再试。';
        case 'create_discussion':
            return '发帖失败，请稍后再试。';
        case 'create_post':
            return '回复失败，请稍后再试。';
        case 'delete_post':
        case 'delete_discussion':
            return '删除失败，请稍后再试。';
        case 'load_discussion':
            return '帖子暂时无法加载，请刷新页面后重试。';
        case 'profile':
            return '个人资料暂时无法加载，请稍后再试。';
        case 'upload_image':
            return '图片上传失败，请稍后再试。';
        case 'upload_avatar':
            return '头像上传失败，请稍后再试。';
        default:
            return '操作失败，请稍后再试。';
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
                    const userJson = await flarumRequest(`/users/${json.userId}`, { auth: true });
                    if (userJson?.data?.attributes) {
                        const displayName = getPreferredDisplayName(userJson.data.attributes, '已登录用户');
                        localStorage.setItem('flarumUsername', displayName);
                    }
                } catch (e) {
                    console.error('获取用户信息失败:', e);
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

// Flarum 注册
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

    const requestPayload = cloneDebugValue(options.json !== undefined ? options.json : options.body);
    const baseRequestInfo = {
        url,
        method: options.method || 'GET',
        requestTime: new Date().toISOString(),
        headers: getLoggableRequestHeaders(headers),
        params: requestPayload
    };

    const createFetchOptions = (requestHeaders) => ({
        method: options.method || 'GET',
        headers: requestHeaders,
        body: options.json !== undefined ? JSON.stringify(options.json) : options.body
    });

    const performFetch = async (requestHeaders) => {
        const requestInfo = {
            ...baseRequestInfo,
            headers: getLoggableRequestHeaders(requestHeaders)
        };

        try {
            const currentResponse = await fetch(url, createFetchOptions(requestHeaders));
            currentResponse.__requestInfo = requestInfo;
            return currentResponse;
        } catch (fetchError) {
            const networkError = new Error(fetchError?.message || '网络请求失败');
            networkError.name = fetchError?.name || 'NetworkError';
            networkError.code = fetchError?.code || 'NETWORK_REQUEST_FAILED';
            networkError.isNetworkError = true;
            networkError.request = requestInfo;
            networkError.originalError = fetchError;
            if (fetchError?.stack) {
                networkError.stack = fetchError.stack;
            }
            throw networkError;
        }
    };

    let response = await performFetch(headers);
    const initialStatus = response.status;

    // 对公开接口做一次无鉴权重试，避免本地过期 token 导致“登录后反而看不到内容”。
    if (
        (response.status === 401 || response.status === 403) &&
        shouldAttachAuthHeader &&
        options.auth !== true
    ) {
        const retryHeaders = { ...headers };
        delete retryHeaders.Authorization;
        response = await performFetch(retryHeaders);

        // 重试成功说明是本地 token 问题，清理后同步刷新登录态 UI。
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
        const error = new Error(`Flarum API 请求失败: ${response.status} ${response.statusText}`);
        error.detail = detail;
        error.httpStatus = response.status;
        error.apiError = parseApiErrorDetail(detail);
        error.request = response.__requestInfo || baseRequestInfo;
        error.response = {
            status: response.status,
            statusText: response.statusText,
            headers: getResponseHeadersForDebug(response.headers),
            detail: cloneDebugValue(detail)
        };
        throw error;
    }

    if (response.status === 204) return null;
    return await response.json();
}

async function customRequest(path, options = {}) {
    const url = (path.startsWith('/') ? path : '/' + path);

    const headers = {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers
    };

    if (options.json !== undefined) {
        headers['Content-Type'] = 'application/json';
    } else if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const token = getFlarumToken();
    const userId = localStorage.getItem('flarumUserId');
    const shouldAttachAuthHeader = !!(token && options.auth !== false && !headers.Authorization);

    if (options.auth === true) {
        if (!token || !userId) {
            const error = new Error('请先登录后再发送短消息');
            error.httpStatus = 401;
            error.detail = 'missing_token_or_user_id';
            throw error;
        }
    }

    if (shouldAttachAuthHeader) {
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
        const error = new Error(`自定义接口请求失败: ${response.status} ${response.statusText}`);
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

function formatViewCount(viewCount) {
    if (typeof viewCount === 'number' && Number.isFinite(viewCount) && viewCount >= 0) return String(viewCount);
    if (typeof viewCount === 'string' && viewCount.trim()) {
        const n = Number(viewCount);
        if (Number.isFinite(n) && n >= 0) return String(n);
    }
    return '0';
}

function getDiscussionViewCount(attributes) {
    const a = attributes || {};
    const candidates = [
        a.views,
        a.view_count,
        a.viewCount
    ];
    for (const v of candidates) {
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
            return v;
        }

        if (typeof v === 'string' && v.trim()) {
            const n = Number(v);

            if (Number.isFinite(n) && n >= 0) {
                return n;
            }
        }
    }
    return 0;
}

function escapeHtml(raw) {
    const s = typeof raw === 'string' ? raw : '';
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function textToHtmlParagraphs(rawText) {
    const s0 = typeof rawText === 'string' ? rawText : '';
    const s = s0
        .replace(/\\r\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\r\n/g, '\n');
    const paragraphs = s.split(/\n{2,}/g).map((p) => p.replace(/\s+$/g, '')).filter((p) => p.length > 0);
    if (paragraphs.length === 0) return '';
    return paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
}

function normalizeLineBreaksInHtml(contentHtml) {
    const original = typeof contentHtml === 'string' ? contentHtml : '';
    if (!original) return '';
    try {
        const doc = new DOMParser().parseFromString(original, 'text/html');
        const isInsidePre = (node) => {
            let p = node && node.parentNode;
            while (p && p.nodeType === 1) {
                if (String(p.tagName || '').toUpperCase() === 'PRE') return true;
                p = p.parentNode;
            }
            return false;
        };

        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        let n = walker.nextNode();
        while (n) {
            textNodes.push(n);
            n = walker.nextNode();
        }

        for (const tn of textNodes) {
            if (!tn || !tn.nodeValue) continue;
            if (isInsidePre(tn)) continue;
            const v = tn.nodeValue
                .replace(/\\r\\n/g, '\n')
                .replace(/\\n/g, '\n')
                .replace(/\r\n/g, '\n');
            if (v.includes('\n') && v.trim() === '') {
                tn.nodeValue = v;
                continue;
            }
            if (!v.includes('\n')) {
                tn.nodeValue = v;
                continue;
            }
            const parts = v.split('\n');
            const frag = doc.createDocumentFragment();
            for (let i = 0; i < parts.length; i++) {
                if (i > 0) frag.appendChild(doc.createElement('br'));
                frag.appendChild(doc.createTextNode(parts[i]));
            }
            tn.parentNode && tn.parentNode.replaceChild(frag, tn);
        }

        return doc.body.innerHTML;
    } catch {
        return original
            .replace(/\\r\\n/g, '<br>')
            .replace(/\\n/g, '<br>')
            .replace(/\r\n|\n/g, '<br>');
    }
}

function isMeaninglessHtmlNode(node) {
    if (!node) return true;
    if (node.nodeType === Node.TEXT_NODE) {
        return !String(node.nodeValue || '').replace(/\u00a0/g, ' ').trim();
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return true;

    const tagName = String(node.tagName || '').toUpperCase();
    if (tagName === 'BR') return true;

    const visibleSelector = 'img,video,audio,iframe,object,embed,svg,hr,table,ul,ol,pre,blockquote';
    if (node.matches?.(visibleSelector) || node.querySelector?.(visibleSelector)) {
        return false;
    }

    const clone = node.cloneNode(true);
    clone.querySelectorAll?.('br').forEach((br) => br.remove());
    return !String(clone.textContent || '').replace(/\u00a0/g, ' ').trim();
}

function cleanupThreadedReplyHtml(contentHtml) {
    const original = typeof contentHtml === 'string' ? contentHtml : '';
    if (!original.trim()) return '';

    try {
        const doc = new DOMParser().parseFromString(original, 'text/html');
        const body = doc.body;

        body.querySelectorAll('p').forEach((paragraph) => {
            while (paragraph.firstChild && isMeaninglessHtmlNode(paragraph.firstChild)) {
                paragraph.removeChild(paragraph.firstChild);
            }
            while (paragraph.lastChild && isMeaninglessHtmlNode(paragraph.lastChild)) {
                paragraph.removeChild(paragraph.lastChild);
            }
        });

        Array.from(body.childNodes).forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && isMeaninglessHtmlNode(node)) {
                node.remove();
            }
        });

        while (body.firstChild && isMeaninglessHtmlNode(body.firstChild)) {
            body.removeChild(body.firstChild);
        }
        while (body.lastChild && isMeaninglessHtmlNode(body.lastChild)) {
            body.removeChild(body.lastChild);
        }

        return normalizeLineBreaksInHtml(body.innerHTML).trim();
    } catch {
        return normalizeLineBreaksInHtml(original).trim();
    }
}

function getPlainTextFromHtml(contentHtml) {
    const original = typeof contentHtml === 'string' ? contentHtml : '';
    if (!original) return '';

    try {
        const doc = new DOMParser().parseFromString(original, 'text/html');
        return String(doc.body.textContent || '')
            .replace(/\u00a0/g, ' ')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n[ \t]+/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    } catch {
        return original
            .replace(/<[^>]*>/g, ' ')
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
}

function buildQuotePreviewText(contentHtml, maxLength = 100) {
    const plainText = getPlainTextFromHtml(contentHtml)
        .replace(/\s*\n+\s*/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

    if (!plainText) return '';
    if (plainText.length <= maxLength) return plainText;
    return `${plainText.slice(0, maxLength)}...`;
}

function buildQuoteFloorLabelHtml(targetFloor, options = {}) {
    const floor = Number(targetFloor);
    if (!Number.isFinite(floor) || floor <= 0) {
        return '<span style="color: #999; cursor: default;">未知楼层</span>';
    }

    const visibleFloors = Array.isArray(options.visibleFloors) ? options.visibleFloors : [];
    const discussionId = options.discussionId != null ? String(options.discussionId) : '';
    const pageSize = Number.isFinite(Number(options.pageSize)) && Number(options.pageSize) > 0
        ? Math.floor(Number(options.pageSize))
        : POST_PAGE_SIZE;
    const isOnCurrentPage = visibleFloors.includes(floor);
    const href = discussionId && !isOnCurrentPage
        ? `?id=${encodeURIComponent(discussionId)}&page=${Math.ceil(floor / pageSize)}#post-${floor}`
        : `#post-${floor}`;

    return `<a href="${href}" class="quote-floor-link" style="color: #0066cc; cursor: pointer; text-decoration: underline;">${floor}楼</a>`;
}

function buildThreadedQuoteHtml(replyToFloor, allPosts, options = {}, depth = 0) {
    if (!replyToFloor || depth >= 3) return '';
    const target = Array.isArray(allPosts) ? allPosts.find((post) => post.floor === replyToFloor) : null;
    if (!target) return '';

    const deletedInfo = parseDeletedContent(String(target.content || ''));
    const parentQuote = buildThreadedQuoteHtml(target.replyTo, allPosts, options, depth + 1);
    const floorLabelHtml = deletedInfo
        ? `<span style="color: #999; cursor: default;">${target.floor}楼</span>`
        : buildQuoteFloorLabelHtml(target.floor, options);
    const quoteText = deletedInfo ? '该楼层已被删除' : buildQuotePreviewText(target.content, 100);

    return `
        <div class="quote-box quote-level-${depth}">
            ${parentQuote}
            <div class="quote-author">引用 ${escapeHtml(target.author || '匿名用户')}(${floorLabelHtml}) 的发言：</div>
            <div class="quote-content${deletedInfo ? ' quote-content-deleted' : ''}">${escapeHtml(quoteText)}</div>
        </div>
    `;
}

function buildForumPostHtml(post, allPosts, postData, options = {}) {
    const quoteHTML = buildThreadedQuoteHtml(post.replyTo, allPosts, {
        discussionId: postData.id,
        visibleFloors: options.visibleFloors || [],
        pageSize: options.pageSize || POST_PAGE_SIZE
    });
    const previewText = buildQuotePreviewText(post.content, 50);
    const authorHtml = buildUserLinkHtml(post.userId, post.author);

    return `
        <div class="post" id="post-${post.floor}" data-post-id="${post.id}">
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
                        <div class="poster-name ${post.isOp ? 'op' : ''}">${authorHtml}${post.isOp ? '<span class="op-badge">[楼主]</span>' : ''}</div>
                        <div style="font-size: 11px; color: #999;">${post.authorLevel}${post.authorPoints != null ? ` · 积分 ${post.authorPoints}` : ''}</div>
                    </div>
                </div>
                <div class="post-time">${post.time}</div>
            </div>
            <div class="post-content">${post.content}</div>
            <div class="floor-info" style="display: flex; justify-content: flex-end; align-items: center;">
                <span class="floor-number" style="margin-right: auto;">${post.floor}楼</span>
                ${postData.allowComments !== false ? `<a href="#" class="reply-link" data-floor="${post.floor}" data-author="${escapeHtml(post.author || '')}" data-content="${escapeHtml(previewText || '')}">回复</a>` : ''}
                <span style="margin: 0 5px; color: #ccc; display: none;" class="reply-divider">|</span>
                <a href="#" class="delete-link" data-post-id="${post.id}" data-floor="${post.floor}" style="display: none; color: #cc0000;">删除</a>
            </div>
        </div>
    `;
}

function buildUserProfileHref(userId) {
    const id = userId == null ? '' : String(userId);
    if (!id) return '#';
    const currentUserId = localStorage.getItem('flarumUserId');
    if (getFlarumToken() && currentUserId && String(currentUserId) === id) return 'profile.html';
    return `profile.html?id=${encodeURIComponent(id)}`;
}

function buildUserLinkHtml(userId, displayName) {
    const label = typeof displayName === 'string' ? displayName : '';
    const href = buildUserProfileHref(userId);
    if (href === '#') return label;
    return `<a href="${href}" class="user-link" style="color: #0066cc; text-decoration: none;">${label}</a>`;
}

function pickIncluded(included, type, id) {
    if (!Array.isArray(included)) return null;
    return included.find((x) => x && x.type === type && String(x.id) === String(id)) || null;
}

function isPrivateDiscussionResource(discussion) {
    const attrs = discussion?.attributes || {};
    const rel = discussion?.relationships || {};

    if (attrs.isPrivateDiscussion === true) return true;

    const recipientCount = Number(attrs.recipientCount);
    if (Number.isFinite(recipientCount) && recipientCount > 0) return true;

    if (rel.recipientUsers?.data?.length > 0) return true;
    if (rel.recipientGroups?.data?.length > 0) return true;
    if (rel.recipients?.data?.length > 0) return true;

    return false;
}

function isPrivatePostResource(post, included) {
    const discussionId = post?.relationships?.discussion?.data?.id;
    if (!discussionId) return false;
    const discussion = pickIncluded(included, 'discussions', discussionId);
    return isPrivateDiscussionResource(discussion);
}

function filterPublicDiscussions(discussions) {
    return (Array.isArray(discussions) ? discussions : []).filter((d) => !isPrivateDiscussionResource(d));
}

function filterPublicPosts(posts, included) {
    return (Array.isArray(posts) ? posts : []).filter((p) => !isPrivatePostResource(p, included));
}

function buildPublicDiscussionFilterQuery(rawQuery = '') {
    const base = String(rawQuery || '').trim();
    return base ? `${base} -is:private` : '-is:private';
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

function stripReplyPrefixFromHtml(contentHtml, replyPrefixPattern) {
    const original = typeof contentHtml === 'string' ? contentHtml : '';
    if (!original.trim()) return '';

    try {
        const doc = new DOMParser().parseFromString(original, 'text/html');
        const first = doc.body.firstElementChild;

        if (first && first.tagName === 'P') {
            const nextText = String(first.textContent || '').trim().replace(replyPrefixPattern, '').trim();
            if (nextText !== String(first.textContent || '').trim()) {
                if (nextText) {
                    first.textContent = nextText;
                } else {
                    first.remove();
                }
                return cleanupThreadedReplyHtml(doc.body.innerHTML
                    .replace(/\\n\\n/g, '')
                    .replace(/\n\n/g, '')
                );
            }
        }
    } catch (_) {}

    return cleanupThreadedReplyHtml(original
        .replace(replyPrefixPattern, '')
        .replace(/\\n\\n/g, '')
        .replace(/\n\n/g, '')
    );
}

function extractReplyMetaFromContentHtml(contentHtml) {
    const original = typeof contentHtml === 'string' ? contentHtml : '';
    const replyPrefixPattern = /^回复\s+(?:.*?\()?\s*(\d+)\s*楼\)?\s*：(?:\\n\\n|\n\n|\s*)?/u;

    try {
        const doc = new DOMParser().parseFromString(original, 'text/html');
        const first = doc.body.firstElementChild;

        if (first && first.tagName === 'P') {
            let text = (first.textContent || '').trim();

            // 支持：
            // 回复 3楼：
            // 回复 张三(3楼)：
            // 回复 张三(3楼)：\n\n正文
            const m = text.match(replyPrefixPattern);

            if (m) {
                const replyToFloor = Number(m[1]);

                text = text.replace(replyPrefixPattern, '').trim();

                if (text) {
                    first.textContent = text;
                } else {
                    first.remove();
                }

                return {
                    replyToFloor,
                    cleanedHtml: cleanupThreadedReplyHtml(doc.body.innerHTML
                        .replace(/\\n\\n/g, '')
                        .replace(/\n\n/g, '')
                    )
                };
            }
        }

        const firstLineText = (doc.body.textContent || '').trim().split(/\r?\n/).find((line) => String(line || '').trim()) || '';
        const fallbackMatch = firstLineText.match(replyPrefixPattern);
        if (fallbackMatch) {
            return {
                replyToFloor: Number(fallbackMatch[1]),
                cleanedHtml: stripReplyPrefixFromHtml(original, replyPrefixPattern)
            };
        }

        return {
            replyToFloor: null,
            cleanedHtml: cleanupThreadedReplyHtml(original
                .replace(/\\n\\n/g, '')
                .replace(/\n\n/g, '')
            )
        };
    } catch {
        return {
            replyToFloor: null,
            cleanedHtml: cleanupThreadedReplyHtml(original
                .replace(/\\n\\n/g, '')
                .replace(/\n\n/g, '')
            )
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

    // 创建帖子ID到楼层号的映射
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

    const viewCount = getDiscussionViewCount(discussion.attributes);

    const coercePostContentToHtml = (postResource) => {
        const attrs = postResource?.attributes || {};
        const html = typeof attrs.contentHtml === 'string' ? attrs.contentHtml : '';
        if (html && html.trim()) return normalizeLineBreaksInHtml(html);
        const raw = typeof attrs.content === 'string' ? attrs.content : '';
        const converted = textToHtmlParagraphs(raw);
        return converted ? normalizeLineBreaksInHtml(converted) : normalizeLineBreaksInHtml(escapeHtml(raw));
    };

    const postData = {
        id: Number(discussion.id),
        userId: firstUserId ? Number(firstUserId) : null,
        title: discussion.attributes?.title || '',
        author: getPreferredDisplayName(firstUser?.attributes),
        authorLevel: 'Lv.1 新手上路',
        authorPoints: getUserPoints(firstUser?.attributes),
        authorAvatar: getUserAvatarUrl(firstUser),
        publishTime: formatFlarumTime(discussion.attributes?.createdAt),
        viewCount,
        allowComments: true,
        content: coercePostContentToHtml(firstPost),
        comments: posts
            .filter((p) => p !== firstPost)
            .map((p) => {
                const userId = p.relationships?.user?.data?.id;
                const user = userId ? pickIncluded(included, 'users', userId) : null;
                const number = p.attributes?.number;

                const html = coercePostContentToHtml(p);
                const extracted = extractReplyMetaFromContentHtml(html);
                const stored = getStoredFlarumReplyToFloor(discussion.id, p.id);
                const replyTo = extracted.replyToFloor || stored || null;
                const cleanedHtml = replyTo && !extracted.replyToFloor
                    ? stripReplyPrefixFromHtml(extracted.cleanedHtml, /^回复\s+(?:.*?\()?\s*\d+\s*楼\)?\s*：(?:\\n\\n|\n\n|\s*)?/u)
                    : cleanupThreadedReplyHtml(extracted.cleanedHtml);

                return {
                    id: Number(p.id),
                    userId: userId ? Number(userId) : null,
                    author: getPreferredDisplayName(user?.attributes),
                    authorLevel: 'Lv.1 新手上路',
                    authorPoints: getUserPoints(user?.attributes),
                    authorAvatar: getUserAvatarUrl(user),
                    time: formatFlarumTime(p.attributes?.createdAt),
                    floor: typeof number === 'number' ? number : 0,
                    content: cleanedHtml,
                    replyTo
                };
            })
    };

    postData.comments = postData.comments
        .filter((c) => c.floor && c.floor !== 1)
        .sort((a, b) => a.floor - b.floor);

    return postData;
}

function mergeUniqueResources(baseResources, resourcesToAppend) {
    const merged = Array.isArray(baseResources) ? [...baseResources] : [];
    const seen = new Set(
        merged
            .filter((item) => item && item.type && item.id != null)
            .map((item) => `${item.type}:${String(item.id)}`)
    );

    (Array.isArray(resourcesToAppend) ? resourcesToAppend : []).forEach((item) => {
        if (!item || !item.type || item.id == null) return;
        const key = `${item.type}:${String(item.id)}`;
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(item);
    });

    return merged;
}

async function flarumLoadDiscussionPosts(discussionId, options = {}) {
    const id = String(discussionId);
    const rawExpectedCount = Number(options.expectedCount);
    const expectedCount = Number.isFinite(rawExpectedCount) && rawExpectedCount > 0
        ? Math.floor(rawExpectedCount)
        : null;
    const rawBatchSize = Number(options.batchSize);
    const batchSize = Number.isFinite(rawBatchSize) && rawBatchSize > 0
        ? Math.max(Math.floor(rawBatchSize), POST_PAGE_SIZE)
        : DISCUSSION_POST_BATCH_SIZE;
    const posts = [];
    const postIds = new Set();
    let included = [];
    let offset = 0;

    while (true) {
        const postsJson = await flarumRequest(
            `/posts?filter[discussion]=${encodeURIComponent(id)}&sort=number&page[limit]=${batchSize}&page[offset]=${offset}&include=user`,
            { auth: options.auth }
        );
        const batchPosts = Array.isArray(postsJson?.data) ? postsJson.data : [];
        const sizeBeforeMerge = postIds.size;

        batchPosts.forEach((post) => {
            const postId = post?.id != null ? String(post.id) : '';
            if (!postId || postIds.has(postId)) return;
            postIds.add(postId);
            posts.push(post);
        });

        included = mergeUniqueResources(included, postsJson?.included || []);

        if (batchPosts.length === 0) {
            break;
        }

        if (expectedCount && postIds.size >= expectedCount) {
            break;
        }

        const nextOffset = parseOffsetFromPageLink(postsJson?.links?.next);
        if (Number.isFinite(nextOffset) && nextOffset > offset) {
            offset = nextOffset;
            continue;
        }

        if (postIds.size <= sizeBeforeMerge) {
            break;
        }

        offset += batchPosts.length;

        if (!expectedCount && batchPosts.length < batchSize) {
            break;
        }
    }

    return { posts, included };
}

async function flarumLoadDiscussion(postId) {
    const id = String(postId);

    try {
        const readWithAuth = getFlarumToken() ? undefined : false;
        // 获取 discussion 基本信息
        const discussionJson = await flarumRequest(
            `/discussions/${encodeURIComponent(id)}?include=user`,
            { auth: readWithAuth }
        );

        if (!discussionJson?.data) {
            return null;
        }

        const expectedPostCount = Number(discussionJson.data.attributes?.lastPostNumber);
        const {
            posts: allPosts,
            included: postIncluded
        } = await flarumLoadDiscussionPosts(id, {
            expectedCount: expectedPostCount,
            auth: readWithAuth
        });

        // 合并数据结构（保持兼容）
        discussionJson.included = mergeUniqueResources(
            mergeUniqueResources(discussionJson.included || [], postIncluded),
            allPosts
        );

        discussionJson.data.relationships = discussionJson.data.relationships || {};
        discussionJson.data.relationships.posts = {
            data: allPosts.map(p => ({ type: 'posts', id: String(p.id) }))
        };

        return flarumDiscussionToPostData(discussionJson);
    } catch (error) {
        console.error('flarumLoadDiscussion: 加载帖子失败:', error);
        console.error('错误详情:', error.detail);
        throw error;
    }
}

async function flarumLoadDiscussionList(options = {}) {
    const shouldThrow = options?.throwOnError === true;
    try {
        let json = null;
        const filterQ = encodeURIComponent(buildPublicDiscussionFilterQuery());

        try {
            json = await flarumRequest(`/discussions?sort=-createdAt&page[limit]=20&include=user&filter[q]=${filterQ}`, { auth: false });
        } catch (_) {}

        let discussions = filterPublicDiscussions(Array.isArray(json?.data) ? json.data : []);
        if (discussions.length === 0) {
            json = await flarumRequest('/discussions?sort=-createdAt&page[limit]=20&include=user', { auth: false });
            discussions = filterPublicDiscussions(Array.isArray(json?.data) ? json.data : []);
        }

        const included = json?.included || [];

        return discussions.map((d) => {
            const userId = d.relationships?.user?.data?.id;
            const user = userId ? pickIncluded(included, 'users', userId) : null;
            const viewCount = getDiscussionViewCount(d.attributes);
            return {
                id: Number(d.id),
                title: d.attributes?.title || '',
                author: getPreferredDisplayName(user?.attributes),
                date: formatFlarumTime(d.attributes?.createdAt || '').slice(0, 10),
                views: viewCount
            };
        });
    } catch (error) {
        console.warn('获取帖子列表失败:', error);
        if (shouldThrow) {
            throw error;
        }
        return [];
    }
}

// 获取最新回复列表
async function flarumLoadRecentReplies() {
    try {
        const json = await flarumRequest('/posts?sort=-createdAt&page[limit]=20&include=discussion,user', { auth: false });
        const included = json?.included || [];
        const posts = filterPublicPosts(Array.isArray(json?.data) ? json.data : [], included);
        
        const results = [];
        const seenDiscussionIds = new Set();
        
        for (const post of posts) {
            const discussionId = post.relationships?.discussion?.data?.id;
            if (!discussionId || seenDiscussionIds.has(discussionId)) continue;
            
            // 找到对应的讨论
            const discussion = pickIncluded(included, 'discussions', discussionId);
            const userId = post.relationships?.user?.data?.id;
            const user = userId ? pickIncluded(included, 'users', userId) : null;
            
            seenDiscussionIds.add(discussionId);
            
            results.push({
                discussionId: Number(discussionId),
                postId: Number(post.id),
                floor: post.attributes?.number, // 添加楼层号用于锚点跳转
                title: discussion?.attributes?.title || '',
                author: getPreferredDisplayName(user?.attributes),
                time: post.attributes?.createdAt || '',
                content: post.attributes?.contentHtml || post.attributes?.content || ''
            });
            
            // 只取5条不重复的回复/主题
            if (results.length >= 5) break;
        }
        
        return results;
    } catch (error) {
        console.warn('获取最新回复失败:', error);
        return [];
    }
}

async function flarumLoadAllDiscussionsPage({ sortField, sortOrder, offset, limit, filterQ }) {
    const safeLimit = typeof limit === 'number' && isFinite(limit) && limit > 0 ? Math.min(15, Math.floor(limit)) : 15;
    const safeOffset = typeof offset === 'number' && isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;
    const field = sortField === 'views' ? 'views' : 'createdAt';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    const buildSortCandidates = () => {
        if (field === 'createdAt') {
            return [order === 'desc' ? '-createdAt' : 'createdAt'];
        }
        return order === 'desc'
            ? ['popular', '-views', 'views', '-view_count', '-viewCount']
            : ['unpopular', 'views', '-views', 'view_count', 'viewCount'];
    };

    const baseQuery = `page[limit]=${safeLimit}&page[offset]=${safeOffset}&include=user`;
    const filterQSafe = typeof filterQ === 'string' ? filterQ.trim() : '';
    const filterPart = filterQSafe ? `&filter[q]=${encodeURIComponent(filterQSafe)}` : '';
    let lastError = null;
    for (const sort of buildSortCandidates()) {
        try {
            // 全部帖子页只展示公开主题；这里统一按公开读取，避免登录态把私密讨论混入分页结果后又被前端过滤空。
            const json = await flarumRequest(`/discussions?sort=${encodeURIComponent(sort)}&${baseQuery}${filterPart}`, { auth: false });
            return { json, usedSort: sort, usedFallbackSort: false };
        } catch (error) {
            lastError = error;
        }
    }

    const fallbackSort = order === 'desc' ? '-createdAt' : 'createdAt';
    const json = await flarumRequest(`/discussions?sort=${encodeURIComponent(fallbackSort)}&${baseQuery}${filterPart}`, { auth: false });
    return { json, usedSort: fallbackSort, usedFallbackSort: field === 'views', fallbackError: lastError };
}

function parseOffsetFromPageLink(link) {
    const raw = typeof link === 'string' ? link : '';
    if (!raw) return null;
    try {
        const base = window.location.origin || 'http://localhost';
        const u = new URL(raw, base);
        const v = u.searchParams.get('page[offset]');
        const n = v == null ? NaN : Number(v);
        return Number.isFinite(n) && n >= 0 ? n : null;
    } catch {
        return null;
    }
}

async function flarumLoadUsersPage({ query, offset, limit }) {
    const q = typeof query === 'string' ? query.trim() : '';
    const safeLimit = typeof limit === 'number' && isFinite(limit) && limit > 0 ? Math.min(15, Math.floor(limit)) : 15;
    const safeOffset = typeof offset === 'number' && isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;
    const json = await flarumRequest(
        `/users?page[limit]=${safeLimit}&page[offset]=${safeOffset}&filter[q]=${encodeURIComponent(q)}`,
        { auth: false }
    );
    return { json };
}

async function flarumLoadPostsSearchPage({ query, offset, limit, sortOrder }) {
    const q = typeof query === 'string' ? query.trim() : '';
    const safeLimit = typeof limit === 'number' && isFinite(limit) && limit > 0 ? Math.min(15, Math.floor(limit)) : 15;
    const safeOffset = typeof offset === 'number' && isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    const sort = order === 'desc' ? '-createdAt' : 'createdAt';
    const json = await flarumRequest(
        `/posts?sort=${encodeURIComponent(sort)}&page[limit]=${safeLimit}&page[offset]=${safeOffset}&filter[q]=${encodeURIComponent(q)}&include=discussion,user`,
        { auth: false }
    );
    return { json };
}

async function flarumLoadUserRecentPosts({ userId, username, limit, onlyReplies }) {
    const safeLimit = typeof limit === 'number' && isFinite(limit) && limit > 0 ? Math.min(20, Math.floor(limit)) : 10;
    const id = userId == null ? '' : String(userId);
    const name = typeof username === 'string' ? username.trim() : '';
    const replyOnly = onlyReplies === true;

    const queries = [];
    if (id) {
        queries.push(`/posts?sort=-createdAt&filter[user]=${encodeURIComponent(id)}&include=discussion,user`);
    }
    if (name) {
        queries.push(`/posts?sort=-createdAt&filter[author]=${encodeURIComponent(name)}&include=discussion,user`);
        queries.push(`/posts?sort=-createdAt&filter[user]=${encodeURIComponent(name)}&include=discussion,user`);
    }

    let lastError = null;
    for (const q of queries) {
        try {
            const includedByKey = new Map();
            const collected = [];

            let offset = 0;
            let pageGuard = 0;
            while (collected.length < safeLimit && pageGuard < 8) {
                pageGuard += 1;
                const pageJson = await flarumRequest(`${q}&page[limit]=50&page[offset]=${offset}`, { auth: false });
                const posts = Array.isArray(pageJson?.data) ? pageJson.data : [];
                const included = Array.isArray(pageJson?.included) ? pageJson.included : [];
                included.forEach((item) => {
                    if (!item || !item.type || item.id == null) return;
                    includedByKey.set(`${item.type}:${item.id}`, item);
                });

                posts.forEach((post) => {
                    if (id && String(post?.relationships?.user?.data?.id || '') !== id) return;
                    if (isPrivatePostResource(post, included)) return;
                    if (replyOnly) {
                        const floor = Number(post?.attributes?.number);
                        if (!Number.isFinite(floor) || floor <= 1) return;
                    }
                    collected.push(post);
                });

                const nextOffset = parseOffsetFromPageLink(pageJson?.links?.next);
                if (nextOffset == null || posts.length === 0) break;
                offset = nextOffset;
            }

            const normalizedJson = {
                data: collected.slice(0, safeLimit),
                included: Array.from(includedByKey.values())
            };

            return { json: normalizedJson, usedQuery: q };
        } catch (e) {
            lastError = e;
        }
    }
    if (lastError) throw lastError;
    return { json: null, usedQuery: '' };
}

async function flarumLoadDiscussionsSearchPage({ query, offset, limit, sortOrder }) {
    const q = typeof query === 'string' ? query.trim() : '';
    const safeLimit = typeof limit === 'number' && isFinite(limit) && limit > 0 ? Math.min(15, Math.floor(limit)) : 15;
    const safeOffset = typeof offset === 'number' && isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    const sort = order === 'desc' ? '-createdAt' : 'createdAt';
    const candidates = Array.from(new Set([
        buildPublicDiscussionFilterQuery(q),
        q
    ].filter((item) => typeof item === 'string' && item.trim().length > 0)));
    let lastError = null;

    for (const filterQ of candidates) {
        try {
            const json = await flarumRequest(
                `/discussions?sort=${encodeURIComponent(sort)}&page[limit]=${safeLimit}&page[offset]=${safeOffset}&filter[q]=${encodeURIComponent(filterQ)}&include=user`,
                { auth: false }
            );
            return { json };
        } catch (error) {
            lastError = error;
        }
    }

    if (lastError) throw lastError;
    return { json: { data: [], included: [] } };
}

async function flarumLoadDiscussionsForFuzzy(maxItems = 200) {
    const take = typeof maxItems === 'number' && isFinite(maxItems) && maxItems > 0 ? Math.floor(maxItems) : 200;
    const pageLimit = 50;
    const discussions = [];
    const includedByKey = new Map();
    let offset = 0;
    let pageGuard = 0;

    while (discussions.length < take && pageGuard < 8) {
        pageGuard += 1;
        const json = await flarumRequest(
            `/discussions?sort=-createdAt&page[limit]=${pageLimit}&page[offset]=${offset}&include=user`,
            { auth: false }
        );
        const data = filterPublicDiscussions(Array.isArray(json?.data) ? json.data : []);
        const included = Array.isArray(json?.included) ? json.included : [];
        data.forEach((discussion) => {
            if (discussion && discussion.type === 'discussions') discussions.push(discussion);
        });
        included.forEach((item) => {
            if (!item || item.id == null || !item.type) return;
            includedByKey.set(`${item.type}:${item.id}`, item);
        });
        const nextOffset = parseOffsetFromPageLink(json?.links?.next);
        if (nextOffset == null || data.length === 0 || nextOffset === offset) break;
        offset = nextOffset;
    }

    return {
        discussions: discussions.slice(0, take),
        included: Array.from(includedByKey.values())
    };
}

async function flarumLoadUsersForFuzzy(maxItems = 200) {
    const take = typeof maxItems === 'number' && isFinite(maxItems) && maxItems > 0 ? Math.floor(maxItems) : 200;
    const pageLimit = 50;

    const users = [];
    let offset = 0;
    let pageGuard = 0;
    while (users.length < take && pageGuard < 8) {
        pageGuard += 1;
        const json = await flarumRequest(`/users?page[limit]=${pageLimit}&page[offset]=${offset}`, { auth: false });
        const data = Array.isArray(json?.data) ? json.data : [];
        data.forEach((u) => {
            if (u && u.type === 'users') users.push(u);
        });
        const nextOffset = parseOffsetFromPageLink(json?.links?.next);
        if (nextOffset == null || data.length === 0 || nextOffset === offset) break;
        offset = nextOffset;
    }
    return users.slice(0, take);
}

async function flarumLoadPostsForFuzzy(maxItems = 200) {
    const take = typeof maxItems === 'number' && isFinite(maxItems) && maxItems > 0 ? Math.floor(maxItems) : 200;
    const pageLimit = 50;

    const posts = [];
    const includedByKey = new Map();
    let offset = 0;
    let pageGuard = 0;
    while (posts.length < take && pageGuard < 8) {
        pageGuard += 1;
        const json = await flarumRequest(
            `/posts?sort=-createdAt&page[limit]=${pageLimit}&page[offset]=${offset}&include=discussion,user`,
            { auth: false }
        );
        const data = Array.isArray(json?.data) ? json.data : [];
        const included = Array.isArray(json?.included) ? json.included : [];
        data.forEach((p) => {
            if (p && p.type === 'posts' && !isPrivatePostResource(p, included)) posts.push(p);
        });
        included.forEach((x) => {
            if (!x || x.id == null || !x.type) return;
            includedByKey.set(`${x.type}:${x.id}`, x);
        });
        const nextOffset = parseOffsetFromPageLink(json?.links?.next);
        if (nextOffset == null || data.length === 0 || nextOffset === offset) break;
        offset = nextOffset;
    }
    return { posts: posts.slice(0, take), included: Array.from(includedByKey.values()) };
}

function getSearchIntent(raw) {
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (!s) return { type: 'empty', value: '' };
    if (s.startsWith('@') && s.length > 1) return { type: 'user', value: s.slice(1).trim() };
    if (/^user\s*:/i.test(s)) return { type: 'user', value: s.replace(/^user\s*:/i, '').trim() };
    return { type: 'discussion', value: s };
}

function parseSearchRequest(raw) {
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (!s) return { mode: 'empty', query: '' };

    if (s.startsWith('@') && s.length > 1) return { mode: 'user', query: s.slice(1).trim() };
    if (/^user\s*:/i.test(s)) return { mode: 'user', query: s.replace(/^user\s*:/i, '').trim() };
    if (/^(title|标题)\s*:/i.test(s)) return { mode: 'discussion', query: s.replace(/^(title|标题)\s*:/i, '').trim() };
    if (/^(content|post|正文|内容)\s*:/i.test(s)) return { mode: 'post', query: s.replace(/^(content|post|正文|内容)\s*:/i, '').trim() };

    return { mode: 'post', query: s };
}

function getKeywordTokens(raw) {
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (!text) return [];
    return text.split(/\s+/).map((x) => x.trim()).filter(Boolean);
}

function matchesAllTokens(haystack, tokens) {
    const h = typeof haystack === 'string' ? haystack.toLowerCase() : '';
    if (!tokens || tokens.length === 0) return false;
    return tokens.every((t) => h.includes(String(t).toLowerCase()));
}

function stripHtmlToText(rawHtml) {
    const raw = typeof rawHtml === 'string' ? rawHtml : '';
    return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isDeletedPostResource(post) {
    const attrs = post?.attributes || {};
    if (attrs.isHidden === true) return true;
    if (attrs.hiddenAt || attrs.deletedAt) return true;

    const text = stripHtmlToText(attrs.contentHtml || attrs.content || '').toLowerCase();
    if (!text) return false;
    if (text.includes('[deleted')) return true;
    if (text.includes('deletedby') || text.includes('deletedat')) return true;
    if (text.includes('内容已被删除') || text.includes('该帖已被删除')) return true;
    return false;
}

function buildHighlightedSnippetHtml(text, tokens, maxLen = 60) {
    const raw = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
    if (!raw) return '';
    const uniqTokens = Array.from(new Set((tokens || []).map((t) => String(t).trim()).filter(Boolean)));

    const lower = raw.toLowerCase();
    let hitIndex = -1;
    for (const t of uniqTokens) {
        const idx = lower.indexOf(t.toLowerCase());
        if (idx >= 0 && (hitIndex === -1 || idx < hitIndex)) hitIndex = idx;
    }

    const windowBefore = 20;
    const start = Math.max(0, (hitIndex >= 0 ? hitIndex - windowBefore : 0));
    const end = Math.min(raw.length, start + maxLen);
    const snippet = raw.slice(start, end);
    const prefix = start > 0 ? '…' : '';
    const suffix = end < raw.length ? '…' : '';

    let escaped = escapeHtml(snippet);
    uniqTokens.forEach((t) => {
        const pattern = escapeRegExp(escapeHtml(t));
        if (!pattern) return;
        escaped = escaped.replace(new RegExp(pattern, 'gi'), '<span class="hl">$&</span>');
    });

    return `${escapeHtml(prefix)}${escaped}${escapeHtml(suffix)}`;
}

async function flarumLoadRecentDiscussionsForFuzzy(maxItems = 300) {
    const take = typeof maxItems === 'number' && isFinite(maxItems) && maxItems > 0 ? Math.floor(maxItems) : 300;
    const pageLimit = 50;

    const discussions = [];
    const userById = new Map();

    let offset = 0;
    while (discussions.length < take) {
        const filterQ = encodeURIComponent(buildPublicDiscussionFilterQuery());
        const json = await flarumRequest(`/discussions?sort=-createdAt&page[limit]=${pageLimit}&page[offset]=${offset}&include=user&filter[q]=${filterQ}`, { auth: false });
        const data = Array.isArray(json?.data) ? json.data : [];
        const included = Array.isArray(json?.included) ? json.included : [];

        data.forEach((d) => {
            if (d && d.type === 'discussions' && !isPrivateDiscussionResource(d)) discussions.push(d);
        });

        included.forEach((x) => {
            if (x && x.type === 'users' && x.id != null) userById.set(String(x.id), x);
        });

        const nextOffset = parseOffsetFromPageLink(json?.links?.next);
        if (nextOffset == null || data.length === 0) break;
        offset = nextOffset;
    }

    return {
        discussions: discussions.slice(0, take),
        included: Array.from(userById.values())
    };
}

function setupSearchBoxes() {
    const boxes = document.querySelectorAll('.search-box');
    if (!boxes || boxes.length === 0) return;

    boxes.forEach((box) => {
        if (!box) return;
        if (box.dataset && box.dataset.boundSearch === '1') return;

        const input = box.querySelector('input');
        const button = box.querySelector('button');
        if (!input || !button) return;

        const submit = () => {
            const q = String(input.value || '').trim();
            if (!q) {
                alert('请输入关键词');
                input.focus();
                return;
            }
            window.location.href = `search.html?q=${encodeURIComponent(q)}`;
        };

        button.addEventListener('click', (e) => {
            e.preventDefault();
            submit();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submit();
            }
        });

        if (box.dataset) box.dataset.boundSearch = '1';
    });
}

async function renderAllPostsPage() {
    const wrap = document.getElementById('all-posts-table-wrap');
    const meta = document.getElementById('all-posts-meta');
    const errorBox = document.getElementById('all-posts-error');
    const sortFieldEl = document.getElementById('all-posts-sort-field');
    const sortOrderEl = document.getElementById('all-posts-sort-order');
    const prevBtn = document.getElementById('all-posts-prev');
    const nextBtn = document.getElementById('all-posts-next');

    if (!wrap || !sortFieldEl || !sortOrderEl || !prevBtn || !nextBtn) return;
    let keepControlsDisabled = false;

    if (!isFlarumConfigured()) {
        wrap.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">论坛后端未配置</div>';
        return;
    }

    const showAllPostsAccessState = (message, actionLabel) => {
        keepControlsDisabled = true;
        const safeMessage = escapeHtml(String(message || ''));
        const safeActionLabel = escapeHtml(String(actionLabel || '立即登录'));
        wrap.innerHTML = `
            <div style="padding: 24px; text-align: center; color: #666;">
                <div style="margin-bottom: 12px;">${safeMessage}</div>
                <a href="login.html?redirect=${encodeURIComponent(window.location.href)}" style="color: #0066cc; text-decoration: none;">${safeActionLabel}</a>
            </div>
        `;
        if (meta) meta.textContent = '全部帖子页仅对已登录用户开放';
        if (errorBox) {
            errorBox.style.display = 'none';
            errorBox.textContent = '';
        }
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        sortFieldEl.disabled = true;
        sortOrderEl.disabled = true;
    };

    const currentToken = getFlarumToken();
    const currentUserId = localStorage.getItem('flarumUserId');
    if (!currentToken || !currentUserId) {
        showAllPostsAccessState('请先登录后查看全部帖子', '立即登录');
        return;
    }

    const state = window.allPostsState || {
        sortField: 'createdAt',
        sortOrder: 'desc',
        offset: 0,
        limit: 15,
        nextOffset: null,
        prevOffset: null
    };
    window.allPostsState = state;

    if (typeof state.sortField === 'string') sortFieldEl.value = state.sortField;
    if (typeof state.sortOrder === 'string') sortOrderEl.value = state.sortOrder;

    const disableControls = (disabled) => {
        prevBtn.disabled = disabled;
        nextBtn.disabled = disabled;
        sortFieldEl.disabled = disabled;
        sortOrderEl.disabled = disabled;
    };

    disableControls(true);
    if (errorBox) {
        errorBox.style.display = 'none';
        errorBox.textContent = '';
    }
    wrap.innerHTML = '<div style="padding: 20px; text-align: center;">加载中...</div>';
    if (meta) meta.textContent = '每页最多 15 条';

    try {
        // 先验证当前登录态有效，避免本地残留 token 导致权限状态倒置。
        await flarumRequest(`/users/${encodeURIComponent(String(currentUserId))}`, { auth: true });

        const { json, usedFallbackSort } = await flarumLoadAllDiscussionsPage({
            sortField: state.sortField,
            sortOrder: state.sortOrder,
            offset: state.offset,
            limit: state.limit,
            filterQ: ''
        });

        const discussions = filterPublicDiscussions(Array.isArray(json?.data) ? json.data : []);
        const included = json?.included || [];
        state.prevOffset = parseOffsetFromPageLink(json?.links?.prev);
        state.nextOffset = parseOffsetFromPageLink(json?.links?.next);

        const rows = discussions.map((d) => {
            const userId = d.relationships?.user?.data?.id;
            const user = userId ? pickIncluded(included, 'users', userId) : null;
            const title = d.attributes?.title || '';
            const createdAt = d.attributes?.createdAt || '';
            const commentCount = typeof d.attributes?.commentCount === 'number' ? d.attributes.commentCount : 0;
            const viewCount = getDiscussionViewCount(d.attributes);
            const author = getPreferredDisplayName(user?.attributes);
            const authorHtml = buildUserLinkHtml(userId, author);

            return `
                <tr>
                    <td style="width: 42%;"><a href="post.html?id=${encodeURIComponent(d.id)}">${escapeHtml(title || '无标题')}</a></td>
                    <td style="width: 14%;">${authorHtml || ''}</td>
                    <td style="width: 16%;">${escapeHtml(formatFlarumTime(createdAt).slice(0, 16))}</td>
                    <td style="width: 14%;">${commentCount}</td>
                    <td style="width: 14%;">${formatViewCount(viewCount)}</td>
                </tr>
            `;
        }).join('');

        wrap.innerHTML = `
            <table class="posts-table">
                <thead>
                    <tr>
                        <th>标题</th>
                        <th>作者</th>
                        <th>发布时间</th>
                        <th>回复</th>
                        <th>浏览</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #666;">暂无帖子</td></tr>`}
                </tbody>
            </table>
        `;

        const pageNumber = Math.floor(state.offset / state.limit) + 1;
        if (meta) {
            meta.textContent = usedFallbackSort && state.sortField === 'views'
                ? `第 ${pageNumber} 页，每页最多 15 条（浏览量排序暂不可用，已按发布时间显示）`
                : `第 ${pageNumber} 页，每页最多 15 条`;
        }

        prevBtn.disabled = state.prevOffset == null;
        nextBtn.disabled = state.nextOffset == null;

        sortFieldEl.onchange = () => {
            state.sortField = sortFieldEl.value === 'views' ? 'views' : 'createdAt';
            state.offset = 0;
            renderAllPostsPage();
        };
        sortOrderEl.onchange = () => {
            state.sortOrder = sortOrderEl.value === 'asc' ? 'asc' : 'desc';
            state.offset = 0;
            renderAllPostsPage();
        };
        prevBtn.onclick = () => {
            if (state.prevOffset == null) return;
            state.offset = state.prevOffset;
            renderAllPostsPage();
        };
        nextBtn.onclick = () => {
            if (state.nextOffset == null) return;
            state.offset = state.nextOffset;
            renderAllPostsPage();
        };
    } catch (error) {
        if (error && (error.httpStatus === 401 || error.httpStatus === 403)) {
            clearFlarumToken();
            showAllPostsAccessState('当前登录状态已失效或没有查看全部帖子的权限，请重新登录后再试', '重新登录');
            return;
        }
        const friendlyMessage = getFriendlyErrorMessage(error, '加载全部帖子');
        if (errorBox) {
            errorBox.textContent = friendlyMessage || '加载失败，请稍后再试。';
            errorBox.style.display = 'block';
        }
        wrap.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">加载失败</div>';
    } finally {
        if (!keepControlsDisabled) {
            disableControls(false);
        }
    }
}

async function renderSearchPage() {
    const meta = document.getElementById('search-meta');
    const errorBox = document.getElementById('search-error');

    const discussionWrap = document.getElementById('search-discussions-wrap');
    const discussionInfo = document.getElementById('search-discussions-info');
    const discussionPrev = document.getElementById('search-discussions-prev');
    const discussionNext = document.getElementById('search-discussions-next');

    const postWrap = document.getElementById('search-posts-wrap');
    const postInfo = document.getElementById('search-posts-info');
    const postPrev = document.getElementById('search-posts-prev');
    const postNext = document.getElementById('search-posts-next');

    const userWrap = document.getElementById('search-users-wrap');
    const userInfo = document.getElementById('search-users-info');
    const userPrev = document.getElementById('search-users-prev');
    const userNext = document.getElementById('search-users-next');

    if (!meta || !discussionWrap || !postWrap || !userWrap) return;

    if (!isFlarumConfigured()) {
        meta.textContent = '论坛后端未配置';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const q = String(urlParams.get('q') || '').trim();
    document.title = q ? `搜索 - ${q}` : '搜索 - 红蜻蜓论坛';

    if (!q) {
        meta.textContent = '请输入关键词后搜索';
        discussionWrap.innerHTML = '<div style="padding: 12px; color: #666;">暂无搜索关键词</div>';
        postWrap.innerHTML = '<div style="padding: 12px; color: #666;">暂无搜索关键词</div>';
        userWrap.innerHTML = '<div style="padding: 12px; color: #666;">暂无搜索关键词</div>';
        return;
    }

    meta.textContent = `关键词：${q}`;
    if (errorBox) {
        errorBox.style.display = 'none';
        errorBox.textContent = '';
    }

    const state = window.searchState || {
        q: '',
        limit: 15,
        discussionsOffset: 0,
        postsOffset: 0,
        usersOffset: 0,
        discussionsPrev: null,
        discussionsNext: null,
        discussionsLast: null,
        postsPrev: null,
        postsNext: null,
        postsLast: null,
        usersPrev: null,
        usersNext: null,
        usersLast: null,
        discussionsFuzzyMode: false,
        discussionsFuzzyList: null,
        discussionsFuzzyIncluded: null,
        usersFuzzyMode: false,
        usersFuzzyList: null,
        postsFuzzyMode: false,
        postsFuzzyList: null,
        postsFuzzyIncluded: null
    };
    window.searchState = state;

    if (state.q !== q) {
        state.q = q;
        state.discussionsOffset = 0;
        state.postsOffset = 0;
        state.usersOffset = 0;
        state.discussionsFuzzyMode = false;
        state.discussionsFuzzyList = null;
        state.discussionsFuzzyIncluded = null;
        state.usersFuzzyMode = false;
        state.usersFuzzyList = null;
        state.postsFuzzyMode = false;
        state.postsFuzzyList = null;
        state.postsFuzzyIncluded = null;
    }

    discussionWrap.innerHTML = '<div style="padding: 12px; color: #666;">加载中...</div>';
    postWrap.innerHTML = '<div style="padding: 12px; color: #666;">加载中...</div>';
    userWrap.innerHTML = '<div style="padding: 12px; color: #666;">加载中...</div>';

    const safeEnable = (btn, enabled) => {
        if (!btn) return;
        btn.disabled = !enabled;
    };

    safeEnable(discussionPrev, false);
    safeEnable(discussionNext, false);
    safeEnable(postPrev, false);
    safeEnable(postNext, false);
    safeEnable(userPrev, false);
    safeEnable(userNext, false);

    const tokens = getKeywordTokens(q);

    const renderDiscussions = async () => {
        let discussions = [];
        let included = [];
        let usingFuzzy = false;
        let fuzzySourceCount = 0;

        if (!state.discussionsFuzzyMode) {
            const { json } = await flarumLoadDiscussionsSearchPage({
                query: q,
                offset: state.discussionsOffset,
                limit: state.limit,
                sortOrder: 'desc'
            });

            included = Array.isArray(json?.included) ? json.included : [];
            discussions = filterPublicDiscussions(Array.isArray(json?.data) ? json.data : []);
            state.discussionsPrev = parseOffsetFromPageLink(json?.links?.prev);
            state.discussionsNext = parseOffsetFromPageLink(json?.links?.next);
            state.discussionsLast = parseOffsetFromPageLink(json?.links?.last);

            if (tokens.length > 0) {
                discussions = discussions.filter((d) => matchesAllTokens(d?.attributes?.title || '', tokens));
            }

            if (discussions.length === 0 && tokens.length > 0) {
                const fuzzy = await flarumLoadDiscussionsForFuzzy(200);
                const filtered = fuzzy.discussions.filter((d) => matchesAllTokens(d?.attributes?.title || '', tokens));
                state.discussionsFuzzyMode = true;
                state.discussionsFuzzyList = filtered;
                state.discussionsFuzzyIncluded = fuzzy.included;
            }
        }

        if (state.discussionsFuzzyMode && Array.isArray(state.discussionsFuzzyList)) {
            usingFuzzy = true;
            fuzzySourceCount = state.discussionsFuzzyList.length;
            included = Array.isArray(state.discussionsFuzzyIncluded) ? state.discussionsFuzzyIncluded : [];
            const total = state.discussionsFuzzyList.length;
            const start = state.discussionsOffset;
            const end = Math.min(start + state.limit, total);
            discussions = state.discussionsFuzzyList.slice(start, end);
            state.discussionsPrev = start - state.limit >= 0 ? start - state.limit : null;
            state.discussionsNext = start + state.limit < total ? start + state.limit : null;
            state.discussionsLast = total > 0 ? Math.max(0, Math.floor((total - 1) / state.limit) * state.limit) : 0;
        }

        const rows = discussions.map((d) => {
            const userId = d.relationships?.user?.data?.id;
            const user = userId ? pickIncluded(included, 'users', userId) : null;
            const title = d.attributes?.title || '';
            const createdAt = d.attributes?.createdAt || '';
            const commentCount = typeof d.attributes?.commentCount === 'number' ? d.attributes.commentCount : 0;
            const viewCount = getDiscussionViewCount(d.attributes);
            const author = getPreferredDisplayName(user?.attributes);
            const authorHtml = buildUserLinkHtml(userId, author);

            return `
                <tr>
                    <td style="width: 44%;"><a href="post.html?id=${encodeURIComponent(d.id)}">${escapeHtml(title || '无标题')}</a></td>
                    <td style="width: 14%;">${authorHtml || ''}</td>
                    <td style="width: 16%;">${escapeHtml(formatFlarumTime(createdAt).slice(0, 16))}</td>
                    <td style="width: 12%;">${commentCount}</td>
                    <td style="width: 14%;">${formatViewCount(viewCount)}</td>
                </tr>
            `;
        }).join('');

        discussionWrap.innerHTML = `
            <table class="posts-table">
                <thead>
                    <tr>
                        <th>标题</th>
                        <th>作者</th>
                        <th>时间</th>
                        <th>回复</th>
                        <th>浏览</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #666;">暂无结果</td></tr>`}
                </tbody>
            </table>
        `;

        if (discussionInfo) {
            const pageNumber = Math.floor(state.discussionsOffset / state.limit) + 1;
            const totalPages = usingFuzzy && Array.isArray(state.discussionsFuzzyList)
                ? Math.max(1, Math.ceil(state.discussionsFuzzyList.length / state.limit))
                : (() => {
                    const lastOffset = state.discussionsLast;
                    if (lastOffset == null) return (state.discussionsPrev == null && state.discussionsNext == null) ? 1 : null;
                    return Math.floor(lastOffset / state.limit) + 1;
                })();
            const suffix = usingFuzzy ? `（标题匹配范围：${fuzzySourceCount} 帖）` : '';
            discussionInfo.textContent = `第 ${pageNumber} 页 / 共 ${totalPages == null ? '?' : totalPages} 页，每页最多 15 条${suffix}`;
        }

        safeEnable(discussionPrev, state.discussionsPrev != null);
        safeEnable(discussionNext, state.discussionsNext != null);
        if (discussionPrev) {
            discussionPrev.onclick = () => {
                if (state.discussionsPrev == null) return;
                state.discussionsOffset = state.discussionsPrev;
                renderSearchPage();
            };
        }
        if (discussionNext) {
            discussionNext.onclick = () => {
                if (state.discussionsNext == null) return;
                state.discussionsOffset = state.discussionsNext;
                renderSearchPage();
            };
        }
    };

    const renderPosts = async () => {
        let posts = [];
        let included = [];

        if (!state.postsFuzzyMode) {
            const { json } = await flarumLoadPostsSearchPage({
                query: q,
                offset: state.postsOffset,
                limit: state.limit,
                sortOrder: 'desc'
            });
            included = Array.isArray(json?.included) ? json.included : [];
            posts = filterPublicPosts(Array.isArray(json?.data) ? json.data : [], included)
                .filter((p) => !isDeletedPostResource(p));
            state.postsPrev = parseOffsetFromPageLink(json?.links?.prev);
            state.postsNext = parseOffsetFromPageLink(json?.links?.next);
            state.postsLast = parseOffsetFromPageLink(json?.links?.last);

            if (tokens.length > 0) {
                posts = posts.filter((p) => {
                    const text = stripHtmlToText(p?.attributes?.contentHtml || p?.attributes?.content || '');
                    return matchesAllTokens(text, tokens);
                });
            }

            if (posts.length === 0 && tokens.length > 0) {
                const fuzzy = await flarumLoadPostsForFuzzy(200);
                const filtered = fuzzy.posts
                    .filter((p) => !isPrivatePostResource(p, fuzzy.included))
                    .filter((p) => !isDeletedPostResource(p))
                    .filter((p) => {
                        const text = stripHtmlToText(p?.attributes?.contentHtml || p?.attributes?.content || '');
                        return matchesAllTokens(text, tokens);
                    });
                state.postsFuzzyMode = true;
                state.postsFuzzyList = filtered;
                state.postsFuzzyIncluded = fuzzy.included;
            }
        }

        if (state.postsFuzzyMode && Array.isArray(state.postsFuzzyList)) {
            const total = state.postsFuzzyList.length;
            const start = state.postsOffset;
            const end = Math.min(start + state.limit, total);
            posts = state.postsFuzzyList.slice(start, end);
            included = Array.isArray(state.postsFuzzyIncluded) ? state.postsFuzzyIncluded : [];
            state.postsPrev = start - state.limit >= 0 ? start - state.limit : null;
            state.postsNext = start + state.limit < total ? start + state.limit : null;
        }

        const rows = posts.map((p) => {
            const discussionId = p.relationships?.discussion?.data?.id;
            const discussion = discussionId ? pickIncluded(included, 'discussions', discussionId) : null;
            const discussionTitle = discussion?.attributes?.title || '所属帖子';
            const floor = typeof p.attributes?.number === 'number' ? p.attributes.number : 1;
            const createdAt = p.attributes?.createdAt || '';
            const html = p.attributes?.contentHtml || p.attributes?.content || '';
            const text = stripHtmlToText(html);
            const previewHtml = buildHighlightedSnippetHtml(text, tokens, 60) || escapeHtml('无内容');
            const userId = p.relationships?.user?.data?.id;
            const user = userId ? pickIncluded(included, 'users', userId) : null;
            const author = getPreferredDisplayName(user?.attributes);
            const authorHtml = buildUserLinkHtml(userId, author);
            const href = discussionId ? buildPostFloorLink(discussionId, floor) : '#';

            return `
                <tr>
                    <td style="width: 34%;"><a href="${href}">${previewHtml}</a></td>
                    <td style="width: 14%;">${authorHtml || ''}</td>
                    <td style="width: 16%;">${escapeHtml(formatFlarumTime(createdAt).slice(0, 16))}</td>
                    <td style="width: 36%;"><a href="post.html?id=${encodeURIComponent(discussionId)}">${escapeHtml(discussionTitle)}</a></td>
                </tr>
            `;
        }).join('');

        postWrap.innerHTML = `
            <table class="posts-table">
                <thead>
                    <tr>
                        <th>匹配内容</th>
                        <th>作者</th>
                        <th>时间</th>
                        <th>帖子标题</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #666;">暂无结果</td></tr>`}
                </tbody>
            </table>
        `;

        if (postInfo) {
            const pageNumber = Math.floor(state.postsOffset / state.limit) + 1;
            const suffix = state.postsFuzzyMode ? '（关键词匹配范围：最近 200 楼）' : '';
            const totalPages = state.postsFuzzyMode && Array.isArray(state.postsFuzzyList)
                ? Math.max(1, Math.ceil(state.postsFuzzyList.length / state.limit))
                : (() => {
                    const lastOffset = state.postsLast;
                    if (lastOffset == null) return (state.postsPrev == null && state.postsNext == null) ? 1 : null;
                    return Math.floor(lastOffset / state.limit) + 1;
                })();
            postInfo.textContent = `第 ${pageNumber} 页 / 共 ${totalPages == null ? '?' : totalPages} 页，每页最多 15 条${suffix}`;
        }

        safeEnable(postPrev, state.postsPrev != null);
        safeEnable(postNext, state.postsNext != null);
        if (postPrev) {
            postPrev.onclick = () => {
                if (state.postsPrev == null) return;
                state.postsOffset = state.postsPrev;
                renderSearchPage();
            };
        }
        if (postNext) {
            postNext.onclick = () => {
                if (state.postsNext == null) return;
                state.postsOffset = state.postsNext;
                renderSearchPage();
            };
        }
    };

    const renderUsers = async () => {
        let users = [];
        let usingFuzzy = false;
        let fuzzySourceCount = 0;

        if (!state.usersFuzzyMode) {
            const { json } = await flarumLoadUsersPage({
                query: q,
                offset: state.usersOffset,
                limit: state.limit
            });
            users = Array.isArray(json?.data) ? json.data : [];
            state.usersPrev = parseOffsetFromPageLink(json?.links?.prev);
            state.usersNext = parseOffsetFromPageLink(json?.links?.next);
            state.usersLast = parseOffsetFromPageLink(json?.links?.last);

            if (users.length === 0 && tokens.length > 0) {
                const fuzzyUsers = await flarumLoadUsersForFuzzy(200);
                const filtered = fuzzyUsers.filter((u) => {
                    const attrs = u?.attributes || {};
                    const displayName = getPreferredDisplayName(attrs, attrs.username || '');
                    const nickname = typeof attrs.nickname === 'string' ? attrs.nickname : '';
                    const username = typeof attrs.username === 'string' ? attrs.username : '';
                    return matchesAllTokens(`${displayName} ${nickname} ${username}`, tokens);
                });
                state.usersFuzzyMode = true;
                state.usersFuzzyList = filtered;
            }
        }

        if (state.usersFuzzyMode && Array.isArray(state.usersFuzzyList)) {
            usingFuzzy = true;
            fuzzySourceCount = state.usersFuzzyList.length;
            const total = state.usersFuzzyList.length;
            const start = state.usersOffset;
            const end = Math.min(start + state.limit, total);
            users = state.usersFuzzyList.slice(start, end);
            state.usersPrev = start - state.limit >= 0 ? start - state.limit : null;
            state.usersNext = start + state.limit < total ? start + state.limit : null;
        }

        const rows = users.map((u) => {
            const attributes = u?.attributes || {};
            const displayName = getPreferredDisplayName(attributes, attributes.username || '');
            const avatarUrl = getUserAvatarUrl(u);
            const points = getUserPoints(attributes);
            const joined = attributes.joinTime || attributes.createdAt || attributes.joinedAt || '';
            const joinedText = joined ? formatFlarumTime(joined).slice(0, 10) : '-';

            return `
                <tr>
                    <td style="width: 44%;">
                        <a href="${buildUserProfileHref(u.id)}" style="display:flex; align-items:center; gap:8px;">
                            <img src="${avatarUrl}" alt="avatar" style="width:24px; height:24px; border-radius:3px; border:1px solid #ccc; object-fit:cover;">
                            <span>${escapeHtml(displayName || '')}</span>
                        </a>
                    </td>
                    <td style="width: 20%;">${escapeHtml(attributes.username || '')}</td>
                    <td style="width: 16%;">${points == null ? '-' : escapeHtml(String(points))}</td>
                    <td style="width: 20%;">${escapeHtml(joinedText)}</td>
                </tr>
            `;
        }).join('');

        userWrap.innerHTML = `
            <table class="posts-table">
                <thead>
                    <tr>
                        <th>用户</th>
                        <th>用户名</th>
                        <th>积分</th>
                        <th>加入</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #666;">暂无结果</td></tr>`}
                </tbody>
            </table>
        `;

        if (userInfo) {
            const pageNumber = Math.floor(state.usersOffset / state.limit) + 1;
            const suffix = usingFuzzy ? `（昵称匹配范围：${fuzzySourceCount} 人）` : '';
            const totalPages = usingFuzzy && Array.isArray(state.usersFuzzyList)
                ? Math.max(1, Math.ceil(state.usersFuzzyList.length / state.limit))
                : (() => {
                    const lastOffset = state.usersLast;
                    if (lastOffset == null) return (state.usersPrev == null && state.usersNext == null) ? 1 : null;
                    return Math.floor(lastOffset / state.limit) + 1;
                })();
            userInfo.textContent = `第 ${pageNumber} 页 / 共 ${totalPages == null ? '?' : totalPages} 页，每页最多 15 条${suffix}`;
        }

        safeEnable(userPrev, state.usersPrev != null);
        safeEnable(userNext, state.usersNext != null);
        if (userPrev) {
            userPrev.onclick = () => {
                if (state.usersPrev == null) return;
                state.usersOffset = state.usersPrev;
                renderSearchPage();
            };
        }
        if (userNext) {
            userNext.onclick = () => {
                if (state.usersNext == null) return;
                state.usersOffset = state.usersNext;
                renderSearchPage();
            };
        }
    };

    const sectionTasks = [
        { key: 'discussions', label: '帖子搜索', wrap: discussionWrap, run: renderDiscussions },
        { key: 'posts', label: '楼层搜索', wrap: postWrap, run: renderPosts },
        { key: 'users', label: '用户搜索', wrap: userWrap, run: renderUsers }
    ];

    const results = await Promise.allSettled(sectionTasks.map((task) => task.run()));
    const failedTasks = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') return;

        const task = sectionTasks[index];
        failedTasks.push({
            label: task.label,
            error: result.reason
        });

        if (task.wrap) {
            task.wrap.innerHTML = `<div style="padding: 12px; color: #666;">${escapeHtml(task.label)}暂时无法加载，请稍后再试。</div>`;
        }
    });

    if (errorBox) {
        if (failedTasks.length > 0) {
            const loadedCount = sectionTasks.length - failedTasks.length;
            const labels = failedTasks.map((item) => item.label).join('、');
            errorBox.textContent = loadedCount > 0
                ? `部分搜索结果暂时未加载完成，已显示可用内容。未加载分区：${labels}。`
                : '搜索暂时不可用，请稍后再试。';
            errorBox.style.display = 'block';
        } else {
            errorBox.style.display = 'none';
            errorBox.textContent = '';
        }
    }
}

function renderTopicListMessage(listEl, message) {
    if (!listEl) return;
    const safeMessage = String(message || '暂无内容').trim() || '暂无内容';
    listEl.innerHTML = `<li><span>${escapeHtml(safeMessage)}</span></li>`;
}

function renderDiscussionLinksIntoList(listEl, discussions, options = {}) {
    if (!listEl) return;

    const emptyText = String(options?.emptyText || '暂无帖子').trim() || '暂无帖子';
    const safeList = (Array.isArray(discussions) ? discussions : [])
        .filter((item) => item && item.id != null && String(item.title || '').trim());

    if (safeList.length === 0) {
        renderTopicListMessage(listEl, emptyText);
        return;
    }

    listEl.innerHTML = safeList.map((item) => (
        `<li><a href="post.html?id=${encodeURIComponent(item.id)}">${escapeHtml(String(item.title || ''))}</a></li>`
    )).join('');
}

// 动态加载首页热帖和近期帖子链接
async function renderDynamicHomeLinks() {
    const hotTopicsList = document.getElementById('hot-topics-list');
    const recentHotList = document.getElementById('recent-hot-list');

    if (!hotTopicsList && !recentHotList) {
        return;
    }

    try {
        const discussions = await flarumLoadDiscussionList({ throwOnError: true });

        if (hotTopicsList) {
            // 固定置顶帖标题
            const pin1Title = '红蜻蜓论坛·版务公告';
            const pin2Title = '关于开展“拒绝黄赌毒、共建平安社区”宣传教育活动的通知';
            const hotTitle = '求助帖，真实经历，感觉自己被脑控了';
            const pin2Id = 6;
            const hotId = 4;
            
            // 从API数据中找到对应的帖子
            let pin2Post = discussions.find((d) => Number(d.id) === Number(pin2Id)) || discussions.find(d => d.title.includes(pin2Title) || d.title.includes('拒绝黄赌毒'));
            let hotPost = discussions.find((d) => Number(d.id) === Number(hotId)) || discussions.find(d => d.title.includes(hotTitle) || d.title.includes('脑控') || d.title.includes('脑控了'));

            const fetchOneDiscussionById = async (id) => {
                const targetId = id == null ? '' : String(id).trim();
                if (!targetId) return null;
                const readOne = async (withAuth) => {
                    const json = await flarumRequest(
                        `/discussions/${encodeURIComponent(targetId)}?include=user`,
                        { auth: withAuth === true ? true : false }
                    );
                    const d = json?.data && json.data.type === 'discussions' ? json.data : null;
                    if (!d || d.attributes?.isPrivateDiscussion === true) return null;
                    return {
                        id: Number(d.id),
                        title: String(d.attributes?.title || ''),
                        views: getDiscussionViewCount(d.attributes),
                        author: '',
                        date: formatFlarumTime(String(d.attributes?.createdAt || '')).slice(0, 10)
                    };
                };

                try {
                    return await readOne(false);
                } catch (_) {
                    if (getFlarumToken()) {
                        try {
                            return await readOne(true);
                        } catch (_) {}
                    }
                }
                return null;
            };

            if (!pin2Post) pin2Post = await fetchOneDiscussionById(pin2Id);
            if (!hotPost) hotPost = await fetchOneDiscussionById(hotId);
            
            // 过滤掉已固定的帖子，用于填充其他位置
            const remainingDiscussions = discussions.filter((d) => Number(d.id) !== Number(pin2Id) && Number(d.id) !== Number(hotId));

            const rankedDiscussions = remainingDiscussions
                .slice()
                .sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0) || (Number(b.id) || 0) - (Number(a.id) || 0));
            
            // 构建热帖榜（共12条）
            const hotTopics = [];
            const createTopicItem = (href, title, badgeClass = '', badgeText = '') => {
                const safeHref = String(href || '#');
                const safeTitle = escapeHtml(String(title || ''));
                const badgeHtml = badgeClass && badgeText
                    ? `<span class="${escapeHtml(badgeClass)}">${escapeHtml(badgeText)}</span>`
                    : '';
                return `<li>${badgeHtml}<a href="${safeHref}">${safeTitle}</a></li>`;
            };
            
            // 第1条：固定链接到违规公示
            hotTopics.push(createTopicItem('violation.html', pin1Title, 'pin-badge', '置顶'));
            
            // 第2条：固定置顶帖
            if (pin2Post) {
                hotTopics.push(createTopicItem(`post.html?id=${encodeURIComponent(pin2Post.id)}`, pin2Post.title, 'pin-badge', '置顶'));
            }
            
            let rankedIndex = 0;
            const appendRanked = (count) => {
                const safeCount = typeof count === 'number' && Number.isFinite(count) && count > 0 ? count : 0;
                for (let i = 0; i < safeCount && rankedIndex < rankedDiscussions.length; i++) {
                    const p = rankedDiscussions[rankedIndex++];
                    hotTopics.push(createTopicItem(`post.html?id=${encodeURIComponent(p.id)}`, p.title));
                }
            };
            
            // 第3-6条：按浏览量排行的普通帖子
            appendRanked(4);
            
            // 第7条：固定HOT帖
            if (hotPost) {
                hotTopics.push(createTopicItem(`post.html?id=${encodeURIComponent(hotPost.id)}`, hotPost.title, 'hot-badge', 'HOT'));
            }
            
            // 第8-12条：按浏览量排行的普通帖子
            appendRanked(5);
            
            while (hotTopics.length < 12 && rankedIndex < rankedDiscussions.length) {
                const p = rankedDiscussions[rankedIndex++];
                hotTopics.push(createTopicItem(`post.html?id=${encodeURIComponent(p.id)}`, p.title));
            }

            if (hotTopics.length === 1) {
                hotTopics.push('<li><span>暂无热帖</span></li>');
            }
            
            hotTopicsList.innerHTML = hotTopics.join('');
        }
        
        // 最新发帖/近期热帖：显示最新20个帖子，按日期顺序
        if (recentHotList) {
            renderDiscussionLinksIntoList(recentHotList, discussions.slice(0, 20), {
                emptyText: '暂无近期帖子'
            });
        }
    } catch (error) {
        console.warn('动态加载首页帖子列表失败:', error);
        if (hotTopicsList) {
            renderTopicListMessage(hotTopicsList, '热帖加载失败，请稍后刷新重试');
        }
        if (recentHotList) {
            renderTopicListMessage(recentHotList, '近期帖子加载失败，请稍后刷新重试');
        }
    }
}



async function flarumCreateDiscussion({ title, content, tagIds = [] }) {
    const token = getFlarumToken();
    if (!token) {
        throw createComposerValidationError('请先登录后再发帖。', [
            { field: 'auth', reason: '登录状态缺失，无法发帖' }
        ]);
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
        throw createComposerValidationError('请先登录后再回帖。', [
            { field: 'auth', reason: '登录状态缺失，无法回帖' }
        ]);
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

// 删除帖子（改为更新帖子内容为删除提示）
async function flarumDeletePost(postId, floor) {
    const token = getFlarumToken();
    if (!token) {
        alert('请先登录后再操作。');
        return false;
    }

    try {
        const currentUsername = localStorage.getItem('flarumUsername') || '匿名用户';
        const now = new Date();
        const deleteTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        
        // 构造删除提示内容（使用特殊标记便于识别）
        const deleteContent = `[DELETED]{"deletedBy":"${currentUsername}","deletedAt":"${deleteTime}"}[/DELETED]`;
        
        // 使用PATCH更新帖子内容，而不是DELETE删除
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
        console.error('删除帖子失败:', error);
        alert(getFriendlyErrorMessage(error, 'delete_post'));
        return false;
    }
}

// 检查并解析删除标记
function parseDeletedContent(content) {
    const deletedMatch = content.match(/\[DELETED\](\{.*?\})\[\/DELETED\]/);
    if (deletedMatch) {
        try {
            const deleteInfo = JSON.parse(deletedMatch[1]);
            return {
                deleted: true,
                deletedBy: deleteInfo.deletedBy || '匿名用户',
                deletedAt: deleteInfo.deletedAt || ''
            };
        } catch {
            return null;
        }
    }
    return null;
}

// 删除整个讨论（帖子）
async function flarumDeleteDiscussion(discussionId) {
    const token = getFlarumToken();
    if (!token) {
        alert('请先登录后再操作。');
        return false;
    }

    try {
        await flarumRequest(`/discussions/${discussionId}`, {
            method: 'DELETE',
            auth: true
        });
        return true;
    } catch (error) {
        console.error('删除讨论失败:', error);
        alert(getFriendlyErrorMessage(error, 'delete_discussion'));
        return false;
    }
}

// 检查用户是否有权限删除帖子
async function canDeletePost(post) {
    const token = getFlarumToken();
    if (!token) return false;
    
    const currentUserId = localStorage.getItem('flarumUserId');
    
    // 如果是自己的帖子，可以删除
    if (post.userId && currentUserId && String(post.userId) === String(currentUserId)) {
        return true;
    }
    
    // 检查是否是管理员或版主（简化处理）
    try {
        const userJson = await flarumRequest(`/users/${currentUserId}`, { auth: true });
        const groups = userJson?.data?.relationships?.groups?.data || [];
        // 检查是否在管理员或版主组
        const isAdminOrMod = groups.some(g => ['1', '2'].includes(g.id)); // 1=管理员, 2=版主
        return isAdminOrMod;
    } catch {
        return false;
    }
}

// 动态加载帖子数据
async function loadPostData(postId) {
    try {
        console.log('当前使用的是 Flarum API 版本 loadPostData');
        console.log('loadPostData: 开始加载帖子数据，postId:', postId);
        
        // 显示加载状态
        const threadContainer = document.getElementById('forum-thread');
        if (threadContainer) {
            threadContainer.innerHTML = '<div style="padding: 20px; text-align: center;">加载中...</div>';
        }
        
        if (isFlarumConfigured()) {
            console.log('loadPostData: 尝试从Flarum API加载帖子');
            const fromApi = await flarumLoadDiscussion(postId);
            console.log('loadPostData: Flarum API返回结果:', fromApi);
            if (fromApi) {
                console.log('loadPostData: 成功加载帖子数据');
                return fromApi;
            }
            
            // API 返回 null，表示加载失败
            throw new Error('无法从 Flarum API 加载帖子数据');
        }
        
        throw new Error('论坛后端未配置');
    } catch (error) {
        console.error('loadPostData: 加载帖子数据失败:', error);
        console.error('loadPostData: 错误详情:', error.detail);
        
        const threadContainer = document.getElementById('forum-thread');
        if (threadContainer) {
            const friendlyMessage = getFriendlyErrorMessage(error, 'load_discussion');
            threadContainer.innerHTML = `
                <div style="padding: 40px 20px; text-align: center;">
                    <p style="color: #cc0000; font-size: 16px; margin-bottom: 10px;">抱歉，加载此内容时出错</p>
                    <p style="color: #666; font-size: 14px;">${friendlyMessage}</p>
                </div>
            `;
        }
        return null;
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

function renderPostListIntoIndex(recentReplies) {
    const container = document.querySelector('.forum-posts');
    if (!container) return;

    const safeList = Array.isArray(recentReplies) ? recentReplies : [];

    // 截取字符串函数
    const truncate = (str, maxLength) => {
        if (!str) return '';
        const text = str.replace(/<[^>]*>/g, '').trim(); // 移除HTML标签
        return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
    };

    const buildReplyHref = (reply) => buildPostFloorLink(reply.discussionId, reply.floor);

    container.innerHTML = `
        <h3>最新回复</h3>
        <table class="posts-table">
            <thead>
                <tr>
                    <th style="width: 30%;">回帖内容</th>
                    <th style="width: 18%;">回帖人</th>
                    <th style="width: 17%;">时间</th>
                    <th style="width: 35%;">帖子标题</th>
                </tr>
            </thead>
            <tbody>
                ${safeList.length > 0 ? safeList.map((r) => `
                    <tr>
                        <td><a href="${buildReplyHref(r)}" style="color: #0066cc;">${truncate(r.content || '', 20)}</a></td>
                        <td>${r.author || ''}</td>
                        <td>${formatFlarumTime(r.time).slice(0, 16) || ''}</td>
                        <td><a href="post.html?id=${encodeURIComponent(r.discussionId)}">${truncate(r.title || '', 20)}</a></td>
                    </tr>
                `).join('') : `<tr><td colspan="4" style="text-align: center; padding: 20px;">暂无回复</td></tr>`}
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

        if (target && String(target.textContent || '').trim() === '服务') {
            e.preventDefault();
            alert('你还想要啥服务？');
            return;
        }

        if (target && target.getAttribute('href') === '#') {
            // 排除掉已经有特定功能的链接（如回复、取消回复、退出登录等）
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
    setupAuthReturnCapture();
    
    // 仅在页面存在对应挂载点时才拉取热帖数据，避免无关页面产生多余请求
    const hasDynamicTopicModule = !!document.getElementById('hot-topics-list') || !!document.getElementById('recent-hot-list');
    if (hasDynamicTopicModule) {
        if (isFlarumConfigured()) {
            console.log('Flarum API 配置已完成，正在加载热帖模块...');
            renderDynamicHomeLinks();
        } else {
            console.log('Flarum API 未配置');
            renderTopicListMessage(document.getElementById('hot-topics-list'), '热帖功能暂未开启');
            renderTopicListMessage(document.getElementById('recent-hot-list'), '近期帖子功能暂未开启');
        }
    }
    
    // 检查是否是帖子详情页面
    if (window.location.pathname.includes('post.html')) {
        // 更新用户链接状态（登录/注册按钮）
        updateUserLinks();
        loadPostDetailsFromJson();
        // 表单事件只绑定一次
        setupReplyForm();
        
        // 页面加载时检查登录状态，修改回复表单
        updateReplyFormForLoginStatus();
    }

    if (window.location.pathname.includes('all-posts.html')) {
        updateUserLinks();
        renderAllPostsPage();
    }

    if (window.location.pathname.includes('search.html')) {
        updateUserLinks();
        renderSearchPage();
    }

    if (window.location.pathname.includes('message.html')) {
        updateUserLinks();
        renderMessagePage();
    }

    if (document.querySelector('.forum-posts')) {
        flarumLoadRecentReplies().then(renderPostListIntoIndex).catch((error) => {
            console.error('加载最新回复失败:', error);
        });
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

    setupSearchBoxes();

    try {
        refreshShortMessagesEntry();
    } catch (_) {}

    try {
        setupStatusBarClock();
    } catch (_) {}
    
    // 将近期热帖滚动区域滚动到顶部
    const scrollableContent = document.querySelector('.scrollable-content');
    if (scrollableContent) {
        scrollableContent.scrollTop = 0;
    }
});

function parseFlarumIsoTime(value) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
}

function isDiscussionUnreadForActor(attributes) {
    const a = attributes || {};
    const lastPostedAt = parseFlarumIsoTime(a.lastPostedAt);
    if (!lastPostedAt) return false;
    const lastReadAt = parseFlarumIsoTime(a.lastReadAt);
    if (!lastReadAt) return true;
    return lastPostedAt.getTime() > lastReadAt.getTime();
}

function isPrivateDiscussionLocallyMarkedRead(state, discussionId, attributes) {
    const id = discussionId == null ? '' : String(discussionId);
    const marker = state?.privateReadMarkers?.[id];
    if (!id || !marker) return false;

    const currentPostNumber = Number(attributes?.lastPostNumber);
    const markerPostNumber = Number(marker?.lastReadPostNumber);
    if (Number.isFinite(currentPostNumber) && currentPostNumber > 0 && Number.isFinite(markerPostNumber) && markerPostNumber > 0) {
        return currentPostNumber <= markerPostNumber;
    }

    const currentPostedAt = parseFlarumIsoTime(attributes?.lastPostedAt);
    const markerReadAt = parseFlarumIsoTime(marker?.lastReadAt);
    if (currentPostedAt && markerReadAt) {
        return currentPostedAt.getTime() <= markerReadAt.getTime();
    }

    return false;
}

function rememberPrivateDiscussionRead(state, discussionId, attributes) {
    if (!state) return;
    const id = discussionId == null ? '' : String(discussionId);
    if (!id) return;
    if (!state.privateReadMarkers || typeof state.privateReadMarkers !== 'object') {
        state.privateReadMarkers = {};
    }
    state.privateReadMarkers[id] = {
        lastReadAt: attributes?.lastPostedAt || attributes?.createdAt || new Date().toISOString(),
        lastReadPostNumber: Number(attributes?.lastPostNumber) > 0 ? Number(attributes.lastPostNumber) : null
    };
    state.useLocalUnreadCounts = true;
}

async function flarumMarkPrivateDiscussionRead(discussionId, attributes) {
    const id = discussionId == null ? '' : String(discussionId);
    if (!id) return false;

    const lastReadPostNumber = Number(attributes?.lastPostNumber);
    const lastReadAt = typeof attributes?.lastPostedAt === 'string' && attributes.lastPostedAt.trim()
        ? attributes.lastPostedAt.trim()
        : null;
    const patchAttrs = {};

    if (Number.isFinite(lastReadPostNumber) && lastReadPostNumber > 0) {
        patchAttrs.lastReadPostNumber = Math.floor(lastReadPostNumber);
    }
    if (lastReadAt) {
        patchAttrs.lastReadAt = lastReadAt;
    }

    const candidates = [];
    if (Object.keys(patchAttrs).length > 0) {
        candidates.push({
            method: 'PATCH',
            path: `/discussions/${encodeURIComponent(id)}`,
            json: { data: { type: 'discussions', id, attributes: patchAttrs } }
        });
    }
    if (patchAttrs.lastReadPostNumber != null) {
        candidates.push({
            method: 'PATCH',
            path: `/discussions/${encodeURIComponent(id)}`,
            json: {
                data: {
                    type: 'discussions',
                    id,
                    attributes: { lastReadPostNumber: patchAttrs.lastReadPostNumber }
                }
            }
        });
    }
    candidates.push(
        { method: 'POST', path: `/discussions/${encodeURIComponent(id)}/read` },
        {
            method: 'POST',
            path: `/discussions/${encodeURIComponent(id)}/read`,
            json: { data: { type: 'discussions', id, attributes: patchAttrs } }
        }
    );

    for (const candidate of candidates) {
        try {
            await flarumRequest(candidate.path, {
                method: candidate.method,
                auth: true,
                ...(candidate.json ? { json: candidate.json } : {})
            });
            return true;
        } catch (_) {}
    }

    return false;
}

function buildMessageHrefForUserId(toUserId) {
    const id = toUserId == null ? '' : String(toUserId);
    const base = id ? `message.html?to=${encodeURIComponent(id)}` : 'message.html';
    if (getFlarumToken()) return base;
    return `login.html?redirect=${encodeURIComponent(base)}`;
}

function isAdminUserResource(user) {
    const groups = user?.relationships?.groups?.data || [];
    return Array.isArray(groups) && groups.some((g) => String(g?.id || '') === '1');
}

function isAllowedShortMessageRecipientUserId(userId) {
    const n = Number(userId);
    return Number.isFinite(n) && n > 0;
}

function buildUserSelectLabel(user) {
    const attrs = user?.attributes || {};
    const id = user?.id != null ? String(user.id) : '';
    const username = typeof attrs.username === 'string' ? attrs.username : '';
    const display = getPreferredDisplayName(attrs, username) || username || `用户${id || ''}`;
    const suffix = `(${username || '-'} / ID:${id || '-'})`;
    return `${display} ${suffix}`.trim();
}

async function flarumLoadUserById(userId) {
    const id = String(userId || '');
    if (!id) return null;
    const json = await flarumRequest(`/users/${encodeURIComponent(id)}?include=groups`, { auth: true });
    return json?.data || null;
}

async function flarumSearchUsers({ query, limit }) {
    const q = typeof query === 'string' ? query.trim() : '';
    const safeLimit = typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? Math.min(30, Math.floor(limit)) : 15;
    const url = q
        ? `/users?page[limit]=${safeLimit}&filter[q]=${encodeURIComponent(q)}&include=groups`
        : `/users?page[limit]=${safeLimit}&include=groups`;
    const json = await flarumRequest(url, { auth: true });
    return Array.isArray(json?.data) ? json.data : [];
}

async function flarumLoadUsersSortedPage({ offset, limit, sortCandidates }) {
    const safeLimit = typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? Math.min(120, Math.floor(limit)) : 60;
    const safeOffset = typeof offset === 'number' && Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;
    const candidates = Array.isArray(sortCandidates) && sortCandidates.length > 0
        ? sortCandidates
        : ['-id', '-joinedAt', '-lastSeenAt', 'id'];

    let lastError = null;
    for (const sort of candidates) {
        try {
            const json = await flarumRequest(`/users?sort=${encodeURIComponent(sort)}&page[limit]=${safeLimit}&page[offset]=${safeOffset}&include=groups`, { auth: true });
            return { json, usedSort: sort };
        } catch (error) {
            lastError = error;
        }
    }

    const json = await flarumRequest(`/users?page[limit]=${safeLimit}&page[offset]=${safeOffset}&include=groups`, { auth: true });
    return { json, usedSort: null, fallbackError: lastError };
}

function normalizeUserSearchText(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, '');
}

function userMatchesQueryFuzzy(user, query) {
    const q = normalizeUserSearchText(query);
    if (!q) return true;
    const id = user?.id != null ? String(user.id) : '';
    const attrs = user?.attributes || {};
    const username = typeof attrs.username === 'string' ? attrs.username : '';
    const display = buildUserSelectLabel(user);
    const haystack = normalizeUserSearchText(`${display} ${username} ${id}`);
    return haystack.includes(q);
}

function mergeUsersUnique(users) {
    const out = [];
    const seen = new Set();
    (Array.isArray(users) ? users : []).forEach((u) => {
        const id = u?.id != null ? String(u.id) : '';
        if (!id || seen.has(id)) return;
        seen.add(id);
        out.push(u);
    });
    return out;
}

function isPrivateDiscussionRelevantToActor(discussion, actorContext) {
    const actorUserId = String(actorContext?.userId || '').trim();
    if (!actorUserId) return false;

    const relationships = discussion?.relationships || {};
    const actorGroupIds = new Set((Array.isArray(actorContext?.groupIds) ? actorContext.groupIds : []).map((id) => String(id)));
    const starterId = String(relationships?.user?.data?.id || '').trim();
    if (starterId && starterId === actorUserId) return true;

    const recipientUsers = Array.isArray(relationships?.recipientUsers?.data) ? relationships.recipientUsers.data : null;
    if (recipientUsers && recipientUsers.some((item) => String(item?.id || '').trim() === actorUserId)) return true;

    const recipientGroups = Array.isArray(relationships?.recipientGroups?.data) ? relationships.recipientGroups.data : null;
    if (recipientGroups && recipientGroups.some((item) => actorGroupIds.has(String(item?.id || '').trim()))) return true;

    const recipients = Array.isArray(relationships?.recipients?.data) ? relationships.recipients.data : null;
    if (recipients && recipients.some((item) => {
        const type = String(item?.type || '').trim();
        const id = String(item?.id || '').trim();
        if (type === 'users') return id === actorUserId;
        if (type === 'groups') return actorGroupIds.has(id);
        return false;
    })) return true;
    return false;
}

function filterPrivateDiscussionsForActor(discussions, actorContext) {
    return (Array.isArray(discussions) ? discussions : []).filter((discussion) => isPrivateDiscussionRelevantToActor(discussion, actorContext));
}

function normalizePrivateMessageTextForCompare(value) {
    return String(value || '').replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
}

function isLikelyPrivateDiscussionPostCreateButNotifyFailed(error) {
    const status = Number(error?.httpStatus || error?.apiError?.status || 0);
    if (status < 500) return false;

    const raw = [
        String(error?.message || ''),
        String(error?.detail || ''),
        String(error?.apiError?.title || ''),
        String(error?.apiError?.detail || '')
    ].join(' ');

    return /swift|smtp|mail|mailer|transportexception|expected response code 220|notification/i.test(raw);
}

async function flarumLoadPrivateDiscussionsPage({ offset, limit }) {
    const safeLimit = typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? Math.min(30, Math.floor(limit)) : 20;
    const safeOffset = typeof offset === 'number' && Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;
    const include = 'user,lastPostedUser,recipientUsers,recipientGroups';
    const url = `/discussions?sort=-lastPostedAt&page[limit]=${safeLimit}&page[offset]=${safeOffset}&filter[q]=${encodeURIComponent('is:private')}&include=${encodeURIComponent(include)}`;
    const json = await flarumRequest(url, { auth: true });
    return { json };
}

async function flarumLoadPrivateDiscussionDetail(discussionId) {
    const id = String(discussionId || '');
    if (!id) throw new Error('未指定短消息');

    const includeDiscussion = 'user,lastPostedUser,recipientUsers,recipientGroups';
    const discussionJson = await flarumRequest(`/discussions/${encodeURIComponent(id)}?include=${encodeURIComponent(includeDiscussion)}`, { auth: true });

    const postsJson = await flarumRequest(
        `/posts?filter[discussion]=${encodeURIComponent(id)}&sort=number&page[limit]=50&page[offset]=0&include=user`,
        { auth: true }
    );

    const included = [
        ...(Array.isArray(discussionJson?.included) ? discussionJson.included : []),
        ...(Array.isArray(postsJson?.included) ? postsJson.included : [])
    ];

    return {
        discussion: discussionJson?.data || null,
        included,
        posts: (Array.isArray(postsJson?.data) ? postsJson.data : []).filter((post) => {
            const contentType = String(post?.attributes?.contentType || 'comment').trim().toLowerCase();
            return contentType === 'comment';
        })
    };
}

async function recoverPrivateDiscussionAfterCreateFailure({ actorContext, recipientId, title, content }) {
    const actorUserId = String(actorContext?.userId || '').trim();
    const targetRecipientId = String(recipientId || '').trim();
    const expectedTitle = String(title || '').trim();
    const expectedContent = normalizePrivateMessageTextForCompare(content);
    if (!actorUserId || !targetRecipientId || !expectedTitle || !expectedContent) return null;

    const { json } = await flarumLoadPrivateDiscussionsPage({ offset: 0, limit: 15 });
    const discussions = filterPrivateDiscussionsForActor(Array.isArray(json?.data) ? json.data : [], actorContext)
        .filter((discussion) => {
            const attrs = discussion?.attributes || {};
            if (String(attrs.title || '').trim() !== expectedTitle) return false;
            const starterId = String(discussion?.relationships?.user?.data?.id || '').trim();
            if (starterId !== actorUserId) return false;
            const recipientUsers = Array.isArray(discussion?.relationships?.recipientUsers?.data)
                ? discussion.relationships.recipientUsers.data
                : [];
            return recipientUsers.some((item) => String(item?.id || '').trim() === targetRecipientId);
        })
        .sort((a, b) => {
            const ta = parseFlarumIsoTime(a?.attributes?.createdAt || a?.attributes?.lastPostedAt)?.getTime() || 0;
            const tb = parseFlarumIsoTime(b?.attributes?.createdAt || b?.attributes?.lastPostedAt)?.getTime() || 0;
            return tb - ta;
        });

    for (const discussion of discussions.slice(0, 3)) {
        const discussionId = String(discussion?.id || '').trim();
        if (!discussionId) continue;
        try {
            const detail = await flarumLoadPrivateDiscussionDetail(discussionId);
            const firstPost = Array.isArray(detail?.posts) ? detail.posts[0] : null;
            const actualContent = normalizePrivateMessageTextForCompare(
                firstPost?.attributes?.content
                || stripHtmlToText(firstPost?.attributes?.contentHtml || '')
            );
            if (actualContent === expectedContent) {
                return discussionId;
            }
        } catch (_) {}
    }

    return null;
}

async function flarumGetPrivateUnreadCount() {
    if (!getFlarumToken()) return 0;
    try {
        const actorContext = await getCurrentUserRoleContext();
        const { json } = await flarumLoadPrivateDiscussionsPage({ offset: 0, limit: 30 });
        const list = filterPrivateDiscussionsForActor(Array.isArray(json?.data) ? json.data : [], actorContext);
        return list.filter((d) => isDiscussionUnreadForActor(d?.attributes)).length;
    } catch {
        return 0;
    }
}

async function customGetPublicMessages() {
    const json = await customRequest('/custom-messages/public', { auth: true });
    return Array.isArray(json?.data) ? json.data : [];
}

async function customMarkPublicMessageRead(messageId) {
    const id = String(messageId || '');
    if (!id) return;
    await customRequest(`/custom-messages/public/${encodeURIComponent(id)}/read`, { method: 'POST', auth: true });
}

async function customGetNotifications() {
    const json = await customRequest('/custom-notifications', { auth: true });
    return Array.isArray(json?.data) ? json.data : [];
}

async function customMarkNotificationRead(notificationId) {
    const id = String(notificationId || '');
    if (!id) return;
    await customRequest(`/custom-notifications/${encodeURIComponent(id)}/read`, { method: 'POST', auth: true });
}

async function customGetPublicUnreadCount() {
    if (!getFlarumToken() || !localStorage.getItem('flarumUserId')) return 0;
    try {
        const json = await customRequest('/custom-messages/unread-count', { auth: true });
        const n = Number(json?.publicUnread ?? json?.totalUnread ?? 0);
        return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
        return 0;
    }
}

async function customGetUnreadCountAggregate() {
    if (!getFlarumToken() || !localStorage.getItem('flarumUserId')) {
        return { publicUnread: 0, notificationUnread: 0, privateUnread: 0, totalUnread: 0 };
    }

    try {
        const json = await customRequest('/custom-messages/unread-count', { auth: true });
        const publicUnread = Number(json?.publicUnread ?? 0);
        const notificationUnread = Number(json?.notificationUnread ?? 0);
        const totalUnread = Number(json?.totalUnread ?? 0);
        let privateUnread = Number(json?.privateUnread ?? NaN);
        if (!Number.isFinite(privateUnread) || privateUnread < 0) {
            privateUnread = await flarumGetPrivateUnreadCount();
        }

        const safePublic = Number.isFinite(publicUnread) && publicUnread >= 0 ? publicUnread : 0;
        const safeNotification = Number.isFinite(notificationUnread) && notificationUnread >= 0 ? notificationUnread : 0;
        const safePrivate = Number.isFinite(privateUnread) && privateUnread >= 0 ? privateUnread : 0;
        const computedTotal = safePublic + safeNotification + safePrivate;
        const safeTotal = Number.isFinite(totalUnread) && totalUnread >= 0 ? totalUnread : computedTotal;

        return {
            publicUnread: safePublic,
            notificationUnread: safeNotification,
            privateUnread: safePrivate,
            totalUnread: safeTotal
        };
    } catch {
        const [publicUnread, privateUnread] = await Promise.all([
            customGetPublicUnreadCount(),
            flarumGetPrivateUnreadCount()
        ]);
        const totalUnread = Math.max(0, publicUnread + privateUnread);
        return { publicUnread, notificationUnread: 0, privateUnread, totalUnread };
    }
}

function getLocalUnreadCountAggregate() {
    const state = window.pmState;
    if (!state?.useLocalUnreadCounts || !Array.isArray(state.itemsAll)) return null;

    let publicUnread = 0;
    let notificationUnread = 0;
    let privateUnread = 0;

    state.itemsAll.forEach((item) => {
        if (!item?.unread) return;
        if (item.kind === 'public') publicUnread += 1;
        else if (item.kind === 'notification') notificationUnread += 1;
        else if (item.kind === 'private') privateUnread += 1;
    });

    return {
        publicUnread,
        notificationUnread,
        privateUnread,
        totalUnread: publicUnread + notificationUnread + privateUnread
    };
}

async function refreshShortMessagesEntry() {
    const entryEls = Array.from(document.querySelectorAll('.status-right'))
        .filter((el) => (el?.getAttribute?.('onclick') || '').includes("message.html"));
    const headCountEl = document.getElementById('pm-unread-count');

    const setEntryLabel = (el, label) => {
        if (!el) return;
        let firstText = null;
        const toRemove = [];
        el.childNodes.forEach((n) => {
            if (n.nodeType !== 3) return;
            if (!firstText) firstText = n;
            else toRemove.push(n);
        });
        toRemove.forEach((n) => n.parentNode && n.parentNode.removeChild(n));
        if (firstText) {
            firstText.nodeValue = label;
            return;
        }
        el.insertBefore(document.createTextNode(label), el.firstChild);
    };

    if (!getFlarumToken() || !localStorage.getItem('flarumUserId')) {
        entryEls.forEach((el) => setEntryLabel(el, '消息中心'));
        if (headCountEl) headCountEl.textContent = '0';
        return { totalUnread: 0, publicUnread: 0, notificationUnread: 0, privateUnread: 0 };
    }

    const counts = getLocalUnreadCountAggregate() || await customGetUnreadCountAggregate();
    const total = Math.max(0, Number(counts.totalUnread) || 0);
    const showText = total > 99 ? '99+' : String(total);
    const label = total > 0 ? `消息中心(${showText})` : '消息中心';

    entryEls.forEach((el) => setEntryLabel(el, label));

    if (headCountEl) headCountEl.textContent = String(total);
    return { ...counts, totalUnread: total };
}

async function renderMessagePage() {
    const alertEl = document.getElementById('pm-alert');
    const listTitleEl = document.getElementById('pm-list-title');
    const listMetaEl = document.getElementById('pm-list-meta');
    const listBodyEl = document.getElementById('pm-list-body');
    const detailTitleEl = document.getElementById('pm-detail-title');
    const detailMetaEl = document.getElementById('pm-detail-meta');
    const detailBodyEl = document.getElementById('pm-detail-body');
    const filterAll = document.getElementById('pm-filter-all');
    const filterSystem = document.getElementById('pm-filter-system');
    const filterReply = document.getElementById('pm-filter-reply');
    const filterPrivate = document.getElementById('pm-filter-private');
    const filterUnread = document.getElementById('pm-filter-unread');
    const composePrivateBtn = document.getElementById('pm-compose-private-btn');
    const composePublicBtn = document.getElementById('pm-compose-public-btn');

    if (!listBodyEl || !detailBodyEl || !filterAll || !filterSystem || !filterReply || !filterPrivate || !filterUnread || !composePrivateBtn || !composePublicBtn) return;

    const setAlert = (message) => {
        if (!alertEl) return;
        const msg = typeof message === 'string' ? message.trim() : '';
        if (!msg) {
            alertEl.style.display = 'none';
            alertEl.textContent = '';
            return;
        }
        alertEl.style.display = 'block';
        alertEl.textContent = msg;
    };

    if (!getFlarumToken() || !localStorage.getItem('flarumUserId')) {
        setAlert('请先登录后查看短消息。');
        listBodyEl.innerHTML = '<div class="pm-empty">请先登录后查看短消息。</div>';
        detailBodyEl.innerHTML = '<div class="pm-empty">请先登录后查看短消息。</div>';
        await refreshShortMessagesEntry();
        return;
    }

    let state = window.pmState;
    if (!state) {
        state = {
            filter: 'all',
            items: [],
            itemsAll: [],
            selected: null,
            privateReadMarkers: {},
            useLocalUnreadCounts: false
        };
        window.pmState = state;
    }

    const normalizeFilter = (filter) => {
        const f = String(filter || '').toLowerCase();
        if (f === 'quote') return 'reply';
        if (['all', 'system', 'reply', 'private', 'unread'].includes(f)) return f;
        return 'all';
    };

    state.filter = normalizeFilter(state.filter);

    const renderDetailEmpty = () => {
        if (detailTitleEl) detailTitleEl.textContent = '短消息内容';
        if (detailMetaEl) detailMetaEl.textContent = '';
        detailBodyEl.innerHTML = '<div class="pm-empty">请选择一条短消息查看内容。</div>';
    };

    const actorContext = await getCurrentUserRoleContext().catch(() => ({ userId: '', groupIds: [], isAdmin: false, user: null }));
    const actorUserId = String(actorContext?.userId || '').trim();
    const isAdmin = !!actorContext.isAdmin;
    const readConsumablePointsFromSources = (userAttributes) => (typeof getUserPoints === 'function' ? getUserPoints(userAttributes) : null);
    const formatConsumablePointsText = (value) => (value == null ? '--' : String(value));
    const loadPrivateMessageAccessInfo = async () => {
        if (!actorUserId) return { consumablePoints: null };
        try {
            const userJson = await flarumRequest(`/users/${encodeURIComponent(actorUserId)}`, { auth: true });
            const userAttributes = userJson?.data?.attributes || {};
            return {
                consumablePoints: readConsumablePointsFromSources(userAttributes)
            };
        } catch (error) {
            console.warn('加载私信积分信息失败:', error);
            return {
                consumablePoints: readConsumablePointsFromSources(actorContext?.user?.attributes || {})
            };
        }
    };
    const privateFeatureEnabled = true;
    const canComposePrivate = !!actorUserId;
    const canReplyPrivate = !!actorUserId;
    const privateFeatureDeniedMessage = '请先登录后使用私人短消息。';
    const privateFilterWrap = filterPrivate.closest('.pm-filter');
    composePublicBtn.style.display = isAdmin ? '' : 'none';
    composePrivateBtn.style.display = '';
    if (privateFilterWrap) privateFilterWrap.style.display = privateFeatureEnabled ? '' : 'none';

    const setComposePrivateBtnActive = (active) => {
        if (!composePrivateBtn) return;
        composePrivateBtn.classList.toggle('primary', !!active);
    };

    const isReplyMessageItem = (item) => item?.kind === 'notification' && (item?.notifyType === 'reply' || item?.notifyType === 'quote');
    const isDisabledMessageFeatureItem = (item) => isReplyMessageItem(item);
    const showMessageFeatureDebuggingNotice = () => {
        alert('功能调试中');
    };
    const showPrivateFeatureDeniedNotice = () => {
        setAlert(privateFeatureDeniedMessage);
        detailBodyEl.innerHTML = `<div class="pm-empty">${escapeHtml(privateFeatureDeniedMessage)}</div>`;
    };

    const formatNotificationKindLabel = (t) => {
        const type = String(t || '').toLowerCase();
        if (type === 'reply') return '帖子回复';
        if (type === 'quote') return '帖子回复';
        if (type === 'mention') return '提到我';
        return '系统';
    };

    const syncFilterControls = () => {
        filterAll.checked = state.filter === 'all';
        filterSystem.checked = state.filter === 'system';
        filterReply.checked = state.filter === 'reply';
        filterPrivate.checked = state.filter === 'private';
        filterUnread.checked = state.filter === 'unread';
    };

    const setFilter = async (filter) => {
        setComposePrivateBtnActive(false);
        state.filter = normalizeFilter(filter);
        syncFilterControls();
        if (listTitleEl) listTitleEl.textContent = '我的消息';
        state.selected = null;
        renderDetailEmpty();
        if (Array.isArray(state.itemsAll) && state.itemsAll.length > 0) {
            await renderListFromCache();
            return;
        }
        await loadList();
    };

    const openSentMessageAfterCompose = async ({ kind, id, preferredFilter, preloadItem }) => {
        const targetKind = String(kind || '').trim();
        const targetId = id == null ? '' : String(id).trim();
        if (!targetKind || !targetId) {
            await refreshShortMessagesEntry();
            await loadList();
            return;
        }

        const params = new URLSearchParams(window.location.search);
        params.delete('to');
        params.delete('composePublic');
        const next = params.toString();
        window.history.replaceState(null, '', next ? `message.html?${next}` : 'message.html');

        state.filter = normalizeFilter(preferredFilter || (targetKind === 'private' ? 'private' : 'system'));
        syncFilterControls();
        if (listTitleEl) listTitleEl.textContent = '我的消息';
        state.selected = { kind: targetKind, id: targetId };

        await refreshShortMessagesEntry();
        await loadList();
        const existsInList = (state.itemsAll || []).some((item) => item.kind === targetKind && String(item.id) === targetId);
        if (!existsInList && preloadItem) {
            state.itemsAll = [preloadItem, ...(Array.isArray(state.itemsAll) ? state.itemsAll : [])];
            await renderListFromCache();
        }
        await renderDetail({ kind: targetKind, id: targetId });
    };

    const renderComposePrivate = async ({ toUserId }) => {
        setComposePrivateBtnActive(true);
        const toId = toUserId == null ? '' : String(toUserId);
        const accessInfo = await loadPrivateMessageAccessInfo();
        const consumablePoints = accessInfo.consumablePoints;
        const canStartConversation = consumablePoints != null && consumablePoints > 0;
        const pointsHint = consumablePoints == null
            ? '暂时无法读取积分，请稍后刷新后重试。'
            : (canStartConversation
                ? `提示：发起一次新会话会扣除 1 积分，回复不扣积分。当前可用积分：${formatConsumablePointsText(consumablePoints)}`
                : `当前可用积分：${formatConsumablePointsText(consumablePoints)}，积分需大于 0 才能发起新会话。`);
        detailBodyEl.innerHTML = `
            <form class="pm-form" id="pm-compose-form">
                <div class="pm-hint${canStartConversation ? '' : ' warning'}" style="margin-bottom: 12px;">${escapeHtml(pointsHint)}</div>
                <div style="margin-bottom: 10px;">
                    <label>收件人</label>
                    <select id="pm-compose-to-select">
                        <option value="">请选择收件人（括号内为用户名 / ID）</option>
                    </select>
                    <div style="margin-top: 8px;">
                        <label>搜索用户</label>
                        <div class="pm-suggest-wrap">
                            <input type="text" id="pm-compose-to-search" value="" placeholder="输入昵称/用户名/ID 进行搜索">
                            <div class="pm-suggest" id="pm-compose-suggest"></div>
                        </div>
                    </div>
                </div>
                <div style="margin-bottom: 10px;">
                    <label>标题</label>
                    <input type="text" id="pm-compose-title" value="" placeholder="请输入短消息标题">
                </div>
                <div>
                    <label>内容</label>
                    <textarea id="pm-compose-content" placeholder="请输入短消息内容"></textarea>
                </div>
                <div class="pm-form-actions">
                    <button type="submit" class="pm-btn primary"${canStartConversation ? '' : ' disabled'}>${canStartConversation ? '发送' : '积分不足，无法发起'}</button>
                    <button type="button" class="pm-btn" id="pm-compose-cancel">取消</button>
                </div>
            </form>
        `;
        if (detailTitleEl) detailTitleEl.textContent = '写短消息';
        if (detailMetaEl) detailMetaEl.textContent = '发起新会话扣 1 积分，回复不扣积分';

        const form = document.getElementById('pm-compose-form');
        const cancelBtn = document.getElementById('pm-compose-cancel');
        const toSelect = document.getElementById('pm-compose-to-select');
        const toSearch = document.getElementById('pm-compose-to-search');
        const suggestBox = document.getElementById('pm-compose-suggest');
        const titleInput = document.getElementById('pm-compose-title');
        const contentInput = document.getElementById('pm-compose-content');
        const isAllowedPrivateRecipientUser = (user) => {
            const candidateId = String(user?.id || '').trim();
            return !!candidateId && candidateId !== actorUserId;
        };

        const rebuildRecipientOptions = (users, selectedId) => {
            if (!toSelect) return;
            const selected = selectedId != null ? String(selectedId) : '';
            const optionsHtml = mergeUsersUnique(users)
                .filter((u) => isAllowedShortMessageRecipientUserId(u?.id) && isAllowedPrivateRecipientUser(u))
                .sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0))
                .map((u) => {
                    const id = String(u.id);
                    const label = buildUserSelectLabel(u);
                    return `<option value="${escapeHtml(id)}"${id === selected ? ' selected' : ''}>${escapeHtml(label)}</option>`;
                }).join('');
            toSelect.innerHTML = `<option value="">请选择收件人（括号内为用户名 / ID）</option>${optionsHtml}`;
        };

        const loadDefaultRecipients = async () => {
            try {
                const fixed = await Promise.all([flarumLoadUserById(1), flarumLoadUserById(2), flarumLoadUserById(3)]);
                const fixedUsers = fixed.filter(Boolean);
                const sortCandidates = ['-id', '-joinedAt', '-lastSeenAt'];
                const page0 = await flarumLoadUsersSortedPage({ offset: 0, limit: 80, sortCandidates });
                const page1 = await flarumLoadUsersSortedPage({ offset: 80, limit: 80, sortCandidates });
                const pageUsers0 = Array.isArray(page0?.json?.data) ? page0.json.data : [];
                const pageUsers1 = Array.isArray(page1?.json?.data) ? page1.json.data : [];
                const merged = mergeUsersUnique([...fixedUsers, ...pageUsers0, ...pageUsers1]);
                const selected = isAllowedShortMessageRecipientUserId(toId) ? toId : '';
                rebuildRecipientOptions(merged, selected);
            } catch {
                rebuildRecipientOptions([], '');
            }
        };

        const setSuggestItems = (users) => {
            if (!suggestBox) return;
            const list = (Array.isArray(users) ? users : [])
                .filter((u) => isAllowedShortMessageRecipientUserId(u?.id) && isAllowedPrivateRecipientUser(u))
                .slice(0, 12);
            if (list.length === 0) {
                suggestBox.style.display = 'none';
                suggestBox.innerHTML = '';
                return;
            }
            suggestBox.innerHTML = list.map((u) => {
                const id = String(u?.id || '');
                const label = buildUserSelectLabel(u);
                return `<div class="pm-suggest-item" data-id="${escapeHtml(id)}">${escapeHtml(label)}</div>`;
            }).join('');
            suggestBox.style.display = 'block';
            Array.from(suggestBox.querySelectorAll('.pm-suggest-item')).forEach((el) => {
                el.addEventListener('click', () => {
                    const id = el.getAttribute('data-id') || '';
                    if (toSelect) {
                        const existing = Array.from(toSelect.options || []).some((opt) => opt && opt.value === id);
                        if (!existing) {
                            const opt = document.createElement('option');
                            opt.value = id;
                            opt.textContent = el.textContent || id;
                            toSelect.appendChild(opt);
                        }
                        toSelect.value = id;
                    }
                    if (toSearch) toSearch.value = '';
                    suggestBox.style.display = 'none';
                    suggestBox.innerHTML = '';
                });
            });
        };

        if (cancelBtn) {
            cancelBtn.onclick = () => {
                const params = new URLSearchParams(window.location.search);
                params.delete('to');
                params.delete('composePublic');
                const next = params.toString();
                window.history.replaceState(null, '', next ? `message.html?${next}` : 'message.html');
                setComposePrivateBtnActive(false);
                renderDetailEmpty();
            };
        }

        if (toSearch) {
            let lastTimer = null;
            const runSearch = async () => {
                const q = String(toSearch.value || '').trim();
                if (!q) {
                    await loadDefaultRecipients();
                    setSuggestItems([]);
                    return;
                }
                try {
                    const candidateUsers = [];
                    const numeric = /^\d+$/.test(q);
                    if (numeric) {
                        const byId = await flarumLoadUserById(q);
                        if (byId) candidateUsers.push(byId);
                    }

                    const serverResults = await flarumSearchUsers({ query: q, limit: 30 });
                    candidateUsers.push(...serverResults);

                    const sortCandidates = ['-id', '-joinedAt', '-lastSeenAt'];
                    const page0 = await flarumLoadUsersSortedPage({ offset: 0, limit: 120, sortCandidates });
                    const page1 = await flarumLoadUsersSortedPage({ offset: 120, limit: 120, sortCandidates });
                    const pageUsers0 = Array.isArray(page0?.json?.data) ? page0.json.data : [];
                    const pageUsers1 = Array.isArray(page1?.json?.data) ? page1.json.data : [];
                    candidateUsers.push(...pageUsers0, ...pageUsers1);

                    const merged = mergeUsersUnique(candidateUsers)
                        .filter((u) => isAllowedShortMessageRecipientUserId(u?.id) && isAllowedPrivateRecipientUser(u))
                        .filter((u) => userMatchesQueryFuzzy(u, q))
                        .sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));

                    rebuildRecipientOptions(merged, toSelect ? toSelect.value : '');
                    setSuggestItems(merged);
                } catch {
                    rebuildRecipientOptions([], '');
                    setSuggestItems([]);
                }
            };
            toSearch.addEventListener('input', () => {
                if (lastTimer) window.clearTimeout(lastTimer);
                lastTimer = window.setTimeout(runSearch, 180);
            });

            document.addEventListener('click', (ev) => {
                if (!suggestBox || suggestBox.style.display !== 'block') return;
                const inside = ev.target && ev.target.closest ? ev.target.closest('.pm-suggest-wrap') : null;
                if (!inside) {
                    suggestBox.style.display = 'none';
                }
            });
        }

        await loadDefaultRecipients();

        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                setAlert('');
                const submitBtn = form.querySelector('button[type="submit"]');

                const recipientId = String(toSelect?.value || '').trim();
                const title = String(titleInput?.value || '').trim();
                const content = String(contentInput?.value || '').trim();

                if (!recipientId) return setAlert('请选择收件人。');
                if (!isAllowedShortMessageRecipientUserId(recipientId)) return setAlert('当前收件人不在可发送范围内。');
                if (!title) return setAlert('请填写标题。');
                if (!content) return setAlert('请填写内容。');

                try {
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.textContent = '发送中...';
                    }
                    const latestAccessInfo = await loadPrivateMessageAccessInfo();
                    const latestConsumablePoints = latestAccessInfo.consumablePoints;
                    if (latestConsumablePoints == null) {
                        setAlert('暂时无法读取积分，请稍后重试。');
                        return;
                    }
                    if (latestConsumablePoints <= 0) {
                        setAlert(`积分不足，当前可用积分：${formatConsumablePointsText(latestConsumablePoints)}，无法发起新会话。`);
                        return;
                    }
                    if (!window.confirm(`发起一次新会话会扣除 1 积分，回复不扣积分。当前可用积分：${formatConsumablePointsText(latestConsumablePoints)}，确认继续吗？`)) {
                        return;
                    }
                    const recipientUser = await flarumLoadUserById(recipientId);
                    if (!recipientUser) {
                        setAlert('收件人不存在或不可用。');
                        return;
                    }
                    if (!isAllowedPrivateRecipientUser(recipientUser)) {
                        setAlert('不能给自己发送短消息。');
                        return;
                    }
                    const created = await flarumRequest('/discussions', {
                        method: 'POST',
                        auth: true,
                        json: {
                            data: {
                                type: 'discussions',
                                attributes: { title, content },
                                relationships: {
                                    recipientUsers: { data: [{ type: 'users', id: String(recipientId) }] }
                                }
                            }
                        }
                    });
                    const discussionId = created?.data?.id ? String(created.data.id) : '';
                    setAlert('');
                    await openSentMessageAfterCompose({ kind: 'private', id: discussionId, preferredFilter: 'private' });
                } catch (error) {
                    if (error?.httpStatus === 403 || error?.apiError?.status === 403) {
                        setAlert('当前账号没有使用短消息的权限，请联系网管。');
                        return;
                    }
                    try {
                        const recoveredDiscussionId = await recoverPrivateDiscussionAfterCreateFailure({
                            actorContext,
                            recipientId,
                            title,
                            content
                        });
                        if (recoveredDiscussionId) {
                            setAlert('短消息已发送，但论坛通知服务返回异常；如频繁出现，请检查 Flarum 邮件/通知配置。');
                            await openSentMessageAfterCompose({ kind: 'private', id: recoveredDiscussionId, preferredFilter: 'private' });
                            return;
                        }
                    } catch (_) {}

                    if (isLikelyPrivateDiscussionPostCreateButNotifyFailed(error)) {
                        setAlert('论坛可能已创建短消息，但通知邮件发送异常；请刷新消息列表确认，并检查 Flarum 邮件配置。');
                        return;
                    }

                    const friendlyMessage = typeof getFriendlyErrorMessage === 'function'
                        ? getFriendlyErrorMessage(error, 'create_discussion')
                        : '发送失败，请稍后再试。';
                    const detailMessage = String(error?.apiError?.detail || '').trim();
                    if (detailMessage && detailMessage !== friendlyMessage && detailMessage.length <= 120) {
                        setAlert(`${friendlyMessage}（${detailMessage}）`);
                        return;
                    }
                    setAlert(friendlyMessage);
                } finally {
                    if (submitBtn && document.body.contains(submitBtn)) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = '发送';
                    }
                }
            };
        }
    };

    const renderComposePublic = async () => {
        if (!isAdmin) {
            setAlert('只有管理员可以发送公共短消息。');
            return;
        }

        detailBodyEl.innerHTML = `
            <form class="pm-form" id="pm-public-form">
                <div style="margin-bottom: 10px;">
                    <label>类型</label>
                    <select id="pm-public-type">
                        <option value="system">system（系统）</option>
                        <option value="notice" selected>notice（公告）</option>
                        <option value="warning">warning（警告）</option>
                        <option value="event">event（活动）</option>
                    </select>
                </div>
                <div style="margin-bottom: 10px;">
                    <label>标题</label>
                    <input type="text" id="pm-public-title" value="" placeholder="请输入公共短消息标题">
                </div>
                <div style="margin-bottom: 10px;">
                    <label>内容</label>
                    <textarea id="pm-public-content" placeholder="请输入公共短消息内容"></textarea>
                </div>
                <div style="margin-bottom: 10px;">
                    <label><input type="checkbox" id="pm-public-active" checked> 立即生效并显示</label>
                    <div class="pm-hint">不勾选时会保存为停用状态，普通用户不会看到这条公共消息。</div>
                </div>
                <div class="pm-form-actions">
                    <button type="submit" class="pm-btn primary">群发</button>
                    <button type="button" class="pm-btn" id="pm-public-cancel">取消</button>
                </div>
            </form>
        `;
        if (detailTitleEl) detailTitleEl.textContent = '管理员群发';
        if (detailMetaEl) detailMetaEl.textContent = '';

        const form = document.getElementById('pm-public-form');
        const cancelBtn = document.getElementById('pm-public-cancel');
        const typeEl = document.getElementById('pm-public-type');
        const titleEl = document.getElementById('pm-public-title');
        const contentEl = document.getElementById('pm-public-content');
        const activeEl = document.getElementById('pm-public-active');

        if (cancelBtn) {
            cancelBtn.onclick = () => {
                const params = new URLSearchParams(window.location.search);
                params.delete('composePublic');
                const next = params.toString();
                window.history.replaceState(null, '', next ? `message.html?${next}` : 'message.html');
                renderDetailEmpty();
            };
        }

        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                setAlert('');
                const submitBtn = form.querySelector('button[type="submit"]');

                const type = String(typeEl?.value || 'notice').trim();
                const title = String(titleEl?.value || '').trim();
                const content = String(contentEl?.value || '').trim();
                const is_active = !!activeEl?.checked;

                if (!title) return setAlert('请填写标题。');
                if (!content) return setAlert('请填写内容。');

                try {
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.textContent = '群发中...';
                    }
                    const created = await customRequest('/custom-messages/public', {
                        method: 'POST',
                        auth: true,
                        json: { title, content, type, is_active }
                    });
                    const createdRow = created?.data || null;
                    const messageId = createdRow?.id ? String(createdRow.id) : '';
                    setAlert('');
                    await openSentMessageAfterCompose({
                        kind: 'public',
                        id: messageId,
                        preferredFilter: 'system',
                        preloadItem: createdRow ? {
                            kind: 'public',
                            id: String(createdRow.id),
                            title: `【公告】${createdRow.title || '（无标题）'}`,
                            rawTitle: createdRow.title || '（无标题）',
                            meta1: formatPublicTypeLabel(createdRow.type),
                            time: createdRow.created_at || '',
                            unread: false,
                            publicType: createdRow.type || type,
                            content: createdRow.content || '',
                            senderUserId: createdRow.sender_user_id
                        } : null
                    });
                } catch (error) {
                    console.error('公共短消息群发失败:', error);
                    const status = error?.httpStatus || error?.apiError?.status;
                    if (status === 401) {
                        setAlert('请先登录后再发送短消息');
                        return;
                    }
                    if (status === 403) {
                        setAlert('当前账号不是管理员，不能群发公共短消息');
                        return;
                    }
                    if (status === 400) {
                        setAlert('标题和内容不能为空');
                        return;
                    }
                    if (status === 500) {
                        setAlert('服务器保存公共短消息失败，请查看后端日志');
                        return;
                    }
                    if (status === 404) {
                        setAlert('当前环境未启用公共消息接口，管理员群发暂不可用。');
                        return;
                    }
                    if (!status) {
                        setAlert('公共消息服务不可用，请检查后端接口是否已部署并正常运行。');
                        return;
                    }
                    setAlert('群发失败，请稍后再试。');
                } finally {
                    if (submitBtn && document.body.contains(submitBtn)) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = '群发';
                    }
                }
            };
        }
    };

    const formatPublicTypeLabel = (t) => {
        const type = String(t || '').toLowerCase();
        if (type === 'system') return '系统';
        if (type === 'warning') return '警告';
        if (type === 'event') return '活动';
        return '公告';
    };

    const renderListFromCache = async () => {
        const merged = Array.isArray(state.itemsAll) ? state.itemsAll : [];
        const filtered = merged.filter((item) => {
            if (state.filter === 'system') return item.kind === 'public' || (item.kind === 'notification' && item.notifyType === 'system');
            if (state.filter === 'reply') return item.kind === 'notification' && (item.notifyType === 'reply' || item.notifyType === 'quote');
            if (state.filter === 'private') return item.kind === 'private';
            if (state.filter === 'unread') return !!item.unread;
            return true;
        });

        state.items = filtered;
        if (listMetaEl) listMetaEl.textContent = `共 ${filtered.length} 条`;

        if (filtered.length === 0) {
            listBodyEl.innerHTML = '<div class="pm-empty">暂无消息。</div>';
            await refreshShortMessagesEntry();
            return;
        }

        listBodyEl.innerHTML = filtered.map((item) => {
            const isPublic = item.kind === 'public';
            const isNotification = item.kind === 'notification';
            const publicType = isPublic ? String(item.publicType || 'notice') : '';
            const notifyType = isNotification ? String(item.notifyType || 'system') : '';
            const cls = [
                'pm-list-item',
                item.unread ? 'unread' : 'pm-read',
                isPublic ? 'pm-public' : '',
                item.kind === 'private' ? 'pm-private' : '',
                isPublic ? `pm-public-${escapeHtml(publicType)}` : '',
                isNotification ? 'pm-notify' : '',
                isNotification ? `pm-notify-${escapeHtml(notifyType)}` : ''
            ].filter(Boolean).join(' ');
            const timeText = item.time ? escapeHtml(formatFlarumTime(item.time).slice(0, 16)) : '';
            return `
                <div class="${cls}" data-kind="${escapeHtml(item.kind)}" data-id="${escapeHtml(item.id)}">
                    <div class="pm-list-title">${escapeHtml(item.title)}</div>
                    <div class="pm-list-meta">
                        <span>${escapeHtml(item.meta1 || '')}</span>
                        <span>${timeText}</span>
                        ${item.unread ? '<span style="color:#cc0000;">未读</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        Array.from(listBodyEl.querySelectorAll('.pm-list-item')).forEach((el) => {
            el.addEventListener('click', async () => {
                const id = el.getAttribute('data-id');
                const kind = el.getAttribute('data-kind');
                if (!id || !kind) return;
                const targetItem = (Array.isArray(state.items) ? state.items : []).find((item) => item.kind === kind && String(item.id) === String(id));
                if (isDisabledMessageFeatureItem(targetItem)) {
                    showMessageFeatureDebuggingNotice();
                    return;
                }
                state.selected = { kind, id };
                await renderDetail({ kind, id });
            });
        });

        await refreshShortMessagesEntry();
    };

    const loadList = async () => {
        setAlert('');
        listBodyEl.innerHTML = '<div class="pm-empty">加载中...</div>';
        try {
            const [privateResult, publicMessages, notificationsResult] = await Promise.all([
                (async () => {
                    try {
                        const { json } = await flarumLoadPrivateDiscussionsPage({ offset: 0, limit: 30 });
                        return { json, error: null };
                    } catch (error) {
                        return { json: null, error };
                    }
                })(),
                (async () => {
                    try {
                        return await customGetPublicMessages();
                    } catch (error) {
                        return { __error: error };
                    }
                })(),
                (async () => {
                    try {
                        const list = await customGetNotifications();
                        return { data: list, error: null };
                    } catch (error) {
                        return { data: [], error };
                    }
                })()
            ]);

            const privateDiscussions = filterPrivateDiscussionsForActor(Array.isArray(privateResult?.json?.data) ? privateResult.json.data : [], actorContext);
            const privateIncluded = Array.isArray(privateResult?.json?.included) ? privateResult.json.included : [];

            const privateItems = privateDiscussions.map((d) => {
                const id = d?.id;
                const attrs = d?.attributes || {};
                const starterId = d?.relationships?.user?.data?.id;
                const starterUser = starterId ? pickIncluded(privateIncluded, 'users', starterId) : null;
                const starterName = getPreferredDisplayName(starterUser?.attributes) || '匿名用户';
                const unread = isDiscussionUnreadForActor(attrs) && !isPrivateDiscussionLocallyMarkedRead(state, id, attrs);
                const lastPostedAt = attrs.lastPostedAt || attrs.createdAt || '';
                return {
                    kind: 'private',
                    id: String(id || ''),
                    title: attrs.title || '无标题',
                    meta1: `发件人：${starterName}`,
                    time: lastPostedAt,
                    unread
                };
            }).filter((x) => x.id);

            const publicError = publicMessages && publicMessages.__error ? publicMessages.__error : null;
            const publicItemsRaw = publicError ? [] : publicMessages;

            const publicItems = (Array.isArray(publicItemsRaw) ? publicItemsRaw : []).map((m) => {
                const type = String(m?.type || 'notice');
                const unread = !m?.is_read;
                const createdAt = m?.created_at || '';
                const rawTitle = m?.title || '（无标题）';
                return {
                    kind: 'public',
                    id: String(m?.id || ''),
                    title: `【公告】${rawTitle}`,
                    rawTitle,
                    meta1: formatPublicTypeLabel(type),
                    time: createdAt,
                    unread,
                    publicType: type,
                    content: m?.content || '',
                    senderUserId: m?.sender_user_id
                };
            }).filter((x) => x.id);

            const notificationsError = notificationsResult?.error || null;
            const notificationItems = (Array.isArray(notificationsResult?.data) ? notificationsResult.data : []).map((n) => {
                const notifyType = String(n?.type || 'system').toLowerCase();
                const unread = n?.isRead === false;
                const createdAt = n?.createdAt || '';
                const fromUserName = String(n?.fromUserName || '').trim();
                const content = String(n?.content || '').trim();
                const titleRaw = String(n?.title || '').trim() || '系统通知';
                const listTitle = (() => {
                    if (notifyType === 'reply') return `【帖子回复】${content || titleRaw}`;
                    if (notifyType === 'quote') return `【帖子回复】${content || titleRaw}`;
                    if (notifyType === 'mention') return `【提到我】${content || titleRaw}`;
                    return `【系统】${titleRaw}`;
                })();
                return {
                    kind: 'notification',
                    id: String(n?.id || ''),
                    title: listTitle,
                    meta1: fromUserName ? `来自：${fromUserName}` : `类型：${formatNotificationKindLabel(notifyType)}`,
                    time: createdAt,
                    unread,
                    notifyType,
                    detailTitle: titleRaw,
                    content,
                    url: n?.url || '',
                    discussionId: n?.discussionId,
                    postId: n?.postId,
                    floor: n?.floor
                };
            }).filter((x) => x.id);

            if (privateResult?.error?.httpStatus === 403 || privateResult?.error?.apiError?.status === 403) {
                setAlert('当前账号没有使用短消息的权限，请联系网管。');
            }

            if (publicError?.httpStatus === 403 || publicError?.apiError?.status === 403) {
                setAlert('当前账号没有使用短消息的权限，请联系网管。');
            }

            if (notificationsError) {
                console.error('通知加载失败:', notificationsError);
                if (!publicError) setAlert('通知暂时无法加载，请稍后刷新。');
            }

            const merged = [...privateItems, ...publicItems, ...notificationItems].sort((a, b) => {
                const ta = parseFlarumIsoTime(a.time)?.getTime() || 0;
                const tb = parseFlarumIsoTime(b.time)?.getTime() || 0;
                return tb - ta;
            });

            state.itemsAll = merged;
            state.useLocalUnreadCounts = true;
            await renderListFromCache();
        } catch (error) {
            if (error?.httpStatus === 403 || error?.apiError?.status === 403) {
                setAlert('当前账号没有使用短消息的权限，请联系网管。');
                listBodyEl.innerHTML = '<div class="pm-empty">当前账号没有使用短消息的权限。</div>';
                detailBodyEl.innerHTML = '<div class="pm-empty">当前账号没有使用短消息的权限。</div>';
                return;
            }
            setAlert('短消息加载失败，请稍后再试。');
            listBodyEl.innerHTML = '<div class="pm-empty">加载失败</div>';
        }
    };

    const renderDetail = async ({ kind, id }) => {
        setComposePrivateBtnActive(false);
        setAlert('');
        detailBodyEl.innerHTML = '<div class="pm-empty">加载中...</div>';
        try {
            if (kind === 'public') {
                const message = (state.items || []).find((x) => x.kind === 'public' && String(x.id) === String(id));
                if (!message) {
                    detailBodyEl.innerHTML = '<div class="pm-empty">短消息不存在或已过期。</div>';
                    return;
                }
                const title = message.rawTitle || message.title || '公共短消息';
                const createdAt = message.time ? formatFlarumTime(message.time).slice(0, 16) : '';
                const typeLabel = formatPublicTypeLabel(message.publicType);
                if (detailTitleEl) detailTitleEl.textContent = title;
                if (detailMetaEl) detailMetaEl.textContent = `${typeLabel}${createdAt ? ` · ${createdAt}` : ''}`;

                const contentHtml = textToHtmlParagraphs(String(message.content || ''));
                detailBodyEl.innerHTML = `
                    <div class="pm-thread pm-public-detail pm-public-${escapeHtml(String(message.publicType || 'notice'))}">
                        ${contentHtml || '<div class="pm-empty">暂无内容</div>'}
                    </div>
                `;

                try {
                    await customMarkPublicMessageRead(id);
                    state.itemsAll = (state.itemsAll || []).map((x) => {
                        if (x.kind === 'public' && String(x.id) === String(id)) return { ...x, unread: false };
                        return x;
                    });
                } catch (error) {
                    if (error?.httpStatus === 403 || error?.apiError?.status === 403) {
                        setAlert('当前账号没有使用短消息的权限，请联系网管。');
                    }
                }

                await refreshShortMessagesEntry();
                await renderListFromCache();
                return;
            }

            if (kind === 'notification') {
                const message = (state.itemsAll || []).find((x) => x.kind === 'notification' && String(x.id) === String(id));
                if (!message) {
                    detailBodyEl.innerHTML = '<div class="pm-empty">通知不存在或已过期。</div>';
                    return;
                }

                const url = String(message.url || '').trim();
                if (url) {
                    try {
                        customMarkNotificationRead(id).then(() => refreshShortMessagesEntry()).catch(() => {});
                        state.itemsAll = (state.itemsAll || []).map((x) => {
                            if (x.kind === 'notification' && String(x.id) === String(id)) return { ...x, unread: false };
                            return x;
                        });
                    } catch (_) {}
                    window.location.href = url;
                    return;
                }

                const title = message.detailTitle || '通知';
                const createdAt = message.time ? formatFlarumTime(message.time).slice(0, 16) : '';
                if (detailTitleEl) detailTitleEl.textContent = title;
                if (detailMetaEl) detailMetaEl.textContent = `${formatNotificationKindLabel(message.notifyType)}${createdAt ? ` · ${createdAt}` : ''}`;
                const contentHtml = textToHtmlParagraphs(String(message.content || ''));
                detailBodyEl.innerHTML = `<div class="pm-thread">${contentHtml || '<div class="pm-empty">暂无内容</div>'}</div>`;

                try {
                    await customMarkNotificationRead(id);
                    state.itemsAll = (state.itemsAll || []).map((x) => {
                        if (x.kind === 'notification' && String(x.id) === String(id)) return { ...x, unread: false };
                        return x;
                    });
                } catch (error) {
                    console.error('通知已读失败:', error);
                }
                await refreshShortMessagesEntry();
                await renderListFromCache();
                return;
            }

            const { discussion, included, posts } = await flarumLoadPrivateDiscussionDetail(id);
            if (!discussion || !isPrivateDiscussionRelevantToActor(discussion, actorContext)) {
                detailBodyEl.innerHTML = '<div class="pm-empty">短消息不存在或无法访问。</div>';
                return;
            }
            const attrs = discussion.attributes || {};
            const title = attrs.title || '短消息';
            const updatedAt = attrs.lastPostedAt || attrs.createdAt || '';
            const isUnread = isDiscussionUnreadForActor(attrs) && !isPrivateDiscussionLocallyMarkedRead(state, id, attrs);

            if (detailTitleEl) detailTitleEl.textContent = title;
            if (detailMetaEl) detailMetaEl.textContent = updatedAt ? formatFlarumTime(updatedAt).slice(0, 16) : '';

            const threadHtml = posts.map((p) => {
                const userId = p?.relationships?.user?.data?.id;
                const user = userId ? pickIncluded(included, 'users', userId) : null;
                const author = getPreferredDisplayName(user?.attributes) || '匿名用户';
                const createdAt = p?.attributes?.createdAt ? formatFlarumTime(p.attributes.createdAt).slice(0, 16) : '';
                const contentHtml = typeof p?.attributes?.contentHtml === 'string' ? p.attributes.contentHtml : '';
                const contentText = typeof p?.attributes?.content === 'string' ? p.attributes.content : '';
                const html = contentHtml || textToHtmlParagraphs(contentText);
                return `
                    <div class="pm-post">
                        <div class="pm-post-meta">
                            <span class="pm-post-author">${escapeHtml(author)}</span>
                            <span>${escapeHtml(createdAt)}</span>
                        </div>
                        <div class="pm-post-body">${html}</div>
                    </div>
                `;
            }).join('');

            detailBodyEl.innerHTML = `
                <div class="pm-thread" id="pm-thread">${threadHtml || '<div class="pm-empty">暂无内容</div>'}</div>
                ${canReplyPrivate ? `
                <div class="pm-hint" style="margin-top: 12px;">回复短消息不扣积分。</div>
                <form class="pm-form" id="pm-reply-form">
                    <label>回复</label>
                    <textarea id="pm-reply-content" placeholder="写下你的回复..."></textarea>
                    <div class="pm-form-actions">
                        <button type="submit" class="pm-btn primary">回复</button>
                    </div>
                </form>
                ` : '<div class="pm-hint" style="margin-top: 12px;">请先登录后再回复短消息。</div>'}
            `;

            const thread = document.getElementById('pm-thread');
            if (thread) thread.scrollTop = thread.scrollHeight;

            const replyForm = document.getElementById('pm-reply-form');
            const replyContent = document.getElementById('pm-reply-content');
            if (isUnread) {
                rememberPrivateDiscussionRead(state, id, attrs);
                state.itemsAll = (state.itemsAll || []).map((x) => {
                    if (x.kind === 'private' && String(x.id) === String(id)) return { ...x, unread: false };
                    return x;
                });
                await renderListFromCache();
                flarumMarkPrivateDiscussionRead(id, attrs).then((success) => {
                    if (success) {
                        refreshShortMessagesEntry().catch(() => {});
                    }
                }).catch(() => {});
            }
            if (replyForm && replyContent) {
                replyForm.onsubmit = async (e) => {
                    e.preventDefault();
                    const content = String(replyContent.value || '').trim();
                    if (!content) return;
                    try {
                        await flarumCreatePost({ discussionId: String(id), content });
                        replyContent.value = '';
                        await renderDetail({ kind: 'private', id: String(id) });
                        await loadList();
                    } catch (error) {
                        if (error?.httpStatus === 403 || error?.apiError?.status === 403) {
                            setAlert('当前账号没有使用短消息的权限，请联系网管。');
                            return;
                        }
                        setAlert('回复失败，请稍后再试。');
                    }
                };
            }

            await refreshShortMessagesEntry();
        } catch (error) {
            if (error?.httpStatus === 403 || error?.apiError?.status === 403) {
                setAlert('当前账号没有使用短消息的权限，请联系网管。');
                detailBodyEl.innerHTML = '<div class="pm-empty">当前账号没有使用短消息的权限。</div>';
                return;
            }
            setAlert('短消息加载失败，请稍后再试。');
            detailBodyEl.innerHTML = '<div class="pm-empty">加载失败</div>';
        }
    };

    filterAll.onchange = () => { if (filterAll.checked) setFilter(filterAll.value || 'all').catch(() => {}); };
    filterSystem.onchange = () => { if (filterSystem.checked) setFilter(filterSystem.value || 'system').catch(() => {}); };
    filterReply.onchange = () => {
        if (!filterReply.checked) return;
        syncFilterControls();
        showMessageFeatureDebuggingNotice();
    };
    filterPrivate.onchange = () => {
        if (!filterPrivate.checked) return;
        setFilter(filterPrivate.value || 'private').catch(() => {});
    };
    filterUnread.onchange = () => { if (filterUnread.checked) setFilter(filterUnread.value || 'unread').catch(() => {}); };

    composePrivateBtn.onclick = () => {
        if (!canComposePrivate) {
            showPrivateFeatureDeniedNotice();
            return;
        }
        const params = new URLSearchParams(window.location.search);
        params.delete('to');
        params.delete('composePublic');
        const next = params.toString();
        window.history.replaceState(null, '', next ? `message.html?${next}` : 'message.html');
        renderComposePrivate({ toUserId: '' }).catch(() => {
            setAlert('短消息加载失败，请稍后再试。');
        });
    };

    composePublicBtn.onclick = () => {
        setComposePrivateBtnActive(false);
        const params = new URLSearchParams(window.location.search);
        params.set('composePublic', '1');
        window.history.replaceState(null, '', `message.html?${params.toString()}`);
        renderComposePublic();
    };

    await refreshShortMessagesEntry();

    const urlParams = new URLSearchParams(window.location.search);
    const to = urlParams.get('to');
    const composePublic = urlParams.get('composePublic');
    if (composePublic === '1') {
        await renderComposePublic();
        return;
    }
    if (to) {
        if (!canComposePrivate) {
            showPrivateFeatureDeniedNotice();
            await setFilter('all');
            return;
        }
        await renderComposePrivate({ toUserId: to });
        return;
    }
    if (state.filter === 'reply') {
        state.filter = 'all';
    }
    await setFilter(state.filter);
}

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

    document.title = '红蜻蜓论坛 - 帖子加载中...';
    
    const postData = await loadPostData(postId);
    if (!postData) {
        console.error('无法加载帖子数据');
        document.title = '红蜻蜓论坛 - 帖子';
        return;
    }
    
    renderForumThread(postData);
}

// 渲染论坛帖子
function renderForumThread(postData) {
    const threadContainer = document.querySelector('.forum-thread');
    if (!threadContainer) return;
    
    // 保存帖子数据到全局变量，供后续使用（避免重复加载）
    window.currentPostData = postData;
    const isLoggedIn = !!getFlarumToken();

    // 更新页面标题
    document.title = `红蜻蜓论坛 - ${postData.title}`;

    // 处理不可回帖的情况
    const replyBox = document.getElementById('reply-box');
    if (replyBox) {
        if (postData.allowComments === false) {
            replyBox.innerHTML = '<div class="comments-disabled-msg" style="padding: 20px; text-align: center; color: #666; background: #f9f9f9; border: 1px solid #ddd; margin-top: 20px;">该帖子已设置不可回帖</div>';
        } else {
            // 恢复回帖表单（如果之前被禁用了）
            if (replyBox.querySelector('.comments-disabled-msg')) {
                if (isLoggedIn) {
                    // 已登录：显示用户信息和表单
                    replyBox.innerHTML = `
                        <h4>发表回复</h4>
                        <div class="current-user-info reply-user-info">
                            <img src="images/用户头像.png" alt="头像" class="reply-user-avatar">
                            <div>
                                <div class="reply-user-name">${localStorage.getItem('flarumUsername') || '已登录用户'}</div>
                                <div class="reply-user-level">Lv.1 新手上路</div>
                            </div>
                        </div>
                        <form class="reply-form" id="reply-form">
                            <div class="toolbar reply-toolbar">
                                <button type="button" class="toolbar-btn" data-action="bold" title="粗体 (Ctrl+B)">
                                    <b>B</b>
                                </button>
                                <button type="button" class="toolbar-btn" data-action="italic" title="斜体 (Ctrl+I)">
                                    <i>I</i>
                                </button>
                                <button type="button" class="toolbar-btn" data-action="underline" title="下划线 (Ctrl+U)">
                                    <u>U</u>
                                </button>
                                <button type="button" class="toolbar-btn" data-action="strike" title="删除线">
                                    <s>S</s>
                                </button>
                                <span class="toolbar-divider"></span>
                                <button type="button" class="toolbar-btn custom-emote-toggle" data-action="custom-emoji" title="插入表情" aria-label="插入表情">
                                    <img src="${getCustomEmojiUrl('Forum48.png')}" alt="表情" class="custom-emote-toggle-icon">
                                </button>
                                <button type="button" class="toolbar-btn image-btn" data-action="image" title="插入图片" id="insert-image-btn" style="display: none;">
                                    图
                                </button>
                            </div>
                            <input type="file" id="image-upload" accept="${getUploadImageAcceptValue()}" style="display: none;">
                            <div class="upload-status" id="reply-upload-status" aria-live="polite" style="display: none;"></div>
                            ${buildCustomEmojiPickerHtml()}
                            <textarea id="reply-content" class="reply-content-area" placeholder="分享你的看法..."></textarea>
                            <input type="hidden" id="reply-target" name="reply-target" value="">
                            <div class="reply-preview-box" id="reply-preview-box">
                                <h5>预览</h5>
                                <div class="reply-preview-content" id="reply-preview-content"></div>
                            </div>
                            <div class="reply-actions">
                                <button type="submit" class="reply-submit-btn">发表回复</button>
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
                            <a href="login.html?redirect=${encodeURIComponent(window.location.href)}" style="color: #0066cc; text-decoration: none;">立即登录</a>
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

    if (!isLoggedIn) {
        threadContainer.innerHTML = `
            <div class="thread-header">
                <div class="thread-title">${postData.title}</div>
                <span>作者：${buildUserLinkHtml(postData.userId, postData.author)}</span> | 
                <span>发表于：${postData.publishTime}</span> | 
                <span>浏览：${formatViewCount(postData.viewCount)}次</span>
            </div>
            <div class="post" style="padding: 30px 20px; text-align: center;">
                <div style="font-size: 16px; color: #cc0000; margin-bottom: 12px;">本帖内容仅限登录后查看</div>
                <div style="color: #666; margin-bottom: 12px;">请先登录后查看正文和回帖内容</div>
                <a href="login.html?redirect=${encodeURIComponent(window.location.href)}" style="color: #0066cc; text-decoration: none;">立即登录</a>
            </div>
        `;
        return;
    }

    const allPosts = buildDiscussionPostList(postData);

    // 分页配置
    const PAGE_SIZE = POST_PAGE_SIZE;
    const urlParams = new URLSearchParams(window.location.search);
    const totalPosts = allPosts.length;
    const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));
    const requestedPage = parseInt(urlParams.get('page'), 10) || 1;
    const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
    
    // 计算当前页显示的帖子范围
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, totalPosts);
    const currentPagePosts = allPosts.slice(startIndex, endIndex);
    
    // 获取当前页可见的楼层范围（用于楼中楼跳转判断）
    const visibleFloors = currentPagePosts.map(p => p.floor);

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
            <span>作者：${buildUserLinkHtml(postData.userId, postData.author)}</span> | 
            <span>发表于：${postData.publishTime}</span> | 
            <span>浏览：${formatViewCount(postData.viewCount)}次</span>
            <a href="#" id="delete-discussion-link" style="display: none; margin-left: 10px; color: #cc0000;">删除帖子</a>
        </div>
        
        ${currentPagePosts.map((post, index) => {
            // 检查是否是删除标记
            const deletedInfo = parseDeletedContent(post.content);
            if (deletedInfo) {
                // 显示删除提示（包含楼层号）
                return `
                    <div class="post" id="post-${post.floor}" data-post-id="${post.id}" style="background-color: #f5f5f5; border: 1px dashed #ccc; padding: 15px; text-align: center;">
                        <p style="color: #999; font-size: 14px;">第 ${post.floor} 楼已在【${deletedInfo.deletedAt}】被【${deletedInfo.deletedBy}】删除</p>
                    </div>
                `;
            }

            return buildForumPostHtml(post, allPosts, postData, {
                visibleFloors,
                pageSize: PAGE_SIZE
            });
        }).join('')}
        
        ${generatePaginationHTML()}
        
        <div class="forum-stats">
            <span>共 ${totalPosts} 楼</span>
            <span>当前第 ${currentPage} / ${totalPages} 页</span>
            <span>最后回复：${postData.comments.length > 0 ? postData.comments[postData.comments.length - 1].time : postData.publishTime}</span>
        </div>
    `;

    setupReplyButtons(postData);
    setupDeleteButtons(allPosts, postData);
    updatePostUserBadges(allPosts);
    
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

function buildDiscussionPostList(postData) {
    return [{
        id: 0,
        userId: postData.userId,
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
}

function resolveDiscussionPageTarget(allPosts, targetPostId) {
    const normalizedPosts = Array.isArray(allPosts) ? allPosts : [];
    const index = normalizedPosts.findIndex((post) => String(post?.id) === String(targetPostId));
    const safeIndex = index >= 0 ? index : Math.max(normalizedPosts.length - 1, 0);
    const targetPost = normalizedPosts[safeIndex] || normalizedPosts[0] || null;

    return {
        index: safeIndex,
        page: Math.floor(safeIndex / POST_PAGE_SIZE) + 1,
        floor: targetPost?.floor || null
    };
}

function syncDiscussionLocation(postId, page, floor) {
    const url = new URL(window.location.href);
    url.searchParams.set('id', String(postId));
    if (Number(page) > 1) {
        url.searchParams.set('page', String(page));
    } else {
        url.searchParams.delete('page');
    }
    url.hash = floor ? `post-${floor}` : '';
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

// 设置回复按钮
function setupReplyButtons(postData) {
    const replyLinks = document.querySelectorAll('.reply-link');
    const replyTargetInput = document.getElementById('reply-target');
    const replyContent = document.getElementById('reply-content');
    const replyBoxTitle = document.querySelector('.reply-box h4');
    const cancelReply = document.getElementById('cancel-reply');

    if (!replyTargetInput || !replyContent || !replyBoxTitle || !cancelReply) return;

    replyLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const floor = this.dataset.floor;
            const author = this.dataset.author;
            
            replyTargetInput.value = floor;
            replyContent.value = `回复 ${author}(${floor}楼)：`;
            replyBoxTitle.textContent = `回复 ${author}(${floor}楼)`;
            cancelReply.style.display = 'inline';
            replyContent.dispatchEvent(new Event('input', { bubbles: true }));
            syncReplyComposerDraft();
            replyContent.focus();
        });
    });
}

// 设置删除按钮
async function setupDeleteButtons(allPosts, postData) {
    const deleteLinks = document.querySelectorAll('.delete-link');
    
    for (const link of deleteLinks) {
        const postId = Number(link.dataset.postId);
        const floor = Number(link.dataset.floor);
        
        // 找到对应的帖子
        const post = allPosts.find(p => p.id === postId || p.floor === floor);
        
        // 检查是否有权限删除
        if (post && await canDeletePost(post)) {
            link.style.display = 'inline';
            
            // 显示分隔符
            const divider = link.parentElement.querySelector('.reply-divider');
            if (divider) {
                divider.style.display = 'inline';
            }
            
            link.addEventListener('click', async function(e) {
                e.preventDefault();
                
                // 二次确认
                if (!confirm(`确定要删除第 ${floor} 楼的帖子吗？此操作不可撤销。`)) {
                    return;
                }
                
                // 执行删除
                const success = await flarumDeletePost(postId, floor);
                if (success) {
                    // 获取当前登录用户信息
                    const currentUsername = localStorage.getItem('flarumUsername') || '匿名用户';
                    const now = new Date();
                    const deleteTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                    
                    // 在原地显示删除提示
                    const postElement = document.getElementById(`post-${floor}`);
                    if (postElement) {
                        postElement.innerHTML = `
                            <div class="post" id="post-${floor}" style="background-color: #f5f5f5; border: 1px dashed #ccc; padding: 15px; text-align: center;">
                                <p style="color: #999; font-size: 14px;">此楼层已在【${deleteTime}】被【${currentUsername}】删除</p>
                            </div>
                        `;
                    }
                }
            });
        }
    }
    
    // 设置删除整个帖子的按钮
    const deleteDiscussionLink = document.getElementById('delete-discussion-link');
    if (deleteDiscussionLink && postData) {
        // 检查是否有权限删除整个帖子（主题帖的作者或管理员）
        const isAuthor = localStorage.getItem('flarumUserId') === String(postData.userId);
        const isAdmin = await isCurrentUserAdmin();
        
        if (isAuthor || isAdmin) {
            deleteDiscussionLink.style.display = 'inline';
            
            deleteDiscussionLink.addEventListener('click', async function(e) {
                e.preventDefault();
                
                // 二次确认
                if (!confirm(`确定要删除整个帖子「${postData.title}」吗？此操作将删除所有回复，不可撤销。`)) {
                    return;
                }
                
                // 执行删除
                const success = await flarumDeleteDiscussion(postData.id);
                if (success) {
                    alert('删除成功！');
                    // 返回首页
                    window.location.href = 'index.html';
                }
            });
        }
    }
}

// 更新帖子中的用户名显示，添加用户组标志
async function updatePostUserBadges(allPosts) {
    for (const post of allPosts) {
        if (!post.userId) continue;
        
        const badgeType = await getUserGroupBadgeType(post.userId);
        if (!badgeType) continue;
        
        // 更新帖子中的用户名显示
        const posterNameElements = document.querySelectorAll(`#post-${post.floor} .poster-name`);
        for (const element of posterNameElements) {
            // 检查是否已经添加过标志
            if (element.querySelector('.group-badge')) continue;
            
            // 创建标志元素
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
                badge.textContent = '管';
            } else if (badgeType === 'mod') {
                badge.style.backgroundColor = '#0066cc';
                badge.textContent = '版';
            }
            
            element.insertBefore(badge, element.firstChild);
        }
    }
}

// 获取用户组标志类型
async function getUserGroupBadgeType(userId) {
    if (!userId) return '';
    
    try {
        const userJson = await flarumRequest(`/users/${userId}`);
        const groups = userJson?.data?.relationships?.groups?.data || [];
        
        // 检查是否是管理员（组ID为1）
        const isAdmin = groups.some(g => g.id === '1');
        if (isAdmin) return 'admin';
        
        // 检查是否是版主（组ID为2）
        const isMod = groups.some(g => g.id === '2');
        if (isMod) return 'mod';
    } catch {
        // 忽略错误
    }
    
    return '';
}

let currentUserRoleContextCacheKey = '';
let currentUserRoleContextCachePromise = null;

async function getCurrentUserRoleContext() {
    const token = getFlarumToken();
    const userId = localStorage.getItem('flarumUserId');
    if (!token || !userId) {
        currentUserRoleContextCacheKey = '';
        currentUserRoleContextCachePromise = null;
        return { userId: '', groupIds: [], isAdmin: false, user: null };
    }

    const cacheKey = `${String(userId)}:${String(token)}`;
    if (currentUserRoleContextCachePromise && currentUserRoleContextCacheKey === cacheKey) {
        return currentUserRoleContextCachePromise;
    }

    currentUserRoleContextCacheKey = cacheKey;
    currentUserRoleContextCachePromise = (async () => {
        try {
            const userJson = await flarumRequest(`/users/${userId}?include=groups`, { auth: true });
            const groups = userJson?.data?.relationships?.groups?.data || [];
            const groupIds = Array.isArray(groups) ? groups.map((g) => String(g?.id || '')).filter(Boolean) : [];
            return {
                userId: String(userId),
                groupIds,
                isAdmin: groupIds.includes('1'),
                user: userJson?.data || null
            };
        } catch {
            return {
                userId: String(userId),
                groupIds: [],
                isAdmin: false,
                user: null
            };
        }
    })();

    return currentUserRoleContextCachePromise;
}

// 检查当前用户是否是管理员
async function isCurrentUserAdmin() {
    try {
        const roleContext = await getCurrentUserRoleContext();
        return !!roleContext.isAdmin;
    } catch {
        return false;
    }
}

// 获取当前登录用户信息
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
        console.error('获取当前用户信息失败:', error);
    }
    
    return null;
}

// 更新回复表单以反映登录状态
async function updateReplyFormForLoginStatus() {
    const isLoggedIn = !!getFlarumToken();
    const replyBox = document.getElementById('reply-box');
    
    if (!replyBox) return;
    syncReplyComposerDraft();
    const nextAuthState = isLoggedIn ? 'logged-in' : 'logged-out';
    if (replyBox.dataset.authState === nextAuthState) {
        const hasExpectedContent = isLoggedIn
            ? !!replyBox.querySelector('#reply-form')
            : !replyBox.querySelector('#reply-form');
        if (hasExpectedContent) {
            if (isLoggedIn) restoreReplyComposerDraft();
            return;
        }
    }
    
    if (isLoggedIn) {
        // 已登录：显示用户信息和回复表单
        const username = localStorage.getItem('flarumUsername') || '已登录用户';
        
        // 获取用户头像
        let avatarUrl = 'images/用户头像.png';
        if (isFlarumConfigured()) {
            const user = await getCurrentUser();
            if (user && user.avatar) {
                avatarUrl = user.avatar;
            }
        }
        
        replyBox.innerHTML = `
            <h4>发表回复</h4>
            <div class="current-user-info reply-user-info">
                <img src="${avatarUrl}" alt="头像" class="reply-user-avatar">
                <div>
                    <div class="reply-user-name">${username}</div>
                    <div class="reply-user-level">Lv.1 新手上路</div>
                </div>
            </div>
            <form class="reply-form" id="reply-form">
                <div class="toolbar reply-toolbar">
                    <button type="button" class="toolbar-btn" data-action="bold" title="粗体 (Ctrl+B)">
                        <b>B</b>
                    </button>
                    <button type="button" class="toolbar-btn" data-action="italic" title="斜体 (Ctrl+I)">
                        <i>I</i>
                    </button>
                    <button type="button" class="toolbar-btn" data-action="underline" title="下划线 (Ctrl+U)">
                        <u>U</u>
                    </button>
                    <button type="button" class="toolbar-btn" data-action="strike" title="删除线">
                        <s>S</s>
                    </button>
                    <span class="toolbar-divider"></span>
                    <button type="button" class="toolbar-btn custom-emote-toggle" data-action="custom-emoji" title="插入表情" aria-label="插入表情">
                        <img src="${getCustomEmojiUrl('Forum48.png')}" alt="表情" class="custom-emote-toggle-icon">
                    </button>
                    <button type="button" class="toolbar-btn image-btn" data-action="image" title="插入图片" id="insert-image-btn" style="display: none;">
                        图
                    </button>
                </div>
                <input type="file" id="image-upload" accept="${getUploadImageAcceptValue()}" style="display: none;">
                <div class="upload-status" id="reply-upload-status" aria-live="polite" style="display: none;"></div>
                ${buildCustomEmojiPickerHtml()}
                <textarea id="reply-content" class="reply-content-area" placeholder="分享你的看法..."></textarea>
                <input type="hidden" id="reply-target" name="reply-target" value="">
                <div class="reply-preview-box" id="reply-preview-box">
                    <h5>预览</h5>
                    <div class="reply-preview-content" id="reply-preview-content"></div>
                </div>
                <div class="reply-actions">
                    <button type="submit" class="reply-submit-btn">发表回复</button>
                    <a href="#" class="cancel-reply" id="cancel-reply" style="display: none;">取消回复</a>
                </div>
            </form>
        `;
        replyBox.dataset.authState = nextAuthState;
        // 重新绑定表单事件
        setupReplyForm();
        restoreReplyComposerDraft();
    } else {
        // 未登录：直接显示登录提示，替换整个回复区域
        replyBox.innerHTML = `
            <h4>发表回复</h4>
            <div style="padding: 20px; background: #fff3f3; border: 1px solid #ffcccc; border-radius: 4px; text-align: center;">
                <div style="font-size: 16px; color: #cc0000; margin-bottom: 10px;">未登录用户不可回复</div>
                <a href="login.html?redirect=${encodeURIComponent(window.location.href)}" style="color: #0066cc; text-decoration: none;">点击登录</a>
            </div>
        `;
        replyBox.dataset.authState = nextAuthState;
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
    const previewBox = document.getElementById('reply-preview-box');
    const previewContent = document.getElementById('reply-preview-content');

    if (!replyForm || !replyTargetInput || !replyContent || !replyBoxTitle) return;

    // 初始化工具栏
    initToolbar();
    bindCustomEmojiPicker(replyForm, replyContent);
    restoreReplyComposerDraft();

    // 检查用户权限，显示/隐藏图片按钮
    checkImagePermission();

    if (replyContent.dataset.boundReplyDraft !== '1') {
        replyContent.dataset.boundReplyDraft = '1';
        ['input', 'click', 'keyup', 'select'].forEach((eventName) => {
            replyContent.addEventListener(eventName, () => {
                syncReplyComposerDraft();
            });
        });
    }

    if (replyContent.dataset.boundReplyAutoPreview !== '1') {
        replyContent.dataset.boundReplyAutoPreview = '1';
        const updateReplyPreview = createDebouncedPreviewUpdater(() => {
            updateComposerPreviewBox(replyContent.value, previewBox, previewContent, expandCustomEmojiTokens);
        }, 300);
        ['input', 'click', 'keyup', 'select', 'change'].forEach((eventName) => {
            replyContent.addEventListener(eventName, updateReplyPreview);
        });
        updateReplyPreview();
    }

    if (replyTargetInput.dataset.boundReplyDraft !== '1') {
        replyTargetInput.dataset.boundReplyDraft = '1';
        replyTargetInput.addEventListener('change', () => {
            syncReplyComposerDraft();
        });
    }

    // 取消回复按钮（避免重复绑定）
    if (cancelReply && cancelReply.dataset.boundReplyCancel !== '1') {
        cancelReply.dataset.boundReplyCancel = '1';
        cancelReply.addEventListener('click', (e) => {
            e.preventDefault();
            replyTargetInput.value = '';
            replyContent.value = '';
            replyBoxTitle.textContent = '发表回复';
            cancelReply.style.display = 'none';
            if (previewBox) previewBox.style.display = 'none';
            setUploadStatus(document.getElementById('reply-upload-status'), '', 'info');
            clearReplyComposerDraft();
        });
    }

    // 表单提交（避免重复绑定）
    if (replyForm.dataset.boundReplySubmit !== '1') {
        replyForm.dataset.boundReplySubmit = '1';
        const submitReply = async () => {
            if (replyForm.dataset.replySubmitting === '1') return;

            const submitBtn = replyForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.textContent : '';
            const rawContent = replyContent.value.trim();
            const replyTo = replyTargetInput.value;
            const composerBody = replyTo
                ? stripComposerReplyPrefix(rawContent).trim()
                : rawContent;
            const urlParams = new URLSearchParams(window.location.search);
            const postId = urlParams.get('id') || '';
            const requestParams = {
                discussionId: postId ? String(postId) : '',
                replyTo: replyTo || null,
                contentLength: composerBody.length
            };

            replyForm.dataset.replySubmitting = '1';
            if (submitBtn) {
                submitBtn.textContent = '提交中...';
                submitBtn.disabled = true;
            }

            try {
                if (!composerBody) {
                    throw createComposerValidationError('请输入回复内容', [
                        { field: 'content', reason: '回复内容不能为空', value: rawContent }
                    ]);
                }

                if (!postId) {
                    throw createComposerValidationError('未找到当前帖子编号，请刷新页面后重试。', [
                        { field: 'discussionId', reason: '帖子编号缺失', value: postId }
                    ]);
                }

                const content = expandCustomEmojiTokens(composerBody);

                // 获取当前帖子数据（从内存或缓存，避免重新加载）
                let postData = window.currentPostData;
                if (!postData) {
                    postData = await loadPostData(postId);
                    if (!postData) {
                        throw createComposerValidationError('无法获取当前帖子数据，请刷新页面后重试。', [
                            { field: 'discussionId', reason: '帖子上下文加载失败', value: postId }
                        ]);
                    }
                    window.currentPostData = postData;
                }

                const contentToSend = replyTo
                    ? `回复 ${replyTo}楼：\n\n${content}`
                    : content;
                const requestBody = {
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
                };
                const response = await flarumRequest('/posts', {
                    method: 'POST',
                    auth: true,
                    json: requestBody
                });

                if (!response?.data?.id) {
                    const missingPostIdError = new Error('回复接口未返回新回复编号');
                    missingPostIdError.code = 'missing_post_id';
                    throw missingPostIdError;
                }

                const createdPostId = String(response.data.id);
                const replyToFloor = Number(replyTo);
                if (createdPostId && Number.isFinite(replyToFloor) && replyToFloor > 0) {
                    storeFlarumReplyToFloor(postId, createdPostId, replyToFloor);
                }
                replyContent.value = '';
                replyTargetInput.value = '';
                if (cancelReply) cancelReply.style.display = 'none';
                replyBoxTitle.textContent = '发表回复';
                if (previewBox) previewBox.style.display = 'none';
                setUploadStatus(document.getElementById('reply-upload-status'), '', 'info');
                clearReplyComposerDraft();

                // 重新加载帖子数据并更新UI
                const newPostData = await loadPostData(postId);
                if (newPostData) {
                    const allPosts = buildDiscussionPostList(newPostData);
                    const targetState = resolveDiscussionPageTarget(allPosts, createdPostId);
                    window.currentPostData = newPostData;
                    syncDiscussionLocation(postId, targetState.page, targetState.floor || '');
                    renderForumThread(newPostData);
                }
            } catch (error) {
                presentComposerSubmissionError(error, {
                    context: 'create_post',
                    operationLabel: '回帖',
                    requestParams,
                    onRetry: () => {
                        void submitReply();
                    }
                });
            } finally {
                replyForm.dataset.replySubmitting = '0';
                if (submitBtn) {
                    submitBtn.textContent = originalBtnText;
                    submitBtn.disabled = false;
                }
            }
        };

        replyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            void submitReply();
        });
    }
}

// 初始化工具栏
function initToolbar() {
    const toolbar = document.querySelector('.reply-form .toolbar');
    const imageUpload = document.getElementById('image-upload');
    const replyContent = document.getElementById('reply-content');
    const uploadStatus = document.getElementById('reply-upload-status');

    if (!toolbar) return;

    // 工具栏按钮点击事件
    toolbar.addEventListener('click', function(e) {
        const target = e.target.closest('.toolbar-btn');
        if (!target) return;
        
        const action = target.dataset.action;
        if (!action) return;

        switch (action) {
            case 'bold':
                wrapSelection(replyContent, '**', '**');
                syncReplyComposerDraft();
                break;
            case 'italic':
                wrapSelection(replyContent, '*', '*');
                syncReplyComposerDraft();
                break;
            case 'underline':
                wrapSelection(replyContent, '__', '__');
                syncReplyComposerDraft();
                break;
            case 'strike':
                wrapSelection(replyContent, '~~', '~~');
                syncReplyComposerDraft();
                break;
            case 'image':
                rememberTextareaSelection(replyContent);
                syncReplyComposerDraft();
                imageUpload.click();
                break;
        }
    });

    // 图片上传
    imageUpload?.addEventListener('change', async function(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        const getLiveUploadStatus = () => document.getElementById('reply-upload-status') || uploadStatus;

        if (!isAllowedUploadImage(file)) {
            setUploadStatus(getLiveUploadStatus(), getUploadImageFormatHint(), 'error');
            imageUpload.value = '';
            return;
        }
        
        if (file.size > getUploadImageMaxSizeBytes()) {
            setUploadStatus(getLiveUploadStatus(), getUploadImageSizeHint('图片'), 'error');
            imageUpload.value = '';
            return;
        }

        try {
            syncReplyComposerDraft();
            setUploadStatus(getLiveUploadStatus(), `正在上传 ${file.name}...`, 'loading');
            const formData = new FormData();
            formData.append('files[]', file);

            const apiBase = getFlarumApiBase();
            const token = getFlarumToken();
            const userId = localStorage.getItem('flarumUserId');
            const headers = {};
            if (token) {
                headers.Authorization = userId
                    ? `Token ${token}; userId=${userId}`
                    : `Token ${token}`;
            }

            const response = await fetch(`${apiBase}/fof/upload`, {
                method: 'POST',
                headers,
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                const error = new Error(`上传失败: ${response.status}`);
                error.httpStatus = response.status;
                try {
                    const detailJson = await response.json();
                    error.detail = JSON.stringify(detailJson);
                    error.apiError = parseApiErrorDetail(error.detail);
                } catch {
                    error.detail = await response.text();
                    error.apiError = parseApiErrorDetail(error.detail);
                }
                throw error;
            }

            const json = await response.json();
            const contentToInsert = getUploadedContentForEditor(json, file.name);
            if (contentToInsert) {
                const liveTextarea = document.getElementById(replyContent.id) || replyContent;
                restoreTextareaSelection(liveTextarea);
                insertAtCursor(liveTextarea, contentToInsert);
                syncReplyComposerDraft();
                setUploadStatus(getLiveUploadStatus(), `已插入图片：${file.name}`, 'success');
            } else {
                throw new Error('未返回可用的上传内容');
            }
        } catch (error) {
            console.error('图片上传失败:', error);
            setUploadStatus(getLiveUploadStatus(), getFriendlyErrorMessage(error, 'upload_image'), 'error');
        } finally {
            imageUpload.value = '';
        }
    });

    // 快捷键支持
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

// 在光标位置插入文本
function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    textarea.value = before + text + after;
    
    // 设置光标位置
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

// 包裹选中的文本
function wrapSelection(textarea, before, after, newLine = false) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);
    
    let newText;
    if (newLine) {
        // 引用需要在新行开始
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
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

// 登录用户即可使用图片上传
async function checkImagePermission() {
    const insertImageBtn = document.getElementById('insert-image-btn');
    if (!insertImageBtn) return;

    const token = getFlarumToken();
    insertImageBtn.style.display = token ? 'inline-block' : 'none';
}

// 将新评论直接插入到页面中（无需重新渲染整个帖子）
function insertNewCommentToPage(comment, postData) {
    const threadContainer = document.querySelector('.forum-thread');
    if (!threadContainer) return;
    
    // 更新评论计数
    const commentCountElement = document.querySelector('.post-stats span:last-child');
    if (commentCountElement) {
        const currentCount = postData.comments.length;
        commentCountElement.textContent = `评论: ${currentCount}`;
    }
    
    // 生成新评论的HTML
    const allPosts = buildDiscussionPostList(postData);
    const normalizedComment = {
        ...comment,
        content: cleanupThreadedReplyHtml(comment.content),
        isOp: isOriginalPosterReply(comment, postData)
    };
    const commentHTML = buildForumPostHtml(normalizedComment, [...allPosts, normalizedComment], postData, {
        visibleFloors: [...allPosts, normalizedComment].map((item) => item.floor),
        pageSize: POST_PAGE_SIZE
    });
    
    // 插入到帖子列表末尾
    threadContainer.insertAdjacentHTML('beforeend', commentHTML);
    
    // 为新插入的回复按钮绑定事件
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
                replyContent.value = `回复 ${author}(${floor}楼)：`;
                replyBoxTitle.textContent = `回复 ${author}(${floor}楼)`;
                document.getElementById('cancel-reply').style.display = 'inline';
                replyContent.dispatchEvent(new Event('input', { bubbles: true }));
                syncReplyComposerDraft();
                replyContent.focus();
            }
        });
    }
}

// 更新用户导航链接
function updateUserLinks() {
    const userLinksContainer = document.getElementById('user-links-container');
    if (!userLinksContainer) return;
    
    const userLoggedIn = !!getFlarumToken();
    
    if (userLoggedIn) {
        userLinksContainer.innerHTML = `
            <a href="#" id="nav-logout-btn">退出登录</a>
        `;
        
        const logoutBtn = document.getElementById('nav-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                clearFlarumToken();
                window.location.href = 'index.html';
            });
        }
    } else {
        userLinksContainer.innerHTML = `
            <a href="login.html?redirect=${encodeURIComponent(window.location.href)}" id="login-btn">登录</a>
            <a href="register.html?redirect=${encodeURIComponent(window.location.href)}" id="register-btn">注册</a>
        `;
    }
}

function bindMyDragonflyEntry() {
    const containers = document.querySelectorAll('.status-container');
    if (!containers || containers.length === 0) return;

    containers.forEach((container) => {
        const children = Array.from(container.children || []);
        const entry = children.find((el) => {
            const text = String(el?.textContent || '').trim();
            return text === '我的红蜻蜓';
        });

        if (!entry) return;
        if (entry.dataset && entry.dataset.boundMyDragonfly === '1') return;

        entry.style.cursor = 'pointer';
        entry.setAttribute('role', 'button');
        entry.setAttribute('tabindex', '0');

        const navigate = () => {
            const isLoggedIn = !!getFlarumToken();
            if (isLoggedIn) {
                window.location.href = 'profile.html';
            } else {
                window.location.href = `login.html?redirect=${encodeURIComponent('profile.html')}`;
            }
        };

        entry.addEventListener('click', navigate);
        entry.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate();
            }
        });

        if (entry.dataset) entry.dataset.boundMyDragonfly = '1';
    });
}

async function updateProfileAdminBroadcastLink() {
    const link = document.getElementById('profile-admin-broadcast-link');
    if (!link) return;
    if (!getFlarumToken() || !localStorage.getItem('flarumUserId')) {
        link.style.display = 'none';
        return;
    }
    const isAdmin = await isCurrentUserAdmin().catch(() => false);
    link.style.display = isAdmin ? 'inline-block' : 'none';
}

function refreshAuthDependentUI() {
    try {
        updateUserLinks();
    } catch (_) {}

    try {
        bindMyDragonflyEntry();
    } catch (_) {}

    try {
        refreshShortMessagesEntry();
    } catch (_) {}

    try {
        setupStatusBarClock();
    } catch (_) {}

    try {
        updateProfileAdminBroadcastLink();
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

// 浏览器从 bfcache 恢复页面时，DOMContentLoaded 不会再次触发。
// 在 pageshow/focus 阶段主动刷新登录态，避免顶部导航显示旧状态。
window.addEventListener('pageshow', refreshAuthDependentUI);
window.addEventListener('focus', refreshAuthDependentUI);

window.addEventListener('storage', function(e) {
    if (!e || e.key === null || e.key === 'flarumToken' || e.key === 'flarumUserId' || e.key === 'flarumUsername') {
        refreshAuthDependentUI();
    }
});

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

    if (ad.dataset.boundAdClick !== '1') {
        ad.dataset.boundAdClick = '1';
        ad.removeAttribute('onclick');
        ad.onclick = null;
        ad.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            openInNewTab(AD_TARGET_URL);
        });
    }
    
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

    if (ad.dataset.boundAdClick !== '1') {
        ad.dataset.boundAdClick = '1';
        ad.removeAttribute('onclick');
        ad.onclick = null;
        ad.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            openInNewTab(AD_TARGET_URL);
        });
    }
    
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

    const pathname = String(window.location.pathname || '').toLowerCase();
    const normalizedPath = pathname.replace(/\/+$/, '');
    const segments = normalizedPath.split('/').filter(Boolean);
    const leaf = segments[segments.length - 1] || '';
    const isHomePage = normalizedPath === '' ||
        normalizedPath === '/' ||
        leaf === 'index.html' ||
        (segments.length === 1 && leaf === 'rdfseeu');

    const hidePopup = () => {
        popupAd.style.display = 'none';
        if (leftCloseBtn) leftCloseBtn.style.display = 'none';
        if (popupAudio) popupAudio.pause();
    };

    if (!isHomePage) {
        hidePopup();
        return;
    }

    const dismissKey = 'popupAdDismissed';
    try {
        if (sessionStorage.getItem(dismissKey) === '1') {
            hidePopup();
            return;
        }
    } catch (_) {}

    const dismissOnce = () => {
        try { sessionStorage.setItem(dismissKey, '1'); } catch (_) {}
        hidePopup();
    };

    const openAdTarget = () => {
        openInNewTab(AD_TARGET_URL);
    };
    
    // 设置弹窗广告音量为1/3
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
    
    // 立即显示弹窗广告和左侧假关闭按钮
    setTimeout(function() {
        try {
            if (sessionStorage.getItem(dismissKey) === '1') return;
        } catch (_) {}
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
            popupAudio.volume = 1/3; // 在播放前再次设置音量
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
        dismissOnce();
    });

    const popupContent = popupAd.querySelector('.popup-content');
    if (popupContent && popupContent.dataset.boundPopupContent !== '1') {
        popupContent.dataset.boundPopupContent = '1';
        popupContent.removeAttribute('onclick');
        popupContent.onclick = null;
        popupContent.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            dismissOnce();
            openAdTarget();
        });
    }

    // 处理假关闭按钮的点击跳转
    const fakeCloseBtn = popupAd.querySelector('.fake-close-btn');
    if (fakeCloseBtn) {
        fakeCloseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            dismissOnce();
            openAdTarget();
        });
    }

    if (leftCloseBtn) {
        const sideFakeBtn = leftCloseBtn.querySelector('.popup-close');
        if (sideFakeBtn) {
            sideFakeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                dismissOnce();
                openAdTarget();
            });
        }
    }
}
