const { createWriteStream, existsSync, mkdirSync, rmSync } = require('fs');
const { get } = require('https');
const { createInflateRaw } = require('zlib');
const path = require('path');

const version = '28.3.3';
const url = `https://github.com/electron/electron/releases/download/v${version}/electron-v${version}-win32-x64.zip`;
const cacheDir = path.join(process.env.LOCALAPPDATA, 'electron', 'Cache');
const zipPath = path.join(cacheDir, `electron-v${version}-win32-x64.zip`);
const distDir = path.join(__dirname, 'frontend', 'node_modules', 'electron', 'dist');
const extractDir = path.join(cacheDir, `electron-v${version}-extract`);

if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });

function download() {
  return new Promise((resolve, reject) => {
    if (existsSync(zipPath)) {
      console.log('Using cached zip:', zipPath);
      return resolve();
    }
    console.log('Downloading from:', url);
    console.log('This may take a few minutes...');
    const file = createWriteStream(zipPath);
    get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400) {
        file.close();
        if (existsSync(zipPath)) rmSync(zipPath);
        console.log('Redirected to:', res.headers.location);
        return downloadFrom(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        if (existsSync(zipPath)) rmSync(zipPath);
        return reject(new Error('HTTP ' + res.statusCode));
      }
      const total = parseInt(res.headers['content-length'] || 0);
      let downloaded = 0;
      res.on('data', (chunk) => {
        downloaded += chunk.length;
        const pct = total ? Math.round(downloaded / total * 100) : 0;
        process.stdout.write('\rDownloading: ' + pct + '%');
      });
      res.pipe(file);
      file.on('finish', () => { file.close(); console.log('\nDownload complete'); resolve(); });
    }).on('error', (e) => { file.close(); reject(e); });
  });
}

function downloadFrom(targetUrl) {
  return new Promise((resolve, reject) => {
    console.log('Following redirect...');
    const file = createWriteStream(zipPath);
    get(targetUrl, (res) => {
      const total = parseInt(res.headers['content-length'] || 0);
      let downloaded = 0;
      res.on('data', (chunk) => {
        downloaded += chunk.length;
        const pct = total ? Math.round(downloaded / total * 100) : 0;
        process.stdout.write('\rDownloading: ' + pct + '%');
      });
      res.pipe(file);
      file.on('finish', () => { file.close(); console.log('\nDownload complete'); resolve(); });
    }).on('error', (e) => { file.close(); reject(e); });
  });
}

function extract() {
  return new Promise((resolve, reject) => {
    const { execFileSync } = require('child_process');
    if (existsSync(extractDir)) rmSync(extractDir, { recursive: true });
    mkdirSync(extractDir, { recursive: true });
    console.log('Extracting...');
    try {
      execFileSync('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force`], { stdio: 'pipe', timeout: 180000 });
      console.log('Extracted');
      resolve();
    } catch(e) {
      reject(e);
    }
  });
}

function copy() {
  const src = extractDir;
  // Check for nested dir
  const entries = require('fs').readdirSync(src);
  let actualSrc = src;
  for (const e of entries) {
    if (existsSync(path.join(src, e, 'electron.exe')) && existsSync(path.join(src, e, 'electron.dll'))) {
      actualSrc = path.join(src, e);
      console.log('Found electron in subdirectory:', e);
      break;
    }
  }

  if (!existsSync(distDir)) rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });

  function copyDir(s, d) {
    mkdirSync(d, { recursive: true });
    for (const entry of require('fs').readdirSync(s, { withFileTypes: true })) {
      const sp = path.join(s, entry.name);
      const dp = path.join(d, entry.name);
      if (entry.isDirectory()) copyDir(sp, dp);
      else require('fs').copyFileSync(sp, dp);
    }
  }

  copyDir(actualSrc, distDir);
  console.log('Copied to dist');

  // Verify
  const dllPath = path.join(distDir, 'electron.dll');
  console.log('electron.dll exists:', existsSync(dllPath));
  if (!existsSync(dllPath)) {
    throw new Error('electron.dll not found! Download may be incomplete.');
  }

  const exePath = path.join(distDir, 'electron.exe');
  console.log('electron.exe exists:', existsSync(exePath));
  console.log('electron.exe size:', (require('fs').statSync(exePath).size / 1024 / 1024).toFixed(1) + ' MB');
}

async function main() {
  try {
    await download();
    await extract();
    copy();

    // Write path.txt
    const pathTxt = path.join(__dirname, 'frontend', 'node_modules', 'electron', 'path.txt');
    require('fs').writeFileSync(pathTxt, 'electron.exe');
    console.log('Written path.txt');
    console.log('Done! Electron is ready.');
  } catch(e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}

main();
