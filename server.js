const express = require('express');
const fetch = require('node-fetch');
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
