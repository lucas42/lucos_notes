
var fs = require('fs')
   url = require('url'),
   querystring = require('querystring'),
   resources = require('../core/resources.js');
const stateFile = '/var/lib/notes/data.json';
var notes = {};
getState(function(err, parsedData) {
	if (err) {
		console.error("Can't parse existing data.  Creating blank file.  "+err);
		saveState();
	}
	notes = parsedData;
});
var agents = {};

function getState(callback) {
	fs.readFile(stateFile, function(err, data) {
	try {
		if (err) throw err;
		const parsedData = JSON.parse(data);
		if (typeof parsedData != "object") throw "Incorrect data type: "+(typeof parsedData);
		callback(null, parsedData);
	} catch (e) {
		callback(e, {});
	}
});
}

function saveState() {
	fs.unlink(stateFile, function(unlinkErr) {
		fs.writeFile(stateFile, JSON.stringify(notes), function(writeErr) {
			if (writeErr) {
				console.error("Error saving state:", writeErr.message);
			}
		});
	});
}

resources.add("noteslib", "js", "noteslib.js");
resources.add("adminscript", "js", "admin.js");
resources.add("todo", "js", "todo.js");
resources.add("style", "css", "style.css");

// Map of static files
// Key is HTTP path to match
// Value is Array of [path_on_filesystem, mimetype, is_public]
var staticfiles = {
	'/notes.manifest': ['manifest', 'text/cache-manifest', true],
	'/favicon.ico' : ['favicon.ico', 'image/png', true],
	//'/style' : ['style.css', 'text/css', true],
	//'/noteslib' : ['noteslib.js', 'text/javascript', true],
	//'/adminscript' : ['admin.js', 'text/javascript', true],
	'/admin' : ['admin.html', 'application/xhtml+xml'],
	//'/todoscript' : ['todo.js', 'text/javascript', true],
	'/todo/' : ['todo.html', 'application/xhtml+xml'],
	'/todo-icon' : ['todo-icon.png', 'image/png', true],
	'/reeniebeanie.woff': ['ReenieBeanie.woff', 'font/woff', true],
	'/reeniebeanie.ttf': ['ReenieBeanie.ttf', 'font/ttf', true],
};
var redirects = {
	'/note': '/note/',
	'/': '/todo/',
	'/admin/': '/admin',
	'/todo': '/todo/',
}
var http = require('http');
http.createServer(function _handleRequest(req, res) {
	var cookies = {};
	var agentid = null;
	if (req.headers.cookie) {
		cookies = querystring.parse(req.headers.cookie, '; ');
	}
	var url_parts = url.parse(req.url, true);
	var path = url_parts.pathname;
	var params = url_parts.query;

	if (path === "/_info") {
		const output = {
			system: 'lucos_notes',
			checks: {
				datafile: {
					techDetail: `Reads ${stateFile} from file system`,
				}
			},
			metrics: {},
		};
		getState(function (err, parsedData) {
			if (err) {
				output.checks.datafile.ok = false;
				output.checks.datafile.debug = err.message || err;
			} else {
				output.checks.datafile.ok = true;
			}
			res.writeHead(200, {'Content-Type': 'application/json' });
			res.write(JSON.stringify(output));
			res.end();
		});
		return;
	}

	if (path == "/resources") {
		resources.load(res, params.v);
		return;
	} else if (path == "/preload"){
		
		fs.readFile("../core/preload.xhtml", function(err, data) {
			if (err) res.sendError(500, 'File preload.xhtml can\'t be read from disk');
			else {
				res.writeHead(200, {'Content-Type': 'application/xhtml+xml' });
				res.write(data.toString().replace("$manifest$", "/notes.manifest"));
				res.end();
			}
		});
		return;
	} 
	if (path in staticfiles && staticfiles[path][2]) {
		// Bypass authentication for public files
		
	} else if (true){
		// Bypass auth for now
	} else {
		var token = params.token || cookies.auth_token;
		if (token && agents[token]) {
			agentid = agents[token].id;
		}
		if (!agentid) {
			if (!params.token) return redirect(res, "https://auth.l42.eu/authenticate?redirect_uri="+encodeURIComponent('https://'+req.headers.host+req.url));
			var paramstring = querystring.stringify({
				token: token
			});
				
			var authreq = http.request({
				host: 'auth.l42.eu',
				port: 80,
				path: '/data?'+paramstring,
				method: 'GET'
			}, function (authres) {
				var data = "";
				if (authres.statusCode == 200) {
					authres.on('data', function (chunk) {
						data += chunk;
					});
					authres.on('end', function () {
						data = JSON.parse(data);
						agents[token] = data;
						var setcookie = querystring.stringify({
							auth_token: token
						});
						sendError(res, 307, "Authenticate done", {'Location': path, 'Set-Cookie': setcookie});
					});
				} else {
					sendError(res, 404, "Token not found");
				}
			});
			authreq.end();
			return;
		}
		
		// Only let me use it for now
		if (agentid != 2) return sendError(res, 403, "Access denied");
	}
	if (path.substring(0, 6) == "/note/") {
		var notename = decodeURI(path.substring(5));
		if (notename == '/') {
			switch (req.method) {
				case "GET":
					res.writeHead(200, {'Content-Type': "application/json"});
					res.write(JSON.stringify(notes));
					res.end();
					break;
				case "HEAD":
					res.writeHead(200, {'Content-Type': "application/json"});
					res.end();
					break;
				default:
					sendError(res, 405, "Only Allowed GET and HEAD for listing notes", {"Allow": "GET, HEAD"});
			}
		} else {
			if (req.method != 'PUT' && !(notename in notes)) return sendError(res, 404, "Note not found");
			switch (req.method) {
				case "POST":
					req.content = "";
					req.addListener("data", function(chunk) {
						req.content += chunk;
					});
					req.addListener("end", function() {
						notes[notename] = JSON.parse(req.content);
						saveState();
					});
					res.writeHead(204);
					res.end();
					break;
				case "GET":
					res.writeHead(200, {'Content-Type': "application/json"});
					res.write(JSON.stringify(notes[notename]));
					res.end();
					break;
				case "HEAD":
					res.writeHead(200, {'Content-Type': "application/json"});
					res.end();
					break;
				case "PUT":
					if (notename in notes) return sendError(res, 409, "Note already exists");
					req.content = "";
					req.addListener("data", function(chunk) {
						req.content += chunk;
					});
					req.addListener("end", function() {
						notes[notename] = JSON.parse(req.content);
						saveState();
					});
					res.writeHead(201);
					res.end();
					break;
				case "DELETE":
					delete notes[notename];
					saveState();
					res.writeHead(204);
					res.end();
					break;
				default:
					sendError(res, 405, "Unknown method \""+req.method+"\"", {"Allow": "POST, GET, HEAD, PUT, DELETE"});
			}
		}
	} else {
		if (path.substring(0, 6) == "/todo/") path = "/todo/";
		if (path in staticfiles) {
			var filename = staticfiles[path][0];
			var mimetype = staticfiles[path][1];
			fs.readFile(filename, function(err, data) {
				if (err) sendError(res, 500, 'File "'+filename+'" can\'t be read from disk');
				else {
					res.writeHead(200, {'Content-Type': mimetype});
					res.write(data);
					res.end();
				}
			});
		} else if (path in redirects) redirect(res, redirects[path]);
		else sendError(res, 404, 'File Not Found');
		
	}
}).listen(8004);
console.log('Server running at http://127.0.0.1:8004/');

function sendError(res, code, message, headers) {
	if (!headers) headers = {};
	if (!('Content-Type' in headers)) headers['Content-Type'] = 'text/html';
	res.writeHead(code, headers);
	res.write('<br/><strong>Error:</strong> '+message);
	res.end();
}
function redirect(res, path) {
	sendError(res, 302, "File has moved", {'Location': path});
}
