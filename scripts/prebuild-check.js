#!/usr/bin/env node
/**
 * prebuild-check.js
 * Fast validation script run before every EAS build.
 * Checks:
 * 1. npx expo-doctor
 * 2. npx expo install --check
 * 3. Grep check ensuring "expo-av" is not present in package.json, app.json, or source code (src/, app/)
 * 4. npx expo export --platform android (and cleanup dist)
 * 5. npm test
 * 6. npm run typecheck
 * 7. npm run lint
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

function runStep(name, command) {
  console.log(`\n========================================`);
  console.log(`[STEP] ${name}`);
  console.log(`> ${command}`);
  console.log(`========================================`);
  try {
    execSync(command, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: process.env,
    });
  } catch (err) {
    console.error(`\n❌ Step failed: ${name}`);
    process.exit(1);
  }
}

function checkExpoAvAbsence() {
  console.log(`\n========================================`);
  console.log(`[STEP] Verifying "expo-av" is completely absent`);
  console.log(`========================================`);

  const filesToCheck = [
    path.join(ROOT_DIR, 'package.json'),
    path.join(ROOT_DIR, 'app.json'),
  ];

  function collectSourceFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
          collectSourceFiles(fullPath);
        }
      } else if (/\.(js|jsx|ts|tsx|json)$/.test(entry.name)) {
        filesToCheck.push(fullPath);
      }
    }
  }

  collectSourceFiles(path.join(ROOT_DIR, 'src'));
  collectSourceFiles(path.join(ROOT_DIR, 'app'));

  let foundExpoAv = false;
  for (const file of filesToCheck) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('expo-av')) {
      console.error(`❌ Found forbidden reference to "expo-av" in ${path.relative(ROOT_DIR, file)}`);
      foundExpoAv = true;
    }
  }

  if (foundExpoAv) {
    console.error('❌ "expo-av" check failed: forbidden package/import detected!');
    process.exit(1);
  }

  console.log('✅ Passed: No references to "expo-av" in package.json, app.json, or source.');
}

function cleanupDist() {
  const distDir = path.join(ROOT_DIR, 'dist');
  if (fs.existsSync(distDir)) {
    console.log(`Cleaning up ${distDir}...`);
    fs.rmSync(distDir, { recursive: true, force: true });
  }
}

const startTime = Date.now();

try {
  // Step 1: expo-doctor
  runStep('Expo Doctor', 'npx expo-doctor');

  // Step 2: expo install --check
  runStep('Expo Install Check', 'npx expo install --check');

  // Step 3: expo-av absence grep
  checkExpoAvAbsence();

  // Step 4: Expo Export Android Bundle
  runStep('Expo Android Bundle Export', 'npx expo export --platform android');

  // Clean up dist
  cleanupDist();

  // Step 5: Test
  runStep('Automated Unit Tests', 'npm test');

  // Step 6: Typecheck
  runStep('TypeScript Typecheck', 'npm run typecheck');

  // Step 7: Lint
  runStep('ESLint Check', 'npm run lint');

  const totalTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n========================================`);
  console.log(`🎉 ALL PREBUILD CHECKS PASSED in ${totalTimeSeconds}s!`);
  console.log(`========================================\n`);
} finally {
  cleanupDist();
}
