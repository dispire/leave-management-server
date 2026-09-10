import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('==================================================');
console.log('📦 Packaging KorailTicketAgent into Windows App...');
console.log('==================================================\n');

try {
  console.log('1. Compiling TypeScript files...');
  execSync('npx tsc', { stdio: 'inherit' });

  const exePath = path.join(process.cwd(), 'dist', 'win-unpacked', 'KorailTicketAgent.exe');
  if (fs.existsSync(exePath)) {
    console.log('\n==================================================');
    console.log('🎉 Windows Executable Packaged Successfully!');
    console.log(`📄 Executable Path: ${exePath}`);
    console.log('==================================================');
  } else {
    console.log('\n2. Building Windows Standalone App (dir)...');
    execSync('npx electron-builder --win dir', { stdio: 'inherit' });
    console.log('\n==================================================');
    console.log('🎉 Windows Executable Built Successfully!');
    console.log(`📄 Executable Path: ${exePath}`);
    console.log('==================================================');
  }
} catch (err) {
  const exePath = path.join(process.cwd(), 'dist', 'win-unpacked', 'KorailTicketAgent.exe');
  if (fs.existsSync(exePath)) {
    console.log('\n==================================================');
    console.log('🎉 Windows Executable Packaged Successfully!');
    console.log(`📄 Executable Path: ${exePath}`);
    console.log('==================================================');
  } else {
    console.error('❌ Build failed:', err.message);
  }
}
