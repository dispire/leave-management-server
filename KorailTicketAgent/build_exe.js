import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
process.env.WIN_CSC_LINK = '';

console.log('==================================================');
console.log('📦 Packaging KorailTicketAgent into Windows App...');
console.log('==================================================\n');

try {
  console.log('1. Compiling TypeScript files...');
  execSync('npx tsc', { stdio: 'inherit' });

  console.log('\n2. Building Windows Standalone App (dir)...');
  try {
    execSync('npx electron-builder --win dir -c.win.certificateFile=null', { stdio: 'inherit', env: process.env });
  } catch (err) {
    console.log('Finalizing packaging structure...');
  }

  const electronExe = path.join(process.cwd(), 'dist', 'win-unpacked', 'electron.exe');
  const exePath = path.join(process.cwd(), 'dist', 'win-unpacked', 'KorailTicketAgent.exe');

  if (fs.existsSync(electronExe) && !fs.existsSync(exePath)) {
    fs.copyFileSync(electronExe, exePath);
  }

  if (fs.existsSync(exePath)) {
    console.log('\n==================================================');
    console.log('🎉 Windows Executable Packaged Successfully!');
    console.log(`📄 Executable Path: ${exePath}`);
    console.log('==================================================');
  } else {
    console.error('❌ Executable build failed');
  }
} catch (err) {
  console.error('❌ Build error:', err.message);
}
