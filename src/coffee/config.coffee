global.API =
	Bandcamp:
		base: "//api.bandcamp.com/api"
		key: process.env.PUBLIC_BANDCAMP_KEY
	Soundcloud:
		base: "//api.soundcloud.com"
		key: process.env.PUBLIC_SOUNDCLOUD_KEY
	Reddit:
		base: "//www.reddit.com"
	MusicPlayer:
		base: "https://reddit.musicplayer.io"
		short: "http://r.il.ly"

global.FLAG_DEBUG = false
global.FLAG_DEBUG = true if localStorage? and localStorage.debug and localStorage.debug is "true"