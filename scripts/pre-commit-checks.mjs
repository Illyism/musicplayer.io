#!/usr/bin/env bun
/**
 * Pre-commit typecheck + co-located tests.
 *
 * Usage: bun scripts/pre-commit-checks.mjs <staged files...>
 *
 * - Runs `bun run typecheck` (TS7) when TS sources or config that affects types changed.
 * - Runs co-located *.test.ts(x) for staged source files.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'

const args = process.argv.slice(2)
if (args.length === 0) {
  process.exit(0)
}

// Only consider files that exist on disk (skip deleted)
const files = args.filter(f => existsSync(f) && statSync(f).isFile())

const TRIGGERS = [/\.(ts|tsx)$/, /package\.json$/, /tsconfig.*\.json$/, /^(bun|package)-lock\./]

const needsTypecheck = files.some(f => TRIGGERS.some(re => re.test(f)))

function run(cmd, cmdArgs) {
  const result = spawnSync(cmd, cmdArgs, { shell: false, stdio: 'inherit' })
  return result.status ?? 1
}

let failed = false

if (needsTypecheck) {
  console.log('→ typecheck (TS7)')
  if (run('bun', ['run', 'typecheck']) !== 0) {
    console.error('✗ typecheck failed')
    failed = true
  }
}

// Co-located tests: for each staged source file, run its sibling test file if present
const testFiles = new Set()
for (const file of files) {
  if (!/\.(ts|tsx)$/.test(file)) {
    continue
  }
  if (/\.test\.tsx?$/.test(file)) {
    testFiles.add(file)
    continue
  }
  const dir = dirname(file)
  const base = file.replace(/\.(ts|tsx)$/, '')
  for (const candidate of [
    `${base}.test.ts`,
    `${base}.test.tsx`,
    join(dir, '__tests__', `${base.split('/').pop()}.test.ts`),
  ]) {
    if (existsSync(candidate)) {
      testFiles.add(candidate)
    }
  }
}

if (testFiles.size > 0) {
  console.log(`→ tests (${[...testFiles].join(', ')})`)
  if (run('bun', ['test', ...testFiles]) !== 0) {
    console.error('✗ tests failed')
    failed = true
  }
} else if (!needsTypecheck) {
  console.log('Nothing to check')
}

process.exit(failed ? 1 : 0)
