crypto = require 'crypto'
seo = require './seo'
pkg = require '../../package.json'

# App controller
# Serves the application - Main Category

render = (request, response, page, obj) ->
	response.render "content/main/#{page}", (err, html) ->
		return console.error err if err?
		data =
			content: html
			user: request.user._json if request.user?
			user_json = JSON.stringify(request.user._json) if request.user?
			seo: seo.generate page
			page: page
			remote: obj.hash if obj? and obj.hash?
			pkg: pkg
		if request.xhr then response.send data else response.render 'app', data

class AppController
	browse: (request, response, callback) ->
		render(request, response, 'browse')
	playlist: (request, response, callback) ->
		render(request, response, 'playlist')
	remote: (request, response, callback) ->
		render(request, response, 'remote')
	remoteGenerate: (request, response, callback) ->
		hash = crypto.randomBytes(8).toString('hex')
		request.user.hash = hash
		response.send hash
	remoteHash: (request, response, callback) ->
		render request, response, 'remote', hash: request.params.hash
	search: (request, response, callback) ->
		render request, response, 'search'

controller = new AppController
module.exports = controller
