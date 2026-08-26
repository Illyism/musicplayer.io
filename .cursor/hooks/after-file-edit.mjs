#!/usr/bin/env bun
/**
 * Cursor afterFileEdit / afterTabFileEdit hook.
 *
 * Receives { file_path } JSON on stdin (absolute path). Runs a scoped
 * `ultracite fix` on the single edited file. Notification-only: always exits 0
 * so the agent is never blocked on formatting failures.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const SKIP_PREFIXES = ['public/', 'node_modules/', '.next/']
const HANDLED_FILE_REGEX = /\.(ts|tsx|js|jsx|json|css)$/

function main() {
  let filePath = ''
  try {
    const input = readFileSync(0, 'utf8')
    const payload = JSON.parse(input)
    filePath = payload.file_path ?? ''
  } catch {
    process.exit(0)
  }

  if (!filePath) {
    process.exit(0)
  }

  const projectDir = process.env.CURSOR_PROJECT_DIR || process.cwd()
  const rel = filePath.startsWith(projectDir) ? filePath.slice(projectDir.length + 1) : filePath

  if (!HANDLED_FILE_REGEX.test(rel)) {
    process.exit(0)
  }

  if (SKIP_PREFIXES.some(prefix => rel.startsWith(prefix))) {
    process.exit(0)
  }

  // Scoped fix only — never whole-tree. Skip noUnusedImports for mid-refactor edits.
  const result = spawnSync(
    'bun',
    ['x', 'ultracite', 'fix', '--skip=correctness/noUnusedImports', rel],
    { stdio: 'ignore', timeout: 25_000 }
  )

  if (result.error || (result.status !== 0 && result.status !== 1)) {
    // Best-effort; never block the agent
    console.error(`[after-file-edit] ultracite fix failed for ${rel}`)
  }
}

main()
process.exit(0)
