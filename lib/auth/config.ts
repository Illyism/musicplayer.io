/**
 * Reddit OAuth Configuration
 * Create a Reddit OAuth app at: https://www.reddit.com/prefs/apps
 * 
 * For development:
 * - Redirect URI: http://localhost:3000/api/auth/reddit/callback
 * 
 * For production:
 * - Redirect URI: https://yourdomain.com/api/auth/reddit/callback
 */

export const redditAuthConfig = {
  clientId: process.env.REDDIT_CLIENT_ID || '',
  clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
  redirectUri: process.env.REDDIT_REDIRECT_URI || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://yourdomain.com/api/auth/reddit/callback'
      : 'http://localhost:3000/api/auth/reddit/callback'),
  scope: 'identity read save vote submit',
  baseUrl: 'https://ssl.reddit.com/api/v1',
  authUrl: 'https://www.reddit.com/api/v1/authorize',
  tokenUrl: 'https://www.reddit.com/api/v1/access_token',
}



