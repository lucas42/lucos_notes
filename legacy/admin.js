var lucos = require("_lucos");
if (location.path == "/admin") {
	lucos.waitFor('notesSynced', updateView, true);
	lucos.waitFor('ready', updateView, true);

	function promptNote(path) {	
		var name;
		if (path) name = path+'/'+prompt("Name ("+path+")");
		else name = prompt("Name");
		if (name) {
			var body = JSON.parse(prompt("Body"));
			addNote(name, body);
		}
	}
	function newPrompt() {
		var path = prompt("Path");
		if (!path || path == '') return;
		if (window.Notes.isset(path)) {
			alert("Note Exists");
		} else {
			var body = promptBody(path);
			window.Notes.add(path, body);
		}
		showSection(path);
	}
		
	function updateView() {
		window.Notes.setNamespace('.admin');
		if (!document.getElementById('notes')) return;
		var notes = window.Notes.getAll(null, window.Notes.get('showHidden'));
		var notesNode = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
		noteloop:
		for (var name in notes) {
			var note = notes[name];
			if (name.charAt(0) == '/') name = name.substring(1);
			var hierarchy = name.split('/');
			var parent = notesNode;
			var fullpath = "";
			for (var ii in hierarchy) {
				var section = hierarchy[ii];
				fullpath += "/"+section;
				var sectionNode = null;
				var followingNode = null;
				for (ii in parent.childNodes) {
					if (parent.childNodes[ii].nodeType != 1) continue;
					if (parent.childNodes[ii].getAttribute("data-section") == section) sectionNode = parent.childNodes[ii];
					if (parent.childNodes[ii].getAttribute("data-section") > section) {
						followingNode = parent.childNodes[ii];
						break;
					}
				}
				if (!sectionNode) {
					sectionNode = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
					sectionNode.setAttribute("data-section", section);
					sectionNode.setAttribute("data-fullpath", fullpath);
					var icon;
					var nodeClass = 'section';
					if (fullpath in window.Notes.get('open', {})) {
						nodeClass += " open";
						icon = '▼';
					} else {
						icon = '▶';
					}
					if (section.charAt(0) == '.') nodeClass += " hidden";
					sectionNode.setAttribute("class", nodeClass);
					var sectionTitle = document.createElementNS("http://www.w3.org/1999/xhtml", "h3");
					sectionTitle.appendChild(document.createTextNode(icon+" "+section));
					sectionTitle.addEventListener('click', toggleSection, false);
					sectionNode.appendChild(sectionTitle);
					
					var newNoteNode = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
					newNoteNode.appendChild(document.createTextNode('✚'));
					newNoteNode.setAttribute("class", "action newnote");
					newNoteNode.setAttribute("data-path", fullpath);
					newNoteNode.addEventListener('click', function (event) {
						event.stopPropagation();
						window.Notes.setNamespace(this.getAttribute("data-path").substring(1));
						newPrompt();
					}, true);
					sectionTitle.appendChild(newNoteNode);
			
					if (followingNode) parent.insertBefore(sectionNode, followingNode);
					else parent.appendChild(sectionNode);
				}
				parent = sectionNode;
			}
			var noteText = document.createElementNS("http://www.w3.org/1999/xhtml", "p");
			noteText.appendChild(document.createTextNode(JSON.stringify(note)));
			var deleteNode = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
			deleteNode.appendChild(document.createTextNode('✘'));
			deleteNode.setAttribute("class", "action delete");
			deleteNode.setAttribute("data-path", fullpath);
			deleteNode.addEventListener('click', function () {
				window.Notes.remove(this.getAttribute("data-path"));
				updateView();
			}, true);
			noteText.appendChild(deleteNode);
			var editNoteNode = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
			editNoteNode.appendChild(document.createTextNode('✎'));
			editNoteNode.setAttribute("class", "action edit");
			editNoteNode.setAttribute("data-path", fullpath);
			editNoteNode.setAttribute("data-body", JSON.stringify(note));
			editNoteNode.addEventListener('click', function () {
				var body = promptBody(this.getAttribute("data-path"), this.getAttribute("data-body"));
				if (body) window.Notes.update(this.getAttribute("data-path"), body);
				updateView();
			}, true);
			noteText.appendChild(editNoteNode);
			if (parent.childNodes.length > 1) parent.insertBefore(noteText, parent.childNodes[1]);
			else parent.appendChild(noteText);
		}
		document.getElementById('notes').parentNode.replaceChild(notesNode, document.getElementById('notes'));
		notesNode.id = 'notes';
		return notesNode;
	}
	function promptBody(path, existingJSON) {
		var body = prompt(path, existingJSON);
		try {
			return JSON.parse(body);
		} catch (e) {
			return body;
		}
	}

	function toggleSection() {
		window.Notes.setNamespace('.admin');
		var sectionNode = this.parentNode;
		var path = sectionNode.getAttribute('data-fullpath');
		var openSections = window.Notes.get('open', {});
		if (path in openSections) delete openSections[path];
		else openSections[path] = true;
		window.Notes.set('open', openSections);
		updateView();
	}

	function toggleHidden() {
		window.Notes.set('showHidden', !window.Notes.get('showHidden'));
		updateView();
	}

	function showSection(path) {
		path = window.Notes.getFullPath(path);
		window.Notes.setNamespace('.admin');
		var openSections = window.Notes.get('open', {});
		var hierarchy = path.substring(1).split('/');
		var path = "";
		for (var ii in hierarchy) {
			var section = hierarchy[ii];
			path += "/"+section;
			openSections[path] = true;
		}
		window.Notes.set('open', openSections);
		updateView();
	}
}
