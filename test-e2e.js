const http = require('http');

function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    if (options.body) {
      opts.headers['Content-Type'] = 'application/json';
    }
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve({ raw: data.substring(0, 200), status: res.statusCode }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function runTests() {
  const BASE = 'http://127.0.0.1:5173/api';
  let pass = 0, fail = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  PASS: ${name}`);
      pass++;
    } catch(e) {
      console.log(`  FAIL: ${name} - ${e.message}`);
      fail++;
    }
  }

  console.log('\n=== E2E API Proxy Tests (via Vite) ===\n');

  // 1. Song list
  await test('GET /api/songs (proxy)', async () => {
    const r = await fetchJSON(`${BASE}/songs?page=1&limit=5`);
    if (r.code !== 200) throw new Error('code=' + r.code);
    if (r.data.list.length === 0) throw new Error('empty list');
  });

  // 2. Search
  await test('GET /api/songs/search (proxy)', async () => {
    const r = await fetchJSON(`${BASE}/songs/search?keyword=Rock`);
    if (r.code !== 200) throw new Error('code=' + r.code);
  });

  // 3. Recommendations
  await test('GET /api/recommendations?type=hot (proxy)', async () => {
    const r = await fetchJSON(`${BASE}/recommendations?type=hot`);
    if (r.code !== 200) throw new Error('code=' + r.code);
  });

  // 4. Login
  let token = null;
  await test('POST /api/auth/login (proxy)', async () => {
    const r = await fetchJSON(`${BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'test@test.com', password: 'test123456' }
    });
    if (r.code !== 200) throw new Error('code=' + r.code);
    token = r.data.accessToken;
  });

  // 5. AI recommendations
  await test('GET /api/ai-recommendations (proxy)', async () => {
    const r = await fetchJSON(`${BASE}/ai-recommendations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (r.code !== 200) throw new Error('code=' + r.code);
    if (r.data.recommendations.length === 0) throw new Error('empty recs');
  });

  // 6. Favorites
  await test('GET /api/users/favorites (proxy)', async () => {
    const r = await fetchJSON(`${BASE}/users/favorites`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (r.code !== 200) throw new Error('code=' + r.code);
  });

  // 7. History
  await test('GET /api/users/history (proxy)', async () => {
    const r = await fetchJSON(`${BASE}/users/history`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (r.code !== 200) throw new Error('code=' + r.code);
  });

  // 8. Playlists
  await test('GET /api/playlists (proxy)', async () => {
    const r = await fetchJSON(`${BASE}/playlists`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (r.code !== 200) throw new Error('code=' + r.code);
  });

  // 9. Upload proxy check (just test the endpoint exists)
  await test('Upload endpoint accessible (proxy)', async () => {
    // We can't test actual file upload easily, but check the 400 response (no files)
    const r = await fetchJSON(`${BASE}/songs/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    // Should get 400 because no files sent
    if (r.code !== 400) throw new Error('expected 400, got ' + r.code);
  });

  console.log(`\n=== Results: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

runTests();
