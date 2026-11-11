#!/usr/bin/env node
/**
 * Scope & Contract Guard for TalingchanCountTracker
 * Usage:
 *   node scripts/verify-scope.mjs ui-only     -> Fails if any Store/Util/Service/Type/Test file was modified during a UI styling pass
 *   node scripts/verify-scope.mjs logic-only  -> Fails if any e2e/ test file was modified while fixing application code
 */
import { execSync } from 'node:child_process';

const mode = process.argv[2] || 'ui-only';
const diffOut = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
const changedFiles = diffOut
  ? diffOut.split('\n').map((line) => line.slice(3).trim())
  : [];

const LOCKED_IN_UI_PASS = [
  /^src\/store\//,
  /^src\/utils\//,
  /^src\/services\//,
  /^src\/types\//,
  /^src\/data\//,
  /^e2e\//,
  /\.test\.ts$/,
];

const LOCKED_IN_BUILDER_PASS = [
  /^e2e\//,
  /^src\/.*\.test\.ts$/,
];

const rules = mode === 'ui-only' ? LOCKED_IN_UI_PASS : LOCKED_IN_BUILDER_PASS;
const violations = changedFiles.filter((file) => rules.some((rx) => rx.test(file)));

if (violations.length > 0) {
  console.error(`❌ [SCOPE GUARD FAILED - mode: ${mode}] ห้ามแก้ไขไฟล์ที่ถูกล็อกต่อไปนี้:`);
  for (const v of violations) {
    console.error(`   - ${v}`);
  }
  process.exit(1);
}

console.log(`✅ [SCOPE GUARD PASSED - mode: ${mode}] ไฟล์ที่แก้ไขทั้งหมดอยู่ในขอบเขตที่อนุญาต (${changedFiles.length} ไฟล์)`);
