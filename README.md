# Music Player for Reddit

<div align="center">
  <br>
  <a href="https://reddit.musicplayer.io" title="reddit.musicplayer.io">
    <img width="650" src="https://cloud.githubusercontent.com/assets/304283/8148060/19b85c3c-1279-11e5-9004-7dda6ee8f7d7.png" alt="music player for reddit">
  </a>
  <br>
  <br>
</div>

> A free and open-source streaming music web player using data from Reddit.

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/musicplayer-io/redditmusicplayer.git
cd redditmusicplayer

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Reddit OAuth credentials (optional, for voting/commenting)

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

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **State Management**: Zustand
- **Icons**: Lucide React

## 📋 Requirements

- Node.js 18+ 
- npm or yarn
- Reddit OAuth app (optional, for authentication features)

## 🔧 Configuration

### Reddit OAuth (Optional)

To enable authentication, voting, and comment posting:

1. Create a Reddit OAuth app at https://www.reddit.com/prefs/apps
2. Set redirect URI: `http://localhost:3000/api/auth/reddit/callback`
3. Add to `.env.local`:
   ```env
   REDDIT_CLIENT_ID=your_client_id
   REDDIT_CLIENT_SECRET=your_client_secret
   REDDIT_REDIRECT_URI=http://localhost:3000/api/auth/reddit/callback
   ```

See [SETUP.md](./SETUP.md) for detailed setup instructions.

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
redditmusicplayer/
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

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

[GPLv3](LICENSE.md) © Ilias Ismanalijev

## 🙏 Acknowledgments

- Original project by [Ilias Ismanalijev](https://il.ly)
- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
