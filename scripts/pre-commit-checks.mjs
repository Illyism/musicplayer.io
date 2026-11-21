#!/usr/bin/env bun
import { spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'

const args = process.argv.slice(2)
if (args.length === 0) {
  process.exit(0)
}

const files = args.filter(f => existsSync(f) && statSync(f).isFile())

const TRIGGERS = [
  /\.(?:ts|tsx)$/u,
  /package\.json$/u,
  /tsconfig.*\.json$/u,
  /^(?:bun|package)-lock\./u,
]

const needsTypecheck = files.some(f => TRIGGERS.some(re => re.test(f)))

if (!needsTypecheck) {
  console.log('Nothing to check')
  process.exit(0)
}

console.log('→ typecheck (TS7)')
const result = spawnSync('bun', ['run', 'typecheck'], { shell: false, stdio: 'inherit' })
if ((result.status ?? 1) !== 0) {
  console.error('✗ typecheck failed')
  process.exit(1)
}
