#!/usr/bin/env bun
/**
 * SSH tunnel to production Dragonfly/Redis.
 *
 * Usage: bun scripts/ssh-tunnel.ts [localPort]
 */

import { $, spawn } from 'bun'
import { isIP } from 'node:net'

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
const remoteHost = url.hostname
const remotePort = url.port || DEFAULT_REDIS_PORT
const localPort = process.argv[2] || DEFAULT_REDIS_PORT

async function resolveTunnelTarget(host: string) {
  if (isIP(host)) {
    return host
  }

  // Docker container names are often not resolvable from inside an SSH tunnel.
  console.log(`🔍 Looking up container: ${host}`)
  const result =
    await $`ssh -p ${SSH_PORT} ${SSH} "docker inspect ${host} --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'"`
      .quiet()
      .nothrow()

  const containerIP = result.stdout.toString().trim()
  if (result.exitCode === 0 && containerIP) {
    console.log(`✅ Found: ${containerIP}`)
    return containerIP
  }

  console.warn(`⚠️  "${host}" is not a Docker container name; using it as the SSH target host.`)
  return host
}

const tunnelTarget = await resolveTunnelTarget(remoteHost)

// Build local connection string, preserving credentials and DB/index path.
url.hostname = 'localhost'
url.port = localPort
const localUrl = url.toString()

console.log(`\n🚇 Tunnel: localhost:${localPort} → ${tunnelTarget}:${remotePort}`)
console.log(`\n💡 REDIS_URL="${localUrl}"\n`)

const tunnel = spawn({
  cmd: ['ssh', '-N', '-L', `${localPort}:${tunnelTarget}:${remotePort}`, '-p', SSH_PORT, SSH],
  stdout: 'inherit',
  stderr: 'inherit',
})

process.on('SIGINT', () => {
  tunnel.kill()
  process.exit(0)
})
await tunnel.exited
