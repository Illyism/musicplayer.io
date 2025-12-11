import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

/**
 * Generate a remote control hash/token
 * Original: POST /remote/generate -> generates hash for remote control
 */
export async function POST(request: NextRequest) {
  // Generate a random hash
  const hash = crypto.randomBytes(16).toString('hex')
  
  return NextResponse.json({ hash })
}
