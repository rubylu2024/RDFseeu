const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Flarum API base URL - update this to your actual Flarum URL
const FLARUM_BASE_URL = process.env.FLARUM_BASE_URL || 'http://localhost';
const MAX_UPLOAD_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_MULTIPART_PROXY_BYTES = 20 * 1024 * 1024;

// Middleware
app.use(express.json());
app.get(['/index.html', '/index.htm'], (req, res) => {
  const queryIndex = req.originalUrl.indexOf('?');
  const hashIndex = req.originalUrl.indexOf('#');
  const splitIndex = [queryIndex, hashIndex].filter(index => index >= 0).sort((a, b) => a - b)[0];
  const suffix = splitIndex >= 0 ? req.originalUrl.slice(splitIndex) : '';
  res.redirect(301, '/' + suffix);
});
app.use(express.static(path.join(__dirname)));

const CUSTOM_MESSAGES_STORE_FILE = path.join(__dirname, 'custom-messages-store.json');

function loadCustomMessagesStore() {
  try {
    if (!fs.existsSync(CUSTOM_MESSAGES_STORE_FILE)) {
      return {
        publicMessages: [],
        publicReads: [],
        nextPublicMessageId: 1,
        nextPublicReadId: 1
      };
    }
    const raw = fs.readFileSync(CUSTOM_MESSAGES_STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return {
      publicMessages: Array.isArray(parsed.publicMessages) ? parsed.publicMessages : [],
      publicReads: Array.isArray(parsed.publicReads) ? parsed.publicReads : [],
      nextPublicMessageId: Number.isFinite(Number(parsed.nextPublicMessageId)) ? Number(parsed.nextPublicMessageId) : 1,
      nextPublicReadId: Number.isFinite(Number(parsed.nextPublicReadId)) ? Number(parsed.nextPublicReadId) : 1
    };
  } catch {
    return {
      publicMessages: [],
      publicReads: [],
      nextPublicMessageId: 1,
      nextPublicReadId: 1
    };
  }
}

function saveCustomMessagesStore(store) {
  try {
    const safe = {
      publicMessages: Array.isArray(store.publicMessages) ? store.publicMessages : [],
      publicReads: Array.isArray(store.publicReads) ? store.publicReads : [],
      nextPublicMessageId: Number.isFinite(Number(store.nextPublicMessageId)) ? Number(store.nextPublicMessageId) : 1,
      nextPublicReadId: Number.isFinite(Number(store.nextPublicReadId)) ? Number(store.nextPublicReadId) : 1
    };
    const tmp = CUSTOM_MESSAGES_STORE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(safe, null, 2), 'utf8');
    fs.renameSync(tmp, CUSTOM_MESSAGES_STORE_FILE);
  } catch (error) {
    const err = new Error('store_write_failed');
    err.status = 500;
    err.detail = {
      message: '保存公共短消息失败（写入文件失败）',
      storeFile: CUSTOM_MESSAGES_STORE_FILE,
      error: String(error?.message || error)
    };
    throw err;
  }
}

function parseAuthHeader(authHeader) {
  const raw = typeof authHeader === 'string' ? authHeader.trim() : '';
  if (!raw) return null;
  const tokenMatch = raw.match(/^Token\s+([^;]+)(?:;\s*userId\s*=\s*([0-9]+))?(?:\s*;.*)?$/i);
  if (!tokenMatch) return null;
  return {
    token: tokenMatch[1],
    userId: tokenMatch[2] ? String(tokenMatch[2]) : null,
    raw
  };
}

function getUploadImageMaxSizeLabel() {
  return '2MB';
}

function getUploadCompressionSuggestion() {
  return '建议先用 TinyPNG、Squoosh 等工具压缩后再上传。';
}

function getUploadLimitErrorDetail(label = '图片') {
  return `${label}大小不能超过 ${getUploadImageMaxSizeLabel()}。${getUploadCompressionSuggestion()}`;
}

function sendJsonApiUploadError(res, status, code, detail, title = '上传失败') {
  return res.status(status).json({
    errors: [
      {
        status: String(status),
        code,
        title,
        detail
      }
    ]
  });
}

function getMultipartBoundary(contentType) {
  const raw = typeof contentType === 'string' ? contentType : '';
  const match = raw.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return match ? String(match[1] || match[2] || '').trim() : '';
}

function parseMultipartFileParts(buffer, contentType) {
  const boundary = getMultipartBoundary(contentType);
  if (!boundary || !Buffer.isBuffer(buffer) || buffer.length === 0) return [];

  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const headerSeparator = Buffer.from('\r\n\r\n');
  const parts = [];
  let cursor = 0;

  while (cursor < buffer.length) {
    const boundaryIndex = buffer.indexOf(boundaryBuffer, cursor);
    if (boundaryIndex === -1) break;

    let sectionStart = boundaryIndex + boundaryBuffer.length;
    const nextTwo = buffer.slice(sectionStart, sectionStart + 2).toString('latin1');
    if (nextTwo === '--') break;
    if (nextTwo === '\r\n') sectionStart += 2;

    const nextBoundaryIndex = buffer.indexOf(boundaryBuffer, sectionStart);
    if (nextBoundaryIndex === -1) break;

    let sectionEnd = nextBoundaryIndex;
    if (buffer.slice(sectionEnd - 2, sectionEnd).toString('latin1') === '\r\n') {
      sectionEnd -= 2;
    }

    const headerEnd = buffer.indexOf(headerSeparator, sectionStart);
    if (headerEnd === -1 || headerEnd > sectionEnd) {
      cursor = nextBoundaryIndex + boundaryBuffer.length;
      continue;
    }

    const headerText = buffer.slice(sectionStart, headerEnd).toString('utf8');
    const bodyStart = headerEnd + headerSeparator.length;
    const bodyBuffer = buffer.slice(bodyStart, sectionEnd);
    const dispositionMatch = headerText.match(/content-disposition:[^\r\n]*name="([^"]*)"(?:;[^\r\n]*filename="([^"]*)")?/i);
    const fieldName = dispositionMatch ? String(dispositionMatch[1] || '') : '';
    const fileName = dispositionMatch ? String(dispositionMatch[2] || '') : '';
    const contentTypeMatch = headerText.match(/content-type:\s*([^\r\n]+)/i);
    const partContentType = contentTypeMatch ? String(contentTypeMatch[1] || '').trim() : '';

    if (fileName) {
      parts.push({
        fieldName,
        fileName,
        contentType: partContentType,
        size: bodyBuffer.length
      });
    }

    cursor = nextBoundaryIndex + boundaryBuffer.length;
  }

  return parts;
}

async function proxyValidatedMultipartUpload(req, res, targetPath, label = '图片') {
  const contentType = String(req.headers['content-type'] || '');
  if (!/^multipart\/form-data/i.test(contentType)) {
    return sendJsonApiUploadError(res, 400, 'upload_invalid_content_type', '上传请求格式不正确，请重新选择图片后再试。');
  }

  const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const fileParts = parseMultipartFileParts(bodyBuffer, contentType);
  if (fileParts.length === 0) {
    return sendJsonApiUploadError(res, 400, 'upload_file_missing', '未检测到可上传的图片文件，请重新选择图片后再试。');
  }

  const oversizePart = fileParts.find((part) => Number(part?.size) > MAX_UPLOAD_IMAGE_BYTES);
  if (oversizePart) {
    return sendJsonApiUploadError(res, 400, 'upload_file_too_large', getUploadLimitErrorDetail(label), '文件过大');
  }

  try {
    const upstream = await fetch(`${FLARUM_BASE_URL}${targetPath}`, {
      method: req.method,
      headers: {
        Accept: req.headers.accept || 'application/vnd.api+json',
        Authorization: req.headers.authorization || '',
        'Content-Type': contentType,
        'Content-Length': String(bodyBuffer.length)
      },
      body: bodyBuffer
    });

    const responseText = await upstream.text();
    const responseType = upstream.headers.get('content-type');
    if (responseType) {
      res.set('content-type', responseType);
    }
    return res.status(upstream.status).send(responseText);
  } catch (error) {
    console.error('[upload-proxy] request failed:', {
      path: targetPath,
      message: String(error?.message || error)
    });
    return sendJsonApiUploadError(res, 500, 'upload_proxy_failed', '上传服务暂时不可用，请稍后重试。');
  }
}

const uploadMultipartParser = express.raw({
  type: (req) => /^multipart\/form-data/i.test(String(req.headers['content-type'] || '')),
  limit: `${MAX_MULTIPART_PROXY_BYTES}b`
});

const actorCache = new Map();

async function resolveActorFromRequest(req) {
  const authHeader = req.headers.authorization;
  const parsed = parseAuthHeader(authHeader);
  if (!parsed || !parsed.token || !parsed.userId) {
    const err = new Error('unauthorized');
    err.status = 401;
    err.detail = 'missing_token_or_user';
    throw err;
  }

  const cacheKey = parsed.raw;
  const cached = actorCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.actor;
  }

  let flarumResponse;
  try {
    flarumResponse = await fetch(`${FLARUM_BASE_URL}/api/users/${encodeURIComponent(parsed.userId)}?include=groups`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Authorization': parsed.raw
      }
    });
  } catch (fetchError) {
    const err = new Error('flarum_unreachable');
    err.status = 500;
    err.detail = {
      message: '无法连接到 Flarum API，请检查 FLARUM_BASE_URL',
      FLARUM_BASE_URL,
      userId: parsed.userId,
      error: String(fetchError?.message || fetchError)
    };
    throw err;
  }

  if (!flarumResponse.ok) {
    const err = new Error('flarum_auth_failed');
    err.status = flarumResponse.status;
    err.detail = await flarumResponse.text().catch(() => '');
    throw err;
  }

  const userJson = await flarumResponse.json();
  const attrs = userJson?.data?.attributes || {};
  const groups = userJson?.data?.relationships?.groups?.data || [];
  const isAdmin = attrs.isAdmin === true || groups.some((g) => String(g?.id) === '1');
  const actor = {
    userId: String(userJson?.data?.id || parsed.userId),
    isAdmin
  };

  actorCache.set(cacheKey, { actor, expiresAt: now + 30 * 1000 });
  return actor;
}

function requireActor(handler) {
  return async (req, res) => {
    try {
      req.actor = await resolveActorFromRequest(req);
      return await handler(req, res);
    } catch (error) {
      const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 500;
      const detail = error?.detail !== undefined ? error.detail : String(error?.message || error);
      console.error('[custom-messages] request failed:', {
        method: req.method,
        path: req.originalUrl,
        status,
        detail
      });
      if (status === 401) return res.status(401).json({ error: 'unauthorized', detail });
      if (status === 403) return res.status(403).json({ error: 'forbidden', detail });
      if (status === 400) return res.status(400).json({ error: 'bad_request', detail });
      return res.status(500).json({ error: 'server_error', detail });
    }
  };
}

function nowIso() {
  return new Date().toISOString();
}

function normalizePublicMessageType(type) {
  const t = String(type || '').toLowerCase();
  if (['system', 'notice', 'warning', 'event'].includes(t)) return t;
  return null;
}

function pickIncluded(included, type, id) {
  const tid = String(type || '');
  const iid = String(id || '');
  if (!tid || !iid) return null;
  const list = Array.isArray(included) ? included : [];
  for (const r of list) {
    if (!r) continue;
    if (String(r.type) === tid && String(r.id) === iid) return r;
  }
  return null;
}

function getPreferredUserName(userResource) {
  const attrs = userResource?.attributes || {};
  const candidates = [
    attrs.displayName,
    attrs.nickname,
    attrs.username,
    attrs.name
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return '';
}

function buildPostFloorUrl({ discussionId, floor }) {
  const did = discussionId != null ? String(discussionId) : '';
  const n = Number(floor);
  const safeFloor = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  if (!did) return null;
  if (!safeFloor) return `post.html?id=${encodeURIComponent(did)}`;
  const pageSize = 20;
  const targetPage = Math.max(1, Math.ceil(safeFloor / pageSize));
  return `post.html?id=${encodeURIComponent(did)}&page=${targetPage}#post-${safeFloor}`;
}

function mapFlarumNotificationKind(notificationType, replyToFloor) {
  const t = String(notificationType || '').toLowerCase();
  if (t.includes('newpost') || t.includes('posted')) return 'reply';
  if (t.includes('postmentioned') || t.includes('post_mentioned')) return 'quote';
  if (t.includes('usermentioned') || t.includes('user_mentioned') || t.includes('mentioned')) return 'mention';
  if (replyToFloor != null) return 'quote';
  return 'system';
}

async function flarumFetchJsonWithAuth(authRaw, apiPath) {
  const url = `${FLARUM_BASE_URL}${apiPath.startsWith('/') ? '' : '/'}${apiPath}`;
  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.api+json',
        Authorization: authRaw
      }
    });
  } catch (fetchError) {
    const err = new Error('flarum_unreachable');
    err.status = 500;
    err.detail = {
      message: '无法连接到 Flarum API，请检查 FLARUM_BASE_URL',
      FLARUM_BASE_URL,
      apiPath,
      error: String(fetchError?.message || fetchError)
    };
    throw err;
  }

  if (!response.ok) {
    const err = new Error('flarum_request_failed');
    err.status = response.status;
    err.detail = await response.text().catch(() => '');
    throw err;
  }
  return await response.json();
}

async function loadFlarumNotifications(authRaw, limit = 20) {
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(50, Math.floor(Number(limit)))) : 20;
  const include = encodeURIComponent('fromUser,subject,subject.discussion');
  return await flarumFetchJsonWithAuth(
    authRaw,
    `/api/notifications?page[limit]=${safeLimit}&include=${include}`
  );
}

async function loadFlarumPrivateDiscussions(authRaw, limit = 30) {
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(30, Math.floor(Number(limit)))) : 30;
  const include = encodeURIComponent('user,lastPostedUser,recipientUsers,recipientGroups');
  const q = encodeURIComponent('is:private');
  return await flarumFetchJsonWithAuth(
    authRaw,
    `/api/discussions?sort=-lastPostedAt&page[limit]=${safeLimit}&page[offset]=0&filter[q]=${q}&include=${include}`
  );
}

app.get('/custom-messages/public', requireActor(async (req, res) => {
  try {
    const store = loadCustomMessagesStore();
    const userId = String(req.actor.userId);

    const active = store.publicMessages
      .filter((m) => m && m.is_active !== false)
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    const readMap = new Map();
    store.publicReads.forEach((r) => {
      if (!r) return;
      if (String(r.user_id) !== userId) return;
      readMap.set(String(r.message_id), r);
    });

    const data = active.map((m) => {
      const readRow = readMap.get(String(m.id));
      return {
        id: m.id,
        title: m.title,
        content: m.content,
        sender_user_id: m.sender_user_id,
        created_at: m.created_at,
        type: m.type,
        is_active: m.is_active !== false,
        is_read: !!readRow,
        read_at: readRow ? readRow.read_at : null
      };
    });

    res.json({ data });
  } catch (error) {
    console.error('[custom-messages] GET /custom-messages/public failed:', error);
    res.status(500).json({ error: 'server_error', detail: '读取公共短消息失败' });
  }
}));

app.post('/custom-messages/public', requireActor(async (req, res) => {
  try {
    if (!req.actor.isAdmin) {
      return res.status(403).json({ error: 'forbidden', detail: 'not_admin' });
    }

    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const content = typeof req.body?.content === 'string' ? req.body.content : '';
    const type = normalizePublicMessageType(req.body?.type);
    const is_active = req.body?.is_active === false ? false : true;

    if (!title || !content) {
      return res.status(400).json({ error: 'bad_request', detail: 'title_and_content_required' });
    }
    if (!type) {
      return res.status(400).json({ error: 'bad_request', detail: 'invalid_type' });
    }

    const store = loadCustomMessagesStore();
    const id = store.nextPublicMessageId++;
    const row = {
      id,
      title,
      content,
      sender_user_id: Number(req.actor.userId),
      created_at: nowIso(),
      type,
      is_active
    };
    store.publicMessages.push(row);
    saveCustomMessagesStore(store);

    res.json({ data: row });
  } catch (error) {
    console.error('[custom-messages] POST /custom-messages/public failed:', error);
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 500;
    if (status === 500 && error?.detail?.storeFile) {
      return res.status(500).json({ error: 'server_error', detail: error.detail });
    }
    res.status(500).json({ error: 'server_error', detail: '服务器保存公共短消息失败，请查看后端日志' });
  }
}));

app.post('/custom-messages/public/:id/read', requireActor(async (req, res) => {
  try {
    const messageId = Number(req.params.id);
    if (!Number.isFinite(messageId) || messageId <= 0) {
      return res.status(400).json({ error: 'bad_request', detail: 'invalid_id' });
    }

    const store = loadCustomMessagesStore();
    const userId = Number(req.actor.userId);

    const exists = store.publicReads.some((r) => Number(r?.message_id) === messageId && Number(r?.user_id) === userId);
    if (!exists) {
      const id = store.nextPublicReadId++;
      store.publicReads.push({
        id,
        message_id: messageId,
        user_id: userId,
        read_at: nowIso()
      });
      saveCustomMessagesStore(store);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[custom-messages] POST /custom-messages/public/:id/read failed:', error);
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 500;
    if (status === 500 && error?.detail?.storeFile) {
      return res.status(500).json({ error: 'server_error', detail: error.detail });
    }
    res.status(500).json({ error: 'server_error', detail: '服务器保存已读状态失败，请查看后端日志' });
  }
}));

app.get('/custom-messages/unread-count', requireActor(async (req, res) => {
  try {
    const store = loadCustomMessagesStore();
    const userId = String(req.actor.userId);

    const activeIds = new Set(
      store.publicMessages
        .filter((m) => m && m.is_active !== false)
        .map((m) => String(m.id))
    );

    const readIds = new Set(
      store.publicReads
        .filter((r) => r && String(r.user_id) === userId)
        .map((r) => String(r.message_id))
    );

    let publicUnread = 0;
    activeIds.forEach((id) => {
      if (!readIds.has(id)) publicUnread++;
    });

    const authHeader = req.headers.authorization;
    const parsed = parseAuthHeader(authHeader);
    const authRaw = parsed?.raw;

    let notificationUnread = 0;
    try {
      if (authRaw) {
        const notificationsJson = await loadFlarumNotifications(authRaw, 20);
        const list = Array.isArray(notificationsJson?.data) ? notificationsJson.data : [];
        notificationUnread = list.filter((n) => n?.attributes?.isRead === false).length;
      }
    } catch (error) {
      console.warn('[custom-messages] unread-count notificationUnread skipped:', {
        status: error?.status,
        detail: error?.detail
      });
    }

    let privateUnread = 0;
    try {
      if (authRaw) {
        const discussionsJson = await loadFlarumPrivateDiscussions(authRaw, 30);
        const list = Array.isArray(discussionsJson?.data) ? discussionsJson.data : [];
        privateUnread = list.filter((d) => {
          const a = d?.attributes || {};
          const lastPostedAt = a.lastPostedAt ? Date.parse(a.lastPostedAt) : NaN;
          const lastReadAt = a.lastReadAt ? Date.parse(a.lastReadAt) : NaN;
          if (!Number.isFinite(lastPostedAt)) return false;
          if (!Number.isFinite(lastReadAt)) return true;
          return lastPostedAt > lastReadAt;
        }).length;
      }
    } catch (error) {
      console.warn('[custom-messages] unread-count privateUnread skipped:', {
        status: error?.status,
        detail: error?.detail
      });
    }

    const totalUnread = Math.max(0, publicUnread + notificationUnread + privateUnread);
    res.json({ publicUnread, notificationUnread, privateUnread, totalUnread });
  } catch (error) {
    console.error('[custom-messages] GET /custom-messages/unread-count failed:', error);
    res.status(500).json({ error: 'server_error', detail: '读取未读数失败' });
  }
}));

app.get('/custom-notifications', requireActor(async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const parsed = parseAuthHeader(authHeader);
    if (!parsed?.raw) {
      return res.status(401).json({ error: 'unauthorized', detail: 'missing_token_or_user' });
    }

    const rawJson = await loadFlarumNotifications(parsed.raw, 30);
    const list = Array.isArray(rawJson?.data) ? rawJson.data : [];
    const included = Array.isArray(rawJson?.included) ? rawJson.included : [];

    const data = list.map((n) => {
      const attrs = n?.attributes || {};
      const relationships = n?.relationships || {};
      const notificationType = attrs.type || n?.type || '';
      const createdAt = typeof attrs.createdAt === 'string' ? attrs.createdAt : '';
      const isRead = attrs.isRead === true;

      const fromUserId = relationships?.fromUser?.data?.id != null ? String(relationships.fromUser.data.id) : '';
      const fromUser = fromUserId ? pickIncluded(included, 'users', fromUserId) : null;
      const fromUserName = getPreferredUserName(fromUser) || (fromUserId ? `用户#${fromUserId}` : '匿名用户');

      const subjectRel = relationships?.subject?.data;
      const subjectType = subjectRel?.type != null ? String(subjectRel.type) : '';
      const subjectId = subjectRel?.id != null ? String(subjectRel.id) : '';
      const subject = subjectType && subjectId ? pickIncluded(included, subjectType, subjectId) : null;

      let discussionId = '';
      let discussionTitle = '';
      let postId = '';
      let floor = null;

      if (subjectType === 'posts' && subject) {
        postId = String(subject.id || '');
        const number = Number(subject?.attributes?.number);
        floor = Number.isFinite(number) ? number : null;
        const discussionRel = subject?.relationships?.discussion?.data;
        if (discussionRel?.id != null) {
          discussionId = String(discussionRel.id);
          const discussionIncluded = pickIncluded(included, 'discussions', discussionId);
          discussionTitle = typeof discussionIncluded?.attributes?.title === 'string' ? discussionIncluded.attributes.title : '';
        }
      }

      if (!discussionId && subjectType === 'discussions' && subject) {
        discussionId = String(subject.id || '');
        discussionTitle = typeof subject?.attributes?.title === 'string' ? subject.attributes.title : '';
      }

      const replyToFloor =
        attrs.replyToFloor ??
        attrs.replyToPostNumber ??
        attrs.replyToPost ??
        attrs.replyTo ??
        null;
      const replyToFloorNum = Number(replyToFloor);
      const safeReplyToFloor = Number.isFinite(replyToFloorNum) && replyToFloorNum > 0 ? replyToFloorNum : null;

      const kind = mapFlarumNotificationKind(notificationType, safeReplyToFloor);
      if (kind === 'quote' && safeReplyToFloor && !floor) floor = safeReplyToFloor;

      const safeTitle = discussionTitle ? `《${discussionTitle}》` : (discussionId ? `《主题#${discussionId}》` : '');

      let title = '系统通知';
      let content = '';

      if (kind === 'reply') {
        title = '有人回复了你的帖子';
        content = `${fromUserName} 回复了主题${safeTitle}`;
      } else if (kind === 'quote') {
        title = '有人引用了你的发言';
        content = floor ? `${fromUserName} 引用了你在 ${floor} 楼的发言` : `${fromUserName} 引用了你的发言`;
      } else if (kind === 'mention') {
        title = '有人提到了你';
        content = `${fromUserName} 提到了你`;
      } else {
        title = typeof attrs.title === 'string' && attrs.title.trim() ? attrs.title.trim() : '系统通知';
        content = typeof attrs.content === 'string' ? attrs.content : (typeof attrs?.contentHtml === 'string' ? attrs.contentHtml : '');
      }

      const url = buildPostFloorUrl({ discussionId, floor });

      if (!['reply', 'quote', 'mention', 'system'].includes(kind)) {
        console.log('[custom-notifications] unknown kind mapped:', { notificationType, kind });
      }

      return {
        id: String(n?.id || ''),
        type: kind,
        title,
        content,
        fromUserId: fromUserId ? Number(fromUserId) : null,
        fromUserName,
        discussionId: discussionId ? Number(discussionId) : null,
        postId: postId ? Number(postId) : null,
        floor: floor != null ? Number(floor) : null,
        url,
        createdAt,
        isRead
      };
    }).filter((x) => x.id);

    res.json({ data });
  } catch (error) {
    console.error('[custom-notifications] GET /custom-notifications failed:', error);
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 500;
    if (status === 401) return res.status(401).json({ error: 'unauthorized', detail: error?.detail || 'unauthorized' });
    res.status(500).json({ error: 'server_error', detail: '读取通知失败' });
  }
}));

app.post('/custom-notifications/:id/read', requireActor(async (req, res) => {
  const notificationId = String(req.params.id || '').trim();
  if (!notificationId) return res.status(400).json({ error: 'bad_request', detail: 'invalid_id' });

  try {
    const authHeader = req.headers.authorization;
    const parsed = parseAuthHeader(authHeader);
    if (!parsed?.raw) {
      return res.status(401).json({ error: 'unauthorized', detail: 'missing_token_or_user' });
    }

    const candidates = [
      { method: 'POST', path: `/api/notifications/${encodeURIComponent(notificationId)}/read`, body: null },
      { method: 'POST', path: `/api/notifications/read`, body: { data: [notificationId] } },
      { method: 'POST', path: `/api/notifications/read`, body: { data: [{ type: 'notifications', id: notificationId }] } }
    ];

    for (const c of candidates) {
      try {
        const url = `${FLARUM_BASE_URL}${c.path}`;
        const response = await fetch(url, {
          method: c.method,
          headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/json',
            Authorization: parsed.raw
          },
          body: c.body ? JSON.stringify(c.body) : undefined
        });
        if (response.ok) {
          return res.json({ success: true });
        }
      } catch (err) {
        console.warn('[custom-notifications] mark read attempt failed:', String(err?.message || err));
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[custom-notifications] POST /custom-notifications/:id/read failed:', error);
    return res.json({ success: true });
  }
}));

app.post('/api/fof/upload', uploadMultipartParser, async (req, res) => {
  return await proxyValidatedMultipartUpload(req, res, '/api/fof/upload', '图片');
});

app.post('/api/users/:id/avatar', uploadMultipartParser, async (req, res) => {
  return await proxyValidatedMultipartUpload(req, res, `/api/users/${encodeURIComponent(req.params.id)}/avatar`, '头像图片');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((error, req, res, next) => {
  if (error?.type === 'entity.too.large') {
    const pathName = String(req?.path || '');
    if (pathName === '/api/fof/upload') {
      return sendJsonApiUploadError(res, 400, 'upload_file_too_large', getUploadLimitErrorDetail('图片'), '文件过大');
    }
    if (/^\/api\/users\/[^/]+\/avatar$/i.test(pathName)) {
      return sendJsonApiUploadError(res, 400, 'upload_file_too_large', getUploadLimitErrorDetail('头像图片'), '文件过大');
    }
  }
  return next(error);
});

// Custom register endpoint
app.post('/custom-register', async (req, res) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const nicknameInput = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const nickname = nicknameInput || username;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        errors: [{
          code: 'validation_failed',
          detail: '请填写用户名、邮箱和密码'
        }]
      });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        errors: [{
          code: 'validation_failed',
          detail: '用户名长度需为 3-30 个字符'
        }]
      });
    }

    if (!/^[A-Za-z0-9]+$/.test(username)) {
      return res.status(400).json({
        errors: [{
          code: 'validation_failed',
          detail: '用户名只能包含英文字母和数字，不能包含中文'
        }]
      });
    }

    // Get admin credentials from environment variables
    const FLARUM_ADMIN_TOKEN = process.env.FLARUM_ADMIN_TOKEN;
    const FLARUM_ADMIN_USER_ID = process.env.FLARUM_ADMIN_USER_ID || 1;

    if (!FLARUM_ADMIN_TOKEN) {
      return res.status(500).json({
        errors: [{
          code: 'server_config_error',
          detail: '服务器未配置管理员 Token'
        }]
      });
    }

    // Call Flarum API to create user with admin token
    const flarumResponse = await fetch(`${FLARUM_BASE_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
        'Authorization': `Token ${FLARUM_ADMIN_TOKEN}; userId=${FLARUM_ADMIN_USER_ID}`
      },
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

    const result = await flarumResponse.json();

    if (!flarumResponse.ok) {
      // Forward Flarum errors
      return res.status(flarumResponse.status).json(result);
    }

    const createdUserId = result?.data?.id;

    // 如果后端支持昵称字段，则同步写入昵称；若不支持，也不影响注册成功。
    if (createdUserId && nickname) {
      try {
        const nicknameResponse = await fetch(`${FLARUM_BASE_URL}/api/users/${createdUserId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json',
            'Authorization': `Token ${FLARUM_ADMIN_TOKEN}; userId=${FLARUM_ADMIN_USER_ID}`
          },
          body: JSON.stringify({
            data: {
              type: 'users',
              id: String(createdUserId),
              attributes: {
                nickname
              }
            }
          })
        });

        if (!nicknameResponse.ok) {
          const nicknameErrorText = await nicknameResponse.text();
          console.warn('Nickname update skipped:', nicknameResponse.status, nicknameErrorText);
        }
      } catch (nicknameError) {
        console.warn('Nickname update failed:', nicknameError);
      }
    }

    // Return success
    res.json({ success: true });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      errors: [{
        code: 'server_error',
        detail: '服务器内部错误，请稍后重试'
      }]
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Flarum API: ${FLARUM_BASE_URL}`);
});
