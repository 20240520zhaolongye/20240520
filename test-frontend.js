const http = require('http');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function runTests() {
  const BASE = 'http://127.0.0.1:5173';
  let pass = 0, fail = 0;

  async function test(name, url) {
    try {
      const r = await fetchPage(BASE + url);
      if (r.status !== 200) throw new Error('status=' + r.status);
      // Check that it's not an error page
      if (r.body.includes('runtime error') || r.body.includes('Failed to fetch')) {
        throw new Error('contains runtime error');
      }
      console.log(`  PASS: ${name} (${url})`);
      pass++;
    } catch(e) {
      console.log(`  FAIL: ${name} - ${e.message}`);
      fail++;
    }
  }

  console.log('\n=== Frontend Page Tests ===\n');
  await test('Home page', '/');
  await test('Search page', '/search');
  await test('Playlists page', '/playlists');
  await test('For You page', '/for-you');
  await test('Local Import page', '/local');
  await test('Favorites page', '/favorites');
  await test('History page', '/history');
  await test('Login page', '/login');
  await test('Register page', '/register');
  console.log(`\n=== Results: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

runTests();
