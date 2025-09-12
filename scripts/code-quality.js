#!/usr/bin/env node

/**
 * 🔧 Code Quality Improvement Script
 * Helps incrementally improve TypeScript strictness and code quality
 */

const fs = require('fs')
const path = require('path')

const CONFIG_PATH = path.join(__dirname, '..', 'tsconfig.json')

/**
 * Read and parse tsconfig.json
 */
function readTsConfig() {
  try {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8')
    return JSON.parse(content)
  } catch (error) {
    console.error('❌ Failed to read tsconfig.json:', error.message)
    process.exit(1)
  }
}

/**
 * Write tsconfig.json
 */
function writeTsConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
    console.log('✅ Updated tsconfig.json')
  } catch (error) {
    console.error('❌ Failed to write tsconfig.json:', error.message)
    process.exit(1)
  }
}

/**
 * Enable TypeScript strict checking incrementally
 */
function enableStrictChecking() {
  const config = readTsConfig()
  
  console.log('🔧 Enabling stricter TypeScript checking...')
  
  // Gradually enable stricter options
  const strictOptions = {
    noImplicitAny: true,
    noUncheckedIndexedAccess: true,
    exactOptionalPropertyTypes: true,
    noPropertyAccessFromIndexSignature: true
  }
  
  let changes = 0
  
  for (const [option, value] of Object.entries(strictOptions)) {
    if (config.compilerOptions[option] !== value) {
      config.compilerOptions[option] = value
      changes++
      console.log(`  ✓ Enabled ${option}`)
    }
  }
  
  if (changes > 0) {
    writeTsConfig(config)
    console.log(`📊 Applied ${changes} stricter TypeScript options`)
  } else {
    console.log('📊 All strict options are already enabled')
  }
}

/**
 * Main execution
 */
function main() {
  const command = process.argv[2]
  
  switch (command) {
    case 'strict':
      enableStrictChecking()
      break
    case 'check':
      console.log('🔍 Checking current TypeScript configuration...')
      const config = readTsConfig()
      console.log('Current strict options:')
      console.log('  noImplicitAny:', config.compilerOptions.noImplicitAny)
      console.log('  noUncheckedIndexedAccess:', config.compilerOptions.noUncheckedIndexedAccess)
      console.log('  exactOptionalPropertyTypes:', config.compilerOptions.exactOptionalPropertyTypes)
      console.log('  noPropertyAccessFromIndexSignature:', config.compilerOptions.noPropertyAccessFromIndexSignature)
      break
    default:
      console.log(`
🔧 Code Quality Improvement Tool

Usage: node scripts/code-quality.js <command>

Commands:
  strict  Enable stricter TypeScript checking
  check   Check current TypeScript configuration

Examples:
  node scripts/code-quality.js check
  node scripts/code-quality.js strict
`)
  }
}

main()