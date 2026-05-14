const { createRequire } = require('module');
const path = require('path');
const fs = require('fs');
const { createWriteStream, existsSync, mkdirSync } = fs;
const { get } = require('https');
const { createUnzip } = require('zlib');

const ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/';
const version = '28.3.3';
const platform = process.platform === 'win32' ? 'win32-x64' : process.platform === 'darwin' ? 'darwin-x64' : 'linux-x64';
const filename = `electron-v${version}-${platform}.zip`;
const url = ELECTRON_MIRROR + version + '/' + filename;

const cacheDir = path.join(process.env.LOCALAPPDATA, 'electron', 'Cache');
const zipPath = path.join(cacheDir, filename);
const extractDir = path.join(cacheDir, `electron-v${version}-${platform}`);

const distDir = path.join(__dirname, 'frontend', 'node_modules', 'electron', 'dist');

if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });

function download() {
  return new Promise((resolve, reject) => {
    if (existsSync(zipPath)) {
      console.log('Using cached:', zipPath);
      return resolve();
    }
    console.log('Downloading', url);
    const file = createWriteStream(zipPath);
    get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        fs.unlinkSync(zipPath);
        return downloadFrom(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(zipPath);
        return reject(new Error('HTTP ' + res.statusCode));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (e) => { file.close(); fs.unlinkSync(zipPath); reject(e); });
  });
}

function downloadFrom(url) {
  return new Promise((resolve, reject) => {
    console.log('Redirected to:', url);
    const file = createWriteStream(zipPath);
    get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (e) => { file.close(); reject(e); });
  });
}

function extract() {
  return new Promise((resolve, reject) => {
    const { execFileSync } = require('child_process');
    // Use PowerShell to expand archive
    const psCmd = `Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force`;
    try {
      execFileSync('powershell.exe', ['-NoProfile', '-Command', psCmd], { stdio: 'pipe', timeout: 120000 });
      console.log('Extracted to:', extractDir);
      resolve();
    } catch(e) {
      reject(e);
    }
  });
}

function copy() {
  const srcExe = path.join(extractDir, 'electron.exe');
  if (!existsSync(srcExe)) {
    // Check for nested dir
    const entries = fs.readdirSync(extractDir);
    console.log('Extracted entries:', entries.slice(0, 5));
    // Find electron.exe in subdirectory
    for (const entry of entries) {
      const testPath = path.join(extractDir, entry, 'electron.exe');
      if (existsSync(testPath)) {
        return copyDir(path.join(extractDir, entry), distDir);
      }
    }
    throw new Error('electron.exe not found in extracted archive');
  }
  return copyDir(extractDir, distDir);
}

function copyDir(src, dest) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  console.log('Copied to:', distDir);
}

async function main() {
  try {
    await download();
    await extract();
    await copy();

    // Write path.txt
    const pathTxt = path.join(__dirname, 'frontend', 'node_modules', 'electron', 'path.txt');
    fs.writeFileSync(pathTxt, 'electron.exe');
    console.log('Written path.txt');

    // Verify
    const exePath = path.join(distDir, 'electron.exe');
    console.log('Verified:', existsSync(exePath));
  } catch(e) {
    console.error('Error:', e.message);
  }
}

main();
