#!/usr/bin/env bun
/**
 * SSH tunnel to production Dragonfly/Redis.
 *
 * Usage: bun scripts/ssh-tunnel.ts [localPort]
 */

import { $, spawn } from 'bun'

const SSH = 'illyism@94.130.66.215'
const SSH_PORT = '10001'
const DEFAULT_REDIS_PORT = '6379'

const PROD_REDIS_URL = process.env.PROD_REDIS_URL

if (!PROD_REDIS_URL) {
  console.error('❌ Set PROD_REDIS_URL in your .env')
  console.error('   Example: PROD_REDIS_URL="redis://:password@container-name:6379/0"')
  process.exit(1)
}

const url = new URL(PROD_REDIS_URL)
const container = url.hostname
const remotePort = url.port || DEFAULT_REDIS_PORT
const localPort = process.argv[2] || DEFAULT_REDIS_PORT

// Get container IP (Docker container names aren't resolvable via SSH)
console.log(`🔍 Looking up container: ${container}`)
const result =
  await $`ssh -p ${SSH_PORT} ${SSH} "docker inspect ${container} --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'"`.quiet()

if (result.exitCode !== 0 || !result.stdout.toString().trim()) {
  console.error(`❌ Container "${container}" not found on remote server`)
  console.error(
    '   Run: ssh -p 10001 illyism@94.130.66.215 "docker ps" to see available containers'
  )
  process.exit(1)
}

const containerIP = result.stdout.toString().trim()
console.log(`✅ Found: ${containerIP}`)

// Build local connection string, preserving credentials and DB/index path.
url.hostname = 'localhost'
url.port = localPort
const localUrl = url.toString()

console.log(`\n🚇 Tunnel: localhost:${localPort} → ${containerIP}:${remotePort}`)
console.log(`\n💡 REDIS_URL="${localUrl}"\n`)

const tunnel = spawn({
  cmd: ['ssh', '-N', '-L', `${localPort}:${containerIP}:${remotePort}`, '-p', SSH_PORT, SSH],
  stdout: 'inherit',
  stderr: 'inherit',
})

process.on('SIGINT', () => {
  tunnel.kill()
  process.exit(0)
})
await tunnel.exited
