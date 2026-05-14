const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const frontendDir = 'C:\\Users\\赵龙烨\\Desktop\\musicplayer\\frontend';
const electronExe = path.join(frontendDir, 'node_modules', 'electron', 'dist', 'electron.exe');
const mainFile = path.join(frontendDir, 'electron', 'main.cjs');

console.log('electron.exe exists:', fs.existsSync(electronExe));
console.log('main.cjs exists:', fs.existsSync(mainFile));

// Try using child_process.spawn with stdio: inherit
const { spawn } = require('child_process');
const child = spawn(electronExe, [mainFile], {
  cwd: frontendDir,
  stdio: 'inherit',
  env: { ...process.env },
});

child.on('error', (err) => {
  console.error('Spawn error:', err);
});

child.on('close', (code) => {
  console.log('Electron exited with code:', code);
});
