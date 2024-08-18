module.exports =
	base: "https://ssl.reddit.com/api"
	client_id: process.env.REDDIT_CLIENT_ID
	client_secret: process.env.REDDIT_CLIENT_SECRET
	secret: process.env.REDDIT_CLIENT_SECRET
	redirect_uri: process.env.REDDIT_REDIRECT_URI || "http://localhost:4008/auth/reddit/callback"
	scope: "identity,read,save,vote,submit"
