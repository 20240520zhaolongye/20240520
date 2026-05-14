const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const musicDir = path.join('C:\\', 'Users', '赵龙烨', 'Desktop', 'musicplayer');

// Create IExpress SED file for packaging
const sedContent = `
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=0
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=
TargetName=%USERPROFILE%\\Desktop\\MusicPlayer.exe
FriendlyName=Music Player Launcher
SourceFiles=1
Compress=NO
[SourceFiles]
SourceFiles0=C:\\Temp\\MusicPlayerTemp\\start_musicplayer.bat
[Strings]
FILE0="start_musicplayer.bat"
`;

// Create the bat to include
const batContent = `@echo off
chcp 65001 >nul 2>&1

set NODE_EXE=C:\\Program Files\\nodejs\\node.exe
set MP_DIR=C:\\Users\\赵龙烨\\Desktop\\musicplayer

echo Starting Music Player...

:: Kill old processes
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5174 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

:: Start backend
start /b "" "%NODE_EXE%" "%MP_DIR%\\backend\\server.js"
timeout /t 3 /nobreak >nul

:: Start Vite
start /b "" "%NODE_EXE%" "%MP_DIR%\\frontend\\node_modules\\vite\\bin\\vite.js" --mode electron
timeout /t 6 /nobreak >nul

:: Start Electron
start "" "%MP_DIR%\\frontend\\node_modules\\electron\\dist\\electron.exe" "%MP_DIR%\\frontend"

exit
`;

const tempDir = 'C:\\Temp\\MusicPlayerTemp';
try { fs.mkdirSync(tempDir, { recursive: true }); } catch(e) {}
fs.writeFileSync(path.join(tempDir, 'start_musicplayer.bat'), batContent, 'utf8');
fs.writeFileSync(path.join(tempDir, 'MusicPlayer.sed'), sedContent.trim(), 'utf8');

console.log('Files prepared at ' + tempDir);
console.log('Run IExpress to create exe...');
console.log('Command: iexpress /Q ' + tempDir + '\\MusicPlayer.sed');
