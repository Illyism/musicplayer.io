import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { TitleBar } from "@/components/titlebar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Music Player for Reddit | A Free and Open-Source Music Player",
  description: "Play music from subreddits on Reddit. Listen to the user-curated music on the web. Music subreddits in one open-source and free music player.",
  keywords: "reddit, music, player, subreddits, playlist, tunes, playlister, playlist",
  openGraph: {
    title: "Music Player for Reddit",
    description: "Play music from subreddits on Reddit. Listen to user-curated music.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Music Player for Reddit",
    description: "Play music from subreddits on Reddit.",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" sizes="16x16 32x32 48x48 64x64" href="/images/icon/favicon.ico" />
        <link rel="shortcut icon" href="/images/icon/favicon.ico" />
        <link rel="apple-touch-icon-precomposed" href="/images/icon/favicon-152.png" />
        <meta name="msapplication-TileColor" content="#FDC00F" />
        <meta name="msapplication-TileImage" content="/images/icon/favicon-144.png" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <TitleBar />
        {children}
      </body>
    </html>
  )
}
