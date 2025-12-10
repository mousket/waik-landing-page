#!/usr/bin/env node

/**
 * Build Script for Static Homepage Export
 * 
 * This script temporarily moves the API directory to exclude it from static export,
 * builds the home page as a static site, then restores the API directory.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const APP_DIR = path.join(__dirname, '..', 'app')
const API_DIR = path.join(APP_DIR, 'api')
const BACKUP_DIR = path.join(__dirname, '..', '.app-backup')
const NEXT_CONFIG = path.join(__dirname, '..', 'next.config.mjs')

// Directories/files to keep for homepage-only build
const KEEP_IN_APP = ['page.tsx', 'layout.tsx', 'globals.css']

// Directories to temporarily move (these have dynamic routes or API routes)
const DIRS_TO_MOVE = ['api', 'admin', 'staff', 'incidents', 'waik-demo-start']

console.log('🚀 Starting static homepage build (home page only)...\n')

// Check if app directory exists
if (!fs.existsSync(APP_DIR)) {
  console.error('❌ App directory not found!')
  process.exit(1)
}

try {
  // Step 1: Read current next.config.mjs
  console.log('📝 Reading next.config.mjs...')
  const configContent = fs.readFileSync(NEXT_CONFIG, 'utf8')
  
  // Step 2: Check if output is already set to 'export'
  if (!configContent.includes("output: 'export'")) {
    // Temporarily update config to use 'export'
    console.log('⚙️  Updating next.config.mjs for static export...')
    const updatedConfig = configContent.replace(
      /output:\s*['"]standalone['"]/,
      "output: 'export'"
    )
    fs.writeFileSync(NEXT_CONFIG, updatedConfig)
  }

  // Step 3: Move directories with dynamic routes/API routes temporarily
  console.log('📦 Temporarily moving directories with dynamic routes...')
  if (fs.existsSync(BACKUP_DIR)) {
    fs.rmSync(BACKUP_DIR, { recursive: true, force: true })
  }
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
  
  const movedDirs = []
  for (const dirName of DIRS_TO_MOVE) {
    const dirPath = path.join(APP_DIR, dirName)
    if (fs.existsSync(dirPath)) {
      const backupPath = path.join(BACKUP_DIR, dirName)
      fs.renameSync(dirPath, backupPath)
      movedDirs.push(dirName)
      console.log(`   ✓ Moved app/${dirName}`)
    }
  }
  console.log(`✅ Moved ${movedDirs.length} directories\n`)

  // Step 4: Build static site
  console.log('🏗️  Building static homepage...')
  execSync('npm run build', { stdio: 'inherit' })
  console.log('\n✅ Static build complete!\n')

} catch (error) {
  console.error('\n❌ Build failed:', error.message)
  process.exit(1)
} finally {
  // Step 5: Restore moved directories
  if (fs.existsSync(BACKUP_DIR)) {
    console.log('📦 Restoring moved directories...')
    for (const dirName of DIRS_TO_MOVE) {
      const backupPath = path.join(BACKUP_DIR, dirName)
      const originalPath = path.join(APP_DIR, dirName)
      if (fs.existsSync(backupPath)) {
        if (fs.existsSync(originalPath)) {
          fs.rmSync(originalPath, { recursive: true, force: true })
        }
        fs.renameSync(backupPath, originalPath)
        console.log(`   ✓ Restored app/${dirName}`)
      }
    }
    // Clean up backup directory
    try {
      fs.rmSync(BACKUP_DIR, { recursive: true, force: true })
    } catch (e) {
      // Ignore cleanup errors
    }
    console.log('✅ All directories restored')
  }

  // Step 6: Restore original config
  console.log('⚙️  Restoring next.config.mjs...')
  try {
    const configContent = fs.readFileSync(NEXT_CONFIG, 'utf8')
    const restoredConfig = configContent.replace(
      /output:\s*['"]export['"]/,
      "output: 'standalone'"
    )
    fs.writeFileSync(NEXT_CONFIG, restoredConfig)
    console.log('✅ Config restored\n')
  } catch (e) {
    console.warn('⚠️  Warning: Could not restore config automatically')
  }
}

console.log('🎉 Done! Your static homepage is in the "out" directory.')
console.log('📁 You can deploy the "out" folder to any static hosting service.\n')

