const { downloadArtifact } = require('@electron/get');

async function main() {
  try {
    const zipPath = await downloadArtifact({
      version: '28.3.3',
      artifactName: 'electron',
      platform: 'win32',
      arch: 'x64',
      mirrorOptions: {
        mirror: 'https://npmmirror.com/mirrors/electron/',
      },
    });
    console.log('Downloaded to:', zipPath);

    // Extract using PowerShell
    const { execFileSync } = require('child_process');
    const path = require('path');
    const fs = require('fs');
    const distDir = path.join(__dirname, 'frontend', 'node_modules', 'electron', 'dist');
    const extractDir = path.dirname(zipPath).replace('.zip', '');

    if (!fs.existsSync(extractDir)) {
      execFileSync('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force`], { stdio: 'pipe', timeout: 120000 });
      console.log('Extracted to:', extractDir);
    }

    // Copy files
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true });
    }
    fs.mkdirSync(distDir, { recursive: true });

    function copyRecursive(src, dest) {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) copyRecursive(s, d);
        else fs.copyFileSync(s, d);
      }
    }

    // Check for nested dir
    const entries = fs.readdirSync(extractDir);
    let srcDir = extractDir;
    for (const e of entries) {
      if (fs.existsSync(path.join(extractDir, e, 'electron.exe'))) {
        srcDir = path.join(extractDir, e);
        break;
      }
    }

    copyRecursive(srcDir, distDir);
    console.log('Copied to dist');

    // Verify
    console.log('electron.exe exists:', fs.existsSync(path.join(distDir, 'electron.exe')));
    console.log('File size:', fs.statSync(path.join(distDir, 'electron.exe')).size);

    // Write path.txt
    fs.writeFileSync(path.join(__dirname, 'frontend', 'node_modules', 'electron', 'path.txt'), 'electron.exe');
    console.log('Done!');
  } catch(e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  }
}

main();
