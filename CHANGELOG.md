## Changelog

### 0.6.14 - 24 August 2020

- For easier maintenance, using file session store instead of redis session store.
- Added sqreen for improved security
- Updated dependencies and fixed build
- Moved to a green host: https://datacenterlight.ch/
- Note: Check out https://github.com/illyism/musicplayer for the latest version of the music player in TypeScript and Vue.js!

### 0.6.13 - 7 November 2018

- Routes all JSON requests to Reddit to avoid issues with adblockers or privacy extensions

### 0.6.12 - 2 August 2017

- Fixes for soundcloud volume changing from 0-1 to 0-100

### 0.6.11 - 3 January 2017

- Fixes for remote control

### 0.6.10 - 16 December 2015

- Added SoundcloudPlayer logging on ready and errors
- Skipping when a Soundcloud link has errors
- Improved ID matching in YouTube

### 0.6.9 - 15 December 2015

- Updated Lodash
- Improve performance of search-as-you-type
- Searching subreddits show all matches, not just subs starting with the match

### 0.6.8 - 11 December 2015

- Added a [beta](https://beta.musicplayer.io) channel
- Change the current song view to include actions above the description
- Filtering out self posts

### 0.6.7 - 7 December 2015

- Added IndustrialTechno, video category

### 0.6.6 - 6 December 2015

- Removed poll
- Slightly bigger controls
- Fixed scrollbars on webkit

### 0.6.5 - 23 November 2015

- Changed the titlebar menu items to a dropdown with text
- Removed survey message, added poll message
- Fixed hover on dropdown menus

### 0.6.4 - 16 November 2015

- Fixes for YouTube

### 0.6.2 - 16 November 2015

- another Soundcloud fix
- Added a survey message until next week

### 0.6.1 - 10 November 2015

- Fixes for messages
- Nicer looking messages on mobile phones
- Added a help link for some messages
- Highlights on clicking items in the playlist and sub playlists
- Added a `/r/` before custom subreddit to try to decrease confusion

### 0.6.0 - 10 November 2015

- Restructured the front-end code
  - Separated files in collections, controllers, models, players and views
  - Using a Constants object instead of simple strings to keep track of events
  - Separated other code in an Util.coffee file
  - Using a Store for maintaining other state
  - Using Browserify to compile CoffeeScript \* Slightly more enforced coffee linter
- Removed support for Bandcamp
- Fixes for Soundcloud sets / playlists

### 0.5.17 - 24 September 2015

- Clean up comment styles
- Add moderator color for comments
- Add submitter color for comments

### 0.5.16 - 22 September 2015

- Remove ListenToThis when adding a new sub if ListenToThis was added as default

### 0.5.15 - 16 September 2015

- Add timestamps to dates
- Fix metalcore being listed twice - brandly
- Fix layout for subreddit list heading - brandly
- Fix upvote/downvote cursor - mixxorz

### 0.5.14 - 17 July 2015

- Sorting subreddits by subscribers instead, adding more options in the future
- Showing the title and description in the subreddit browser on hover

### 0.5.13 - 11 July 2015

- Mobile UI is now cleaner; hiding thumbnails on very small phones and tiny tweaks
- Shuffle button shuffles your current playlist once per click
- Getting more music is now more performant

### 0.5.12 - 10 July 2015

- Volume control draggable
- First-class Vimeo support; custom color, play/pause/ended events, loaded progress, seeking, playing progress, skips to the next song when done, volume control
- Larger, visual player for soundcloud and fixes

### 0.5.11 - 9 July 2015

- Hover on image links in the comments to preview them

### 0.5.10 - 9 July 2015

- Sharing subreddit playlists via url or to Twitter, Facebook, Gplus, /r/musicplayer

### 0.5.9 - 9 July 2015

- Colors per type: youtube, soundcloud, vimeo, bandcamp, self/link
- Cleaner UI for metadata

### 0.5.8 - 8 July 2015

- Hooks for API

### 0.5.7 - 1 July 2015

- Custom Subreddit search fix

### 0.5.6 - 28 June 2015

- Deeper comments are darker to show hierarchy
- You can collapse comments
- Show a message when trying to vote or comment and not logged in
- Remove downvote count
- Permalink to comment

### 0.5.5 - 25 June 2015

- Fix message overlap with comment

### 0.5.4 - 24 June 2015

- Moved to musicplayer.io completely
- Fixes for long comment threads
- Only show imgur images, not albums
- Use HTTPS for images and thumbs if on HTTPS

### 0.5.3 - 23 June 2015

- Add ItalianMusic, BrazilianMusic
- Move Gabber to Electronic
- Volume Control fixes
- Fix timestamp in current song
- Loader for first load
- Moving to musicplayer-io
- Donation drive
- Messages shown when there is an error

### 0.5.1 - 14 June 2015

- Playlist limit to 100
- Linting
- Shuffling subreddit selections
- Easier, navigation
- Subs added: 1960s, whitelabels, rocksteady

### 0.5.0 - 12 June 2015

- Change some names to **Music Player for Reddit**
- Performance tweaks to reduce amount of API requests
- GA to GTM
- Sync versions throughout the file
- Remote Control checkbox is more clear
- Loaded Progress bar has better contrast
- Anonymous remote control

### 0.4.2 - 10 June 2015

- Refreshing the logo
- Removing the About view
- Stripping out dated meta-data
- Update CSS framework
- Icons for NSFW, proper margin for thumbnails
- Switching from Underscore to Lodash
- Custom subreddit search does a filter on existing ones
- Loading icon on load more
- Fix /r/sub urls
- Fix /r/sub+sub urls
- Fix soundcloud waveform colors

### 0.4.1 - 18 May 2015

- Scrolling to next song (21 August)
- Youtube media data not being sent by Reddit -> Workaround
- Less border around video / soundcloud
- Updated dependencies and libraries
- Saving custom subreddits for next load

### 0.4.0 - 8 August 2014

- Darker colors
- Button Colors
- Don't show amount of comments if there are none
- Header
- Tabs on mobile change text if you switch page

### 0.3.9 - 8 August 2014

- Handling https on reverse proxy with nginx
- Fixes for firefox
- Hiding bigger thumbnail on youtube videos
- Saving sorting options

### 0.3.8 - 6 August 2014

- Custom Subreddits
- Search Reddit

### 0.3.7 - 6 August 2014

- Remote Control

### 0.3.6 - 4 August 2014

- Multireddits

### 0.3.5 - 12 July 2014

- Different Colors, minor UI tweaks
- Bug fix for Safari
- Volume control

### 0.3.4 - 8 July 2014

- Mobile
- custom subreddits: /r/custom+custom2+...
- autoplay: /r/custom?autoplay
- bug fixes with logging in

### 0.3.3 - 6 July 2014

- Space for Play or Pause is now Ctrl + Space
- New UI

### 0.3.2 - 13 June 2014

- Keyboard support
- Ctrl + Right / Down Arrow = Next Song
- Ctrl + Left / Up Arrow = Previous Song
- Space = Play or Pause
- More subreddits

### 0.3.1 - 7 June 2014

- Bug fixes
- Youtu.be
- Link to browse in playlist
- Seeking in Progress bar
- Saving sortmethod
- Vimeo
- Less pausing (no video / errors)
- some subreddits added

### 0.3.0 - 21 February 2014

- Complete Coffeescript Refactor
- Upvoting, downvoting
- Logging in
- Comments

### 0.2.3 - 18 February 2014

- Video Mode

### 0.2.2 - 28 January 2014

- Message if no subreddits are selected
- Started on Windows 8 Store build
- Added Github link on titlebar
- New homepage with features, sharing and shortcuts
- New Icon
- New Subreddits: [90sAlternative](http://reddit.com/r/90sAlternative), [90sHipHop](http://reddit.com/r/90sHipHop), [90smusic](http://reddit.com/r/90smusic), [90sPunk](http://reddit.com/r/90sPunk), [AbletonProductions](http://reddit.com/r/AbletonProductions), [AcousticOriginals](http://reddit.com/r/AcousticOriginals), [allcore](http://reddit.com/r/allcore), [altcountry](http://reddit.com/r/altcountry), [Alternativerock](http://reddit.com/r/Alternativerock), [ambient](http://reddit.com/r/ambient), [Asianrap](http://reddit.com/r/Asianrap), [astateoftrance](http://reddit.com/r/astateoftrance), [BigRoom](http://reddit.com/r/BigRoom), [BlackMetal](http://reddit.com/r/BlackMetal), [Bluegrass](http://reddit.com/r/Bluegrass), [BluesRock](http://reddit.com/r/BluesRock), [Boneyard](http://reddit.com/r/Boneyard), [BoogieMusic](http://reddit.com/r/BoogieMusic), [CanadianMusic](http://reddit.com/r/CanadianMusic), [chillout](http://reddit.com/r/chillout), [choralmusic](http://reddit.com/r/choralmusic), [Christcore](http://reddit.com/r/Christcore), [ChristianMusic](http://reddit.com/r/ChristianMusic), [CircleMusic](http://reddit.com/r/CircleMusic), [ClassicMetal](http://reddit.com/r/ClassicMetal), [ClassicRock](http://reddit.com/r/ClassicRock), [ClassicTrance](http://reddit.com/r/ClassicTrance), [country](http://reddit.com/r/country), [CountryMusic](http://reddit.com/r/CountryMusic), [cpop](http://reddit.com/r/cpop), [cratedigging](http://reddit.com/r/cratedigging), [danceparty](http://reddit.com/r/danceparty), [Deathcore](http://reddit.com/r/Deathcore), [Deathmetal](http://reddit.com/r/Deathmetal), [Deathstep](http://reddit.com/r/Deathstep), [Disco](http://reddit.com/r/Disco), [Djent](http://reddit.com/r/Djent), [doommetal](http://reddit.com/r/doommetal), [Downtempo](http://reddit.com/r/Downtempo), [early2000sjams](http://reddit.com/r/early2000sjams), [EDM](http://reddit.com/r/EDM), [Electronica](http://reddit.com/r/Electronica), [electronicmetal](http://reddit.com/r/electronicmetal), [ElitistClassical](http://reddit.com/r/ElitistClassical), [EmoScreamo](http://reddit.com/r/EmoScreamo), [epicmetal](http://reddit.com/r/epicmetal), [esoterofunk](http://reddit.com/r/esoterofunk), [experimentalmusic](http://reddit.com/r/experimentalmusic), [folk](http://reddit.com/r/folk), [folkmetal](http://reddit.com/r/folkmetal), [folkPunk](http://reddit.com/r/folkPunk), [futuresynth](http://reddit.com/r/futuresynth), [gabber](http://reddit.com/r/gabber), [GaragePunk](http://reddit.com/r/GaragePunk), [GermanRap](http://reddit.com/r/GermanRap), [germusic](http://reddit.com/r/germusic), [Glitchhop](http://reddit.com/r/Glitchhop), [grindcore](http://reddit.com/r/grindcore), [Hardcore](http://reddit.com/r/Hardcore), [HardRock](http://reddit.com/r/HardRock), [HeadBangToThis](http://reddit.com/r/HeadBangToThis), [HipHipInstrumentals](http://reddit.com/r/HipHipInstrumentals), [hiphop101](http://reddit.com/r/hiphop101), [hiphop](http://reddit.com/r/hiphop), [ICoveredASong](http://reddit.com/r/ICoveredASong), [indie](http://reddit.com/r/indie), [indie_rock](http://reddit.com/r/indie_rock), [IndieFolk](http://reddit.com/r/IndieFolk), [Indiewok](http://reddit.com/r/Indiewok), [Jambands](http://reddit.com/r/Jambands), [japanesemusic](http://reddit.com/r/japanesemusic), [JazzyHiphop](http://reddit.com/r/JazzyHiphop), [jpop](http://reddit.com/r/jpop), [kpop](http://reddit.com/r/kpop), [listentoconcerts](http://reddit.com/r/listentoconcerts), [listentomusic](http://reddit.com/r/listentomusic), [LocalPunkMusic](http://reddit.com/r/LocalPunkMusic), [mathrock](http://reddit.com/r/mathrock), [MelodicDeathMetal](http://reddit.com/r/MelodicDeathMetal), [melodichardcore](http://reddit.com/r/melodichardcore), [Metal](http://reddit.com/r/Metal), [Metalcore](http://reddit.com/r/Metalcore), [mixes](http://reddit.com/r/mixes), [monsterfuzz](http://reddit.com/r/monsterfuzz), [mymusic](http://reddit.com/r/mymusic), [newgrass](http://reddit.com/r/newgrass), [noisemusic](http://reddit.com/r/noisemusic), [noiserock](http://reddit.com/r/noiserock), [NOLAMusic](http://reddit.com/r/NOLAMusic), [obscuremusic](http://reddit.com/r/obscuremusic), [oldiemusic](http://reddit.com/r/oldiemusic), [opera](http://reddit.com/r/opera), [OutlawCountry](http://reddit.com/r/OutlawCountry), [outrun](http://reddit.com/r/outrun), [partymusicstation](http://reddit.com/r/partymusicstation), [poppunkers](http://reddit.com/r/poppunkers), [PostHardcore](http://reddit.com/r/PostHardcore), [postmetal](http://reddit.com/r/postmetal), [postpunk](http://reddit.com/r/postpunk), [PowerMetal](http://reddit.com/r/PowerMetal), [progmetal](http://reddit.com/r/progmetal), [progrockmusic](http://reddit.com/r/progrockmusic), [progtrance](http://reddit.com/r/progtrance), [Psybient](http://reddit.com/r/Psybient), [psychedelicrock](http://reddit.com/r/psychedelicrock), [Punk_Rock](http://reddit.com/r/Punk_Rock), [rapbattles](http://reddit.com/r/rapbattles), [realproghouse](http://reddit.com/r/realproghouse), [rnb](http://reddit.com/r/rnb), [rock](http://reddit.com/r/rock), [shoegaze](http://reddit.com/r/shoegaze), [sludge](http://reddit.com/r/sludge), [swinghouse](http://reddit.com/r/swinghouse), [synthwave](http://reddit.com/r/synthwave), [TechnicalDeathMetal](http://reddit.com/r/TechnicalDeathMetal), [texascountry](http://reddit.com/r/texascountry), [ThisIsOurMusic](http://reddit.com/r/ThisIsOurMusic), [touhoumusic](http://reddit.com/r/touhoumusic), [tranceandbass](http://reddit.com/r/tranceandbass), [trapmuzik](http://reddit.com/r/trapmuzik), [treemusic](http://reddit.com/r/treemusic), [TrueBlackMetal](http://reddit.com/r/TrueBlackMetal), [trueMusic](http://reddit.com/r/trueMusic), [tunejerk](http://reddit.com/r/tunejerk), [Twee](http://reddit.com/r/Twee), [under10k](http://reddit.com/r/under10k), [vintageobscura](http://reddit.com/r/vintageobscura), [WorldMusic](http://reddit.com/r/WorldMusic), [WWCC](http://reddit.com/r/WWCC).

### 0.2.0 - 15 January 2014

- Multi multireddit support. [user/br1anfry3r/m/music+user/Rakielis/m/electronica](http://reddit.music.player.il.ly/user/br1anfry3r/m/music+user/Rakielis/m/electronica).
- Soundcloud fix
- Youtu.be support
- Native in **Alpha**. Only with youtube. Ask me.
- Big player rework for Chrome app, but still having issues.
- Comments threads support
- Made a quick landing page for the website and moved the player to /player/

### 0.1.2 - 11 January 2014

- Bookmark and url support for the website. [/r/dnb+postrock](http://reddit.music.player.il.ly/r/dnb+postrock).
- To make this easy, the url gets updated if you add or remove subreddits. Remember that the currently selected subreddits will stay for the next session. So on reload you load this set again until you change it by clearing, adding or removing subreddits.
- Autoplay support. [/r/dnb+postrock?autoplay](http://reddit.music.player.il.ly/r/dnb+postrock?autoplay)
- Can also use website via: reddit.il.ly, www.reddit.il.ly, redditmusicplayer.il.ly. This makes it easy to load subreddits. Just change .com to .il.ly in a reddit overview and it'll load the right subreddits.
- Multireddit support

### 0.1.1 - 8 January 2014

- The sorting dropdown are now all seperate menu buttons on the top. With a dropdown for the top.
- Links added to the titlebar.
- Clear all subreddits now happens in edit subreddits mode.
- The seperate page for settings is (temporarily) removed.
- Settings will now simply be the previous state of the player.
- The bottom music seek bar is now a bit taller.
- Play & Stop button is working properly.
- The previous song button is now disabled if it's the first song in the playlist.
- Posts have metadata: ups/downs, author, time, subreddit, website, permalink
