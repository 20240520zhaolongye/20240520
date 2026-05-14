const { spawn, execSync } = require('child_process');
const path = require('path');
const net = require('net');

// Resolve paths dynamically
const HOME = process.env.USERPROFILE || process.env.HOME || path.join('C:', 'Users', '\u8D75\u9F99\u70E8');
const MUSIC_DIR = path.join(HOME, 'Desktop', 'musicplayer');
const NODE_EXE = path.join('C:', 'Program Files', 'nodejs', 'node.exe');
const FRONTEND_DIR = path.join(MUSIC_DIR, 'frontend');
const BACKEND_DIR = path.join(MUSIC_DIR, 'backend');

function killPort(port) {
  try {
    const result = execSync('netstat -aon | findstr ":' + port + ' " | findstr "LISTENING"', { encoding: 'utf8' });
    for (const line of result.trim().split('\n')) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') {
        try { execSync('taskkill /F /PID ' + pid, { stdio: 'ignore' }); } catch(e) {}
      }
    }
  } catch(e) {}
}

function makeCleanEnv() {
  const env = Object.assign({}, process.env);
  env.PATH = [
    path.dirname(NODE_EXE),
    'C:\\WINDOWS\\system32',
    'C:\\WINDOWS',
  ].join(';');
  return env;
}

async function main() {
  // Clean ports
  killPort(3000);
  killPort(5173);
  killPort(5174);

  // Verify paths exist
  if (!require('fs').existsSync(BACKEND_DIR)) {
    console.error('Backend dir not found:', BACKEND_DIR);
    process.exit(1);
  }
  if (!require('fs').existsSync(FRONTEND_DIR)) {
    console.error('Frontend dir not found:', FRONTEND_DIR);
    process.exit(1);
  }

  const env = makeCleanEnv();

  // Step 1: Start backend
  console.log('[1/3] Starting backend...');
  const backend = spawn(NODE_EXE, ['server.js'], {
    cwd: BACKEND_DIR,
    stdio: 'pipe',
    env: env,
  });
  backend.stdout.on('data', d => console.log('[Backend]', d.toString().trim()));
  backend.stderr.on('data', d => console.error('[Backend]', d.toString().trim()));
  backend.on('error', err => console.error('[Backend] spawn error:', err.message));

  // Wait for backend to be ready
  await new Promise(r => setTimeout(r, 3000));

  // Step 2: Start Vite
  console.log('[2/3] Starting Vite...');
  const viteBin = path.join(FRONTEND_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
  const viteEnv = Object.assign({}, env);
  viteEnv.VITE_API_BASE_URL = 'http://localhost:3000/api';
  const vite = spawn(NODE_EXE, [viteBin, '--mode', 'electron'], {
    cwd: FRONTEND_DIR,
    stdio: 'pipe',
    env: viteEnv,
  });
  vite.stdout.on('data', d => console.log('[Vite]', d.toString().trim()));
  vite.stderr.on('data', d => console.error('[Vite]', d.toString().trim()));
  vite.on('error', err => console.error('[Vite] spawn error:', err.message));

  // Wait for Vite to be ready
  await new Promise(r => setTimeout(r, 6000));

  // Step 3: Start Electron
  console.log('[3/3] Starting Electron...');
  const electronExe = path.join(FRONTEND_DIR, 'node_modules', 'electron', 'dist', 'electron.exe');
  const electronEnv = Object.assign({}, env);
  delete electronEnv.ELECTRON_RUN_AS_NODE;

  const electron = spawn(electronExe, [FRONTEND_DIR], {
    cwd: FRONTEND_DIR,
    stdio: 'pipe',
    env: electronEnv,
  });
  electron.stdout.on('data', d => console.log('[Electron]', d.toString().trim()));
  electron.stderr.on('data', d => console.error('[Electron]', d.toString().trim()));
  electron.on('error', err => console.error('[Electron] spawn error:', err.message));

  electron.on('close', (code) => {
    console.log('[Electron] Exited with code', code);
    // Cleanup
    try { vite.kill(); } catch(e) {}
    try { backend.kill(); } catch(e) {}
    killPort(3000);
    killPort(5173);
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
