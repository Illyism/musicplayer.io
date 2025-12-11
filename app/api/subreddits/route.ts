import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import yaml from "js-yaml"

/**
 * API route to serve subreddits.yaml data
 * Original: GET /subreddits.json
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "subreddits.yaml")
    const fileContents = fs.readFileSync(filePath, "utf8")
    const data = yaml.load(fileContents) as any

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error reading subreddits.yaml:", error)
    return NextResponse.json(
      { error: "Failed to load subreddits" },
      { status: 500 }
    )
  }
}
