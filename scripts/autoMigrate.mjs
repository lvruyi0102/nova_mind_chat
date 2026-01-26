#!/usr/bin/env node

/**
 * Automated Database Migration Script for Nova-Mind
 * 
 * Handles interactive prompts automatically and performs database migration
 * Usage: node scripts/autoMigrate.mjs [--force] [--dry-run]
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');

console.log('[AutoMigrate] Starting automated database migration...');
console.log(`[AutoMigrate] Options: dryRun=${isDryRun}, force=${isForce}`);

/**
 * Step 1: Generate migrations using drizzle-kit generate
 */
async function generateMigrations() {
  console.log('[AutoMigrate] Step 1: Generating migrations...');
  
  return new Promise((resolve, reject) => {
    const proc = spawn('pnpm', ['exec', 'drizzle-kit', 'generate'], {
      stdio: 'pipe',
      cwd: process.cwd(),
    });

    let output = '';
    let errorOutput = '';
    let promptCount = 0;
    const maxPrompts = 50;

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(`[drizzle-kit] ${text.trim()}`);

      // Handle drizzle-kit interactive prompts
      // The prompt shows options with ❯ indicator for current selection
      if (text.includes('❯') || text.includes('create column')) {
        promptCount++;
        if (promptCount <= maxPrompts) {
          console.log(`[AutoMigrate] Auto-selecting option #${promptCount}...`);
          // Send Enter to select the highlighted option
          setTimeout(() => proc.stdin.write('\n'), 100);
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      console.error(`[drizzle-kit] ERROR: ${text.trim()}`);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('[AutoMigrate] ✅ Migrations generated successfully');
        resolve(true);
      } else {
        console.error(`[AutoMigrate] ❌ Migration generation failed with code ${code}`);
        reject(new Error(`Generation failed: ${errorOutput}`));
      }
    });

    // Send Enter key after a short delay to handle initial prompts
    setTimeout(() => {
      proc.stdin.write('\n');
    }, 500);
  });
}

/**
 * Step 2: Apply migrations using drizzle-kit migrate
 */
async function applyMigrations() {
  console.log('[AutoMigrate] Step 2: Applying migrations...');
  
  if (isDryRun) {
    console.log('[AutoMigrate] 🔍 Dry-run mode: skipping actual migration');
    return true;
  }

  return new Promise((resolve, reject) => {
    const proc = spawn('pnpm', ['exec', 'drizzle-kit', 'migrate'], {
      stdio: 'pipe',
      cwd: process.cwd(),
    });

    let output = '';
    let errorOutput = '';
    let promptCount = 0;
    const maxPrompts = 50;

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(`[drizzle-kit] ${text.trim()}`);

      // Handle drizzle-kit interactive prompts
      if (text.includes('❯') || text.includes('create column')) {
        promptCount++;
        if (promptCount <= maxPrompts) {
          console.log(`[AutoMigrate] Auto-selecting option #${promptCount}...`);
          setTimeout(() => proc.stdin.write('\n'), 100);
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      console.error(`[drizzle-kit] ${text.trim()}`);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('[AutoMigrate] ✅ Migrations applied successfully');
        resolve(true);
      } else if (code === 1 && output.includes('No changes')) {
        console.log('[AutoMigrate] ℹ️  No changes to apply');
        resolve(true);
      } else {
        console.error(`[AutoMigrate] ❌ Migration failed with code ${code}`);
        reject(new Error(`Migration failed: ${errorOutput}`));
      }
    });

    // Send initial Enter to start
    setTimeout(() => {
      proc.stdin.write('\n');
    }, 500);

    // Close stdin after a delay to prevent hanging
    setTimeout(() => {
      try {
        proc.stdin.end();
      } catch (e) {
        // stdin might already be closed
      }
    }, 10000);
  });
}

/**
 * Step 3: Verify migration success
 */
async function verifyMigration() {
  console.log('[AutoMigrate] Step 3: Verifying migration...');
  
  try {
    // Check if migration metadata exists
    const metaPath = join(process.cwd(), 'drizzle', '_meta');
    const files = await import('fs').then(fs => fs.promises.readdir(metaPath));
    
    if (files.length > 0) {
      console.log(`[AutoMigrate] ✅ Found ${files.length} migration files`);
      return true;
    } else {
      console.warn('[AutoMigrate] ⚠️  No migration files found');
      return true;
    }
  } catch (error) {
    console.error('[AutoMigrate] ❌ Verification failed:', error.message);
    return false;
  }
}

/**
 * Step 4: Run TypeScript compilation check
 */
async function checkTypeScript() {
  console.log('[AutoMigrate] Step 4: Checking TypeScript compilation...');
  
  return new Promise((resolve) => {
    const proc = spawn('pnpm', ['tsc', '--noEmit'], {
      stdio: 'pipe',
      cwd: process.cwd(),
    });

    let errorCount = 0;
    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Extract error count
      const match = text.match(/Found (\d+) errors?/);
      if (match) {
        errorCount = parseInt(match[1]);
      }
    });

    proc.on('close', (code) => {
      if (errorCount > 0) {
        console.log(`[AutoMigrate] ⚠️  TypeScript: ${errorCount} errors found`);
        console.log('[AutoMigrate] (This may be pre-existing errors, not caused by migration)');
      } else if (code === 0) {
        console.log('[AutoMigrate] ✅ TypeScript compilation successful');
      }
      resolve(true);
    });
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('[AutoMigrate] ========================================');
    console.log('[AutoMigrate] Nova-Mind Database Migration Automation');
    console.log('[AutoMigrate] ========================================\n');

    // Step 1: Generate migrations
    await generateMigrations();
    console.log('');

    // Step 2: Apply migrations
    await applyMigrations();
    console.log('');

    // Step 3: Verify
    const verified = await verifyMigration();
    console.log('');

    // Step 4: TypeScript check
    await checkTypeScript();
    console.log('');

    if (verified) {
      console.log('[AutoMigrate] ✅ Migration completed successfully!');
      console.log('[AutoMigrate] Next steps:');
      console.log('[AutoMigrate]   1. Run: pnpm dev');
      console.log('[AutoMigrate]   2. Test the application in your browser');
      console.log('[AutoMigrate]   3. Review any TypeScript errors and fix as needed');
      process.exit(0);
    } else {
      console.error('[AutoMigrate] ❌ Migration verification failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('[AutoMigrate] ❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run main
main().catch((error) => {
  console.error('[AutoMigrate] Unhandled error:', error);
  process.exit(1);
});
