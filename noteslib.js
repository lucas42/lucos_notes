var Notes = function (){

	var notes;
	var queue = localStorage.getItem("queue");
	if (queue) queue = JSON.parse(localStorage.getItem("queue"));
	else queue = [];
	var namespace = 'default';

	window.addEventListener('online', syncData, true);
	autoSync();
	
	function setNamespace(newnamespace) {
		namespace = newnamespace;
	}

	function add(path, body) {
		if (isset(path)) throw ('Note exists');
		path = fullPath(path);
		notes[path] = body;
		localStorage.setItem("notes", JSON.stringify(notes));
		request('PUT', '/note'+encodeURI(path), body);
	}
	function update(path, body) {
		if (!isset(path)) throw ('Note not Found');
		path = fullPath(path);
		notes[path] = body;
		localStorage.setItem("notes", JSON.stringify(notes));
		request('POST', '/note'+encodeURI(path), body);
	}
	function remove(path) {
		if (!isset(path)) throw ('Note not Found');
		path = fullPath(path);
		delete notes[path];
		localStorage.setItem("notes", JSON.stringify(notes));
		request('DELETE', '/note'+encodeURI(path));
	}

	function get(path, defaultVal) {
		path = fullPath(path);
		if (typeof notes[path]  == "undefined") return defaultVal;
		return notes[path];
	}
	
	function getAll(path, hidden, filter, modify) {
		if (!path && hidden) return notes;
		if (path) path = fullPath(path);
		if (typeof(modify) != 'function') modify = function (path, body) { return body; };
		var res = {};
		for (var name in notes) {
			if (!hidden && name.indexOf("/.") > -1) continue;
			if (filter && !filter(name)) continue;
			if (!path) res[name] = modify(name, notes[name]);
			else if (name.indexOf(path+'/') == 0) res[name.substring(path.length)] = modify(name, notes[name]);
		}
		return res;
	}
	
	function set(path, body) {
		path = fullPath(path);
		if (isset(path)) update(path, body);
		else add(path, body);
	}
	function isset(path) {
		path = fullPath(path);
		return (path in notes);
	}
	function request(method, path, body) {
		if (lucos.detect.isOnline()) {
			var xmlHttp = new XMLHttpRequest();
			xmlHttp.open(method, path+'?_cb'+ new Date().getTime(), false);
			if (xmlHttp.setRequestHeader) xmlHttp.setRequestHeader('Content-Type', "application/json");
			xmlHttp.send(JSON.stringify(body));
		} else {
			queue.push([method, path, body]);
			localStorage.setItem("queue", JSON.stringify(queue));
		}
	}
	
	function fullPath(path) {
		if (path.charAt(0) != '/') path = '/'+namespace+'/'+path;
		return path;
	}

	function syncData() {
		
		if (!notes) {
			notes = (localStorage.getItem("notes")) ? JSON.parse(localStorage.getItem("notes")) : {};
			lucos.send('notesSynced');
		}
		
		
		if (!lucos.detect.isOnline()) return;
		try {
			var existingqueue = localStorage.getItem("queue");
			if (existingqueue) existingqueue = JSON.parse(existingqueue);
			queue = [];
			localStorage.setItem("queue", JSON.stringify(queue));
			for (var ii in existingqueue) {
				request(existingqueue[ii][0], existingqueue[ii][1], existingqueue[ii][2]);
			}
			lucos.net.get('/note/', { "_cb": new Date().getTime() }, function _gotNotes(req) {
				notes = JSON.parse(req.responseText);
				localStorage.setItem("notes", req.responseText);
				lucos.send('notesSynced');
			});
			/*var req = new XMLHttpRequest();
			req.open('GET', '/note/?_cb'+ new Date().getTime(), false);
			req.send(null);
			notes = JSON.parse(req.responseText);
			localStorage.setItem("notes", req.responseText);*/
		} catch (e) {
			if (console) console.log(e);
		}
	}

	function autoSync() {
		syncData();
		setTimeout(autoSync, 5*60*1000);
	}
	
	return {
		setNamespace: setNamespace,
		add: add,
		update: update,
		remove: remove,
		get: get,
		getAll: getAll,
		set: set,
		isset: isset,
		forceSync: syncData,
		getFullPath: fullPath,
	}
}();

function List (path, title) {
	this.path = Notes.getFullPath(path);
	if (!title && !Notes.isset(this.path)) Notes.set(this.path, path);
	else if(title) Notes.set(this.path, title);
	if (!List.isList(this.path)) Notes.set(path+'/.increment', 0);
	this.add = function(body) {
		var inc = Notes.get(this.path+'/.increment', 0);
		
		// Shouldn't be set, but try the next number if it is.
		if (Notes.isset(this.path+'/'+inc)) {
			if (console) console.log("Increment counter in wrong position", inc);
			Notes.set(this.path+'/.increment', inc+1);
			return this.add(body);
		}
		Notes.add(this.path+'/'+inc, body);
		Notes.set(this.path+'/.increment', inc+1);
		return inc;
	}
	this.update = function (id, body) {
		try {
			return Notes.update(this.path+'/'+id, body);
		} catch (e) {
			throw "List not found";
		}
	}
	this.remove = function (id) {
		if (typeof id == 'string') id = id.replace('/', '');
		return Notes.remove(this.path+'/'+id);
	}
	this.get = function (id) {
		return Notes.get(this.path+'/'+id);
	}
	this.getAll = function () {
		return Notes.getAll(this.path);
	}
	this.getTitle = function () {
		return Notes.get(this.path);
	}
	this.setTitle = function (title) {
		return Notes.update(this.path, title);
	}
	this.canDelete = function () {
		for (ii in this.getAll()) return false;
		return true;
	}
	this.deleteSelf = function () {
		if (!this.canDelete) throw "Can't delete non-empty list";
		Notes.remove(this.path);
		Notes.remove(this.path+'/.increment');
	}
}

/**
 * Removes all existing occurences of the item and adds it to the end
 */
List.prototype.replace = function (newItem) {
	var ii, items = this.getAll();
	for (ii in items) {
		if (items[ii] == newItem) this.remove(ii);
	}
	this.add(newItem);
}
List.isList = function _islist(path) {
	return Notes.get(path+'/.increment', false) !== false;
}
List.getAll = function _getlists() {
	return Notes.getAll("", false, List.isList, function (path) {return new List(path); });
}

window.Notes = Notes;
window.List = List;
