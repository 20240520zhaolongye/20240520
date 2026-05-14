const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const musicplayerDir = path.join('C:\\', 'Users', '赵龙烨', 'Desktop', 'musicplayer');
const launcherPath = path.join(musicplayerDir, 'launcher.cjs');

const launcherCode = `
const { spawn, execSync } = require('child_process');
const path = require('path');
const net = require('net');

const MUSIC_DIR = path.join('C:\\\\', 'Users', '赵龙烨', 'Desktop', 'musicplayer');
const NODE_EXE = 'C:\\\\Program Files\\\\nodejs\\\\node.exe';
const FRONTEND_DIR = path.join(MUSIC_DIR, 'frontend');
const BACKEND_DIR = path.join(MUSIC_DIR, 'backend');

// Kill process on a port
function killPort(port) {
  try {
    const result = execSync('netstat -aon | findstr ":' + port + ' " | findstr "LISTENING"', { encoding: 'utf8' });
    const lines = result.trim().split('\\n');
    for (const line of lines) {
      const parts = line.trim().split(/\\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') {
        try { execSync('taskkill /F /PID ' + pid, { stdio: 'ignore' }); } catch(e) {}
      }
    }
  } catch(e) {}
}

// Check if port is listening
function isPortListening(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => { server.close(); resolve(false); });
    server.listen(port, '127.0.0.1');
  });
}

async function main() {
  console.log('=== Music Player Starting ===');

  // Clean ports
  killPort(3000);
  killPort(5173);
  killPort(5174);

  // Start backend
  console.log('[1/3] Starting backend...');
  const backend = spawn(NODE_EXE, ['server.js'], {
    cwd: BACKEND_DIR,
    stdio: 'pipe',
    env: { ...process.env, PATH: [
      path.dirname(NODE_EXE),
      'C:\\\\WINDOWS\\\\system32',
      'C:\\\\WINDOWS',
    ].join(';') },
  });
  backend.stdout.on('data', d => console.log('[Backend]', d.toString().trim()));
  backend.stderr.on('data', d => console.error('[Backend]', d.toString().trim()));

  // Wait for backend
  await new Promise(r => setTimeout(r, 3000));

  // Start Vite
  console.log('[2/3] Starting Vite...');
  const viteBin = path.join(FRONTEND_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
  const vite = spawn(NODE_EXE, [viteBin, '--mode', 'electron'], {
    cwd: FRONTEND_DIR,
    stdio: 'pipe',
    env: { ...process.env, PATH: [
      path.dirname(NODE_EXE),
      'C:\\\\WINDOWS\\\\system32',
      'C:\\\\WINDOWS',
    ].join(';'), VITE_API_BASE_URL: 'http://localhost:3000/api' },
  });
  vite.stdout.on('data', d => {
    const msg = d.toString();
    console.log('[Vite]', msg.trim());
    if (msg.includes('ready in') || msg.includes('localhost')) {
      setTimeout(() => startElectron(), 1500);
    }
  });
  vite.stderr.on('data', d => console.error('[Vite]', d.toString().trim()));

  // Wait for Vite
  await new Promise(r => setTimeout(r, 6000));
  startElectron();
}

let electronStarted = false;
function startElectron() {
  if (electronStarted) return;
  electronStarted = true;
  console.log('[3/3] Starting Electron...');
  const electronExe = path.join(FRONTEND_DIR, 'node_modules', 'electron', 'dist', 'electron.exe');
  const electron = spawn(electronExe, [FRONTEND_DIR], {
    cwd: FRONTEND_DIR,
    stdio: 'pipe',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '' },
    detached: false,
  });
  electron.stdout.on('data', d => console.log('[Electron]', d.toString().trim()));
  electron.stderr.on('data', d => console.error('[Electron]', d.toString().trim()));
  electron.on('close', () => {
    console.log('Electron closed. Cleaning up...');
    killPort(3000);
    killPort(5173);
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
`;

fs.writeFileSync(launcherPath, launcherCode, 'utf8');
console.log('Launcher created: ' + launcherPath);

// Create a bat wrapper that calls the launcher silently
const batPath = path.join(musicplayerDir, '启动MusicPlayer.bat');
const batContent = `@echo off
chcp 65001 >nul 2>&1
title Music Player
"C:\\Program Files\\nodejs\\node.exe" "${launcherPath}"
pause
`;
fs.writeFileSync(batPath, batContent, 'utf8');
console.log('Bat launcher created: ' + batPath);
