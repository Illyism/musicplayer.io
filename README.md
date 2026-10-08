# Music Player for Reddit

<div align="center">
  <br>
  <a href="https://musicplayer.io" title="musicplayer.io">
    <img width="650" src="https://cloud.githubusercontent.com/assets/304283/8148060/19b85c3c-1279-11e5-9004-7dda6ee8f7d7.png" alt="music player for reddit">
  </a>
  <br>
  <br>
</div>

> A free and open-source streaming music web player using data from Reddit.

## 📦 Repository Structure

This repository contains two versions:

- **`main` branch** (default): Modern Next.js 16/React/TypeScript implementation
- **`coffeescript` branch**: Legacy CoffeeScript/Backbone.js version (v0.6.14)

The `main` branch is the active development branch with all the latest features and improvements.

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/musicplayer-io/musicplayer.io.git
cd musicplayer.io

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Reddit OAuth credentials

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

The app will be available at `http://localhost:3000`

## ✨ Features

- 🎵 **Music Playback** - Support for YouTube, SoundCloud, Vimeo, and MP3
- 🔍 **Reddit Search** - Search Reddit for music
- 📱 **Mobile Friendly** - Responsive design with mobile navigation
- ⌨️ **Keyboard Shortcuts** - Space for play/pause, Ctrl+Arrows for navigation
- 🔐 **Reddit Authentication** - Login to vote and comment
- 💾 **LocalStorage** - Saves your subreddit preferences
- 🔗 **Share Playlists** - Share your custom playlists
- 🎨 **Modern UI** - Built with Next.js 16, React, and Tailwind CSS

## Community discovery and listening

Music communities now come from bounded Reddit OAuth searches and current activity samples. Live, cached, and unverified starter results keep their source and original check time. Read the [discovery contract, request limits, and Reddit access requirements](docs/community-discovery.md).

Capture a temporary local discovery receipt with `bun scripts/capture-community-discovery.ts` using the app's configured credentials. The script saves community metadata and aggregate counts, never post text, authors, or media URLs. These files are excluded from Git and Docker images and are not loaded by production; delete or refresh them within 48 hours.

Recommendations adapt to play, skip, and save events on this device. They use fixed scoring rules and never train on Reddit content. [Local listening and bookmark refresh](docs/local-listening.md) describes controls, retention, and the saved-track API.

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **State Management**: Zustand
- **Icons**: Lucide React

## 📋 Requirements

- Node.js 22+
- npm or yarn
- Reddit OAuth app credentials (required to fetch Reddit listings)

## 🔧 Configuration

### Reddit OAuth

Reddit app credentials are required for listing reads and for sign-in, voting, and comment posting:

1. Create a **web app** at https://www.reddit.com/prefs/apps
2. Set redirect URI: `http://localhost:3000/auth/callback`
3. Add to `.env.local`:
   ```env
   REDDIT_CLIENT_ID=your_client_id
   REDDIT_CLIENT_SECRET=your_client_secret
   REDDIT_REDIRECT_URI=http://localhost:3000/auth/callback
   ```

For production, set `REDDIT_REDIRECT_URI=https://musicplayer.io/auth/callback` (replace the origin with your deployment's public address) and register that **exact** address in Reddit's app settings. Use the same hostname to open the website and sign in. `NEXT_PUBLIC_SITE_URL` is an optional fallback when `REDDIT_REDIRECT_URI` is unset; otherwise the authorization request's origin is used.

Authorization and token exchange use `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` on the server at runtime. A separate `NEXT_PUBLIC_REDDIT_CLIENT_ID` is no longer required, including in Docker deployments. Missing configuration produces a sign-in error instead of breaking the page. Never publish the client secret.

If Reddit rejects sign-in, verify that the app type is **web app**, its client ID and secret match the runtime configuration, and the callback address is exact. Expired/used authorization codes require starting a new sign-in.

## 📖 Usage

### Basic Usage

1. **Browse Subreddits**: Click on subreddits in the left panel to add them to your playlist
2. **Play Music**: Click any song in the playlist to start playing
3. **Search**: Use the search bar to find music on Reddit
4. **Sort**: Change sort method (Hot, New, Top) in the playlist panel
5. **Share**: Click "Share" button to share your playlist

### Keyboard Shortcuts

- `Space` - Play/Pause
- `Ctrl + →` - Next song
- `Ctrl + ←` - Previous song
- `Ctrl + ↑` - Volume up
- `Ctrl + ↓` - Volume down

### URL Parameters

- `/r/listentothis` - Load specific subreddit
- `/r/listentothis+music` - Load multiple subreddits
- `?r=listentothis` - Query parameter format

## 🏗️ Project Structure

```
musicplayer.io/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (12 routes)
│   ├── r/                 # Dynamic subreddit routes
│   ├── remote/            # Remote control page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
│
├── components/            # React components
│   ├── players/          # Music players (4)
│   ├── ui/               # shadcn/ui components
│   └── *.tsx             # Feature components (11)
│
├── lib/                   # Utilities & business logic
│   ├── auth/             # Authentication
│   ├── hooks/            # Custom hooks (5)
│   ├── utils/           # Utilities
│   ├── store.ts         # Zustand store
│   └── constants.ts     # Constants
│
├── public/               # Static assets
│   └── images/          # Images & icons
│
└── [config files]        # Root level configs
```

## 🧪 Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 📝 Migration Status

This project has been migrated from CoffeeScript/Backbone.js to Next.js 16/React/TypeScript.

**Conversion Progress**: 100% complete - All features fully functional!

The original CoffeeScript/Backbone.js codebase is preserved in the [`coffeescript` branch](https://github.com/musicplayer-io/musicplayer.io/tree/coffeescript) for reference.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

[O’Saasy](LICENSE.md) © Ilias Ism

## 🙏 Acknowledgments

- Original project by [Ilias Ismanalijev](https://il.ly)
- Next.js migration by [mdanassaif](https://github.com/mdanassaif)
- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
