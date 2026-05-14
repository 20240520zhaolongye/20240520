const { spawn } = require('child_process');
const path = require('path');

const frontendDir = path.join('C:\\', 'Users', '赵龙烨', 'Desktop', 'musicplayer', 'frontend');
const backendDir = path.join('C:\\', 'Users', '赵龙烨', 'Desktop', 'musicplayer', 'backend');

const nodeExe = path.join('C:\\', 'Program Files', 'nodejs', 'node.exe');
const viteBin = path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js');
const electronExe = path.join(frontendDir, 'node_modules', 'electron', 'dist', 'electron.exe');

// Clean PATH to avoid encoding issues with Chinese characters
const cleanEnv = { ...process.env };
cleanEnv.PATH = [
  path.dirname(nodeExe),
  'C:\\WINDOWS\\system32',
  'C:\\WINDOWS',
].join(';');
cleanEnv.VITE_API_BASE_URL = 'http://localhost:3000/api';

console.log('=== Starting Music Player Desktop App ===\n');

// Step 1: Start backend
console.log('[1/3] Starting backend server...');
const backend = spawn(nodeExe, ['server.js'], {
  cwd: backendDir,
  stdio: 'pipe',
  env: cleanEnv,
});

backend.stdout.on('data', d => console.log('[Backend]', d.toString().trim()));
backend.stderr.on('data', d => console.error('[Backend]', d.toString().trim()));

// Step 2: After 2s, start Vite
setTimeout(() => {
  console.log('[2/3] Starting Vite dev server...');
  const vite = spawn(nodeExe, [viteBin, '--mode', 'electron', '--port', '5173'], {
    cwd: frontendDir,
    stdio: 'pipe',
    env: cleanEnv,
  });

  vite.stdout.on('data', d => {
    const msg = d.toString();
    console.log('[Vite]', msg.trim());
    // When Vite is ready, start Electron
    if (msg.includes('ready in') || msg.includes('localhost')) {
      setTimeout(() => startElectron(vite), 1000);
    }
  });
  vite.stderr.on('data', d => console.error('[Vite]', d.toString().trim()));

  vite.on('close', () => {
    console.log('Vite closed');
  });

  // Store ref for cleanup
  process._vite = vite;
}, 2000);

function startElectron(vite) {
  console.log('[3/3] Starting Electron...');
  const electron = spawn(electronExe, [frontendDir], {
    cwd: frontendDir,
    stdio: 'pipe',
    env: { ...cleanEnv, ELECTRON_RUN_AS_NODE: undefined },
  });

  electron.stdout.on('data', d => console.log('[Electron]', d.toString().trim()));
  electron.stderr.on('data', d => console.error('[Electron]', d.toString().trim()));

  electron.on('close', (code) => {
    console.log('Electron closed with code', code);
    vite.kill();
    backend.kill();
    process.exit(0);
  });
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  backend.kill();
  if (process._vite) process._vite.kill();
  process.exit(0);
});
