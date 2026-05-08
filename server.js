const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Flarum API base URL - update this to your actual Flarum URL
const FLARUM_BASE_URL = process.env.FLARUM_BASE_URL || 'http://localhost';

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
  const safe = {
    publicMessages: Array.isArray(store.publicMessages) ? store.publicMessages : [],
    publicReads: Array.isArray(store.publicReads) ? store.publicReads : [],
    nextPublicMessageId: Number.isFinite(Number(store.nextPublicMessageId)) ? Number(store.nextPublicMessageId) : 1,
    nextPublicReadId: Number.isFinite(Number(store.nextPublicReadId)) ? Number(store.nextPublicReadId) : 1
  };
  const tmp = CUSTOM_MESSAGES_STORE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(safe, null, 2), 'utf8');
  fs.renameSync(tmp, CUSTOM_MESSAGES_STORE_FILE);
}

function parseAuthHeader(authHeader) {
  const raw = typeof authHeader === 'string' ? authHeader.trim() : '';
  if (!raw) return null;
  const tokenMatch = raw.match(/^Token\s+([^;]+)(?:;\s*userId\s*=\s*([0-9]+))?\s*$/i);
  if (!tokenMatch) return null;
  return {
    token: tokenMatch[1],
    userId: tokenMatch[2] ? String(tokenMatch[2]) : null,
    raw
  };
}

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

  const flarumResponse = await fetch(`${FLARUM_BASE_URL}/api/users/${encodeURIComponent(parsed.userId)}?include=groups`, {
    method: 'GET',
    headers: {
      'Accept': 'application/vnd.api+json',
      'Authorization': parsed.raw
    }
  });

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
      return handler(req, res);
    } catch (error) {
      const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 401;
      if (status === 403) {
        return res.status(403).json({ error: 'forbidden' });
      }
      return res.status(status).json({ error: 'unauthorized' });
    }
  };
}

function nowIso() {
  return new Date().toISOString();
}

function normalizePublicMessageType(type) {
  const t = String(type || '').toLowerCase();
  if (['system', 'notice', 'warning', 'event'].includes(t)) return t;
  return 'notice';
}

app.get('/custom-messages/public', requireActor((req, res) => {
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
}));

app.post('/custom-messages/public', requireActor((req, res) => {
  if (!req.actor.isAdmin) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const content = typeof req.body?.content === 'string' ? req.body.content : '';
  const type = normalizePublicMessageType(req.body?.type);
  const is_active = req.body?.is_active === false ? false : true;

  if (!title || !content) {
    return res.status(400).json({ error: 'validation_failed' });
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

  res.json({ success: true, data: row });
}));

app.post('/custom-messages/public/:id/read', requireActor((req, res) => {
  const messageId = Number(req.params.id);
  if (!Number.isFinite(messageId) || messageId <= 0) {
    return res.status(400).json({ error: 'invalid_id' });
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
}));

app.get('/custom-messages/unread-count', requireActor((req, res) => {
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

  let unread = 0;
  activeIds.forEach((id) => {
    if (!readIds.has(id)) unread++;
  });

  res.json({ publicUnread: unread, totalUnread: unread });
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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
