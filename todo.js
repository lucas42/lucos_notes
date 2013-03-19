//lucos.addMenuItem('Sync', window.Notes.forceSync);
window.Notes.setNamespace('todo');
lucos.waitFor('ready', function () {
	lucos.nav.enable('/todo/', updateView);
	if (lucos.nav.isPreload()) return;
	lucos.nav.refresh();
	lucos.waitFor('notesSynced', lucos.nav.refresh, true);
	if (document.getElementById('newtodolist')) {
		document.getElementById('newtodolist').addEventListener("click", newTodoList, false);
	}
});
var list;
function updateView(path) {
	if (lucos.nav.isPreload()) return;
	if (path == "/todo/") {
		if (document.getElementById('breadcrumb')) document.getElementById('breadcrumb').setAttribute('style', 'display: none;');
		if (document.getElementById('newtodolist')) {
			document.getElementById('newtodolist').removeAttribute('style');
		}
		lucos.addNavBar("Todo List");
		list = null;
		var todolists = List.getAll();
		var existingNode = document.getElementById('todo');
		var listsNode = document.createElementNS("http://www.w3.org/1999/xhtml", "ul");
		for (var ii in todolists) {
			var todolist = todolists[ii];
			var listNode = document.createElementNS("http://www.w3.org/1999/xhtml", "li");
				var linkNode = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
				linkNode.setAttribute("href", todolist.path);
				linkNode.appendChild(document.createTextNode(todolist.getTitle()));
			listNode.appendChild(linkNode);
			listNode.setAttribute("data-path", todolist.path);
			listNode.className = "list"
					
			if (todolist.canDelete()) {
				var deleteNode = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
				deleteNode.appendChild(document.createTextNode('✘'));
				deleteNode.setAttribute("class", "action delete");
				deleteNode.setAttribute("data-path", todolist.path);
				deleteNode.addEventListener('click', function () {
					var itemText = this.parentNode.firstChild;
					if (itemText.getAttribute("class") == 'deleted') return false;
					itemText.setAttribute("class", 'deleted');
					
					var todolist = new List(this.getAttribute("data-path"));
					todolist.deleteSelf();
					setTimeout(lucos.nav.refresh, 2000);
				}, true);
				listNode.appendChild(deleteNode);
			}
				var editNode = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
				editNode.appendChild(document.createTextNode('※'));// used to be ✎
				editNode.setAttribute("class", "action edit");
				editNode.setAttribute("data-path", todolist.path);
				editNode.addEventListener('click', editListName, true);
				listNode.appendChild(editNode);
			listsNode.appendChild(listNode);
		}
		
		// Add a spare node to the end so new lists can be added
		var listNode = document.createElementNS("http://www.w3.org/1999/xhtml", "li");
		listNode.appendChild(document.createElementNS("http://www.w3.org/1999/xhtml", "span"));
		listNode.className = "list spare";
		listsNode.appendChild(listNode);
		
		existingNode.parentNode.replaceChild(listsNode, existingNode);
		listsNode.id = 'todo';
	} else if (List.isList(path)) {
		if (document.getElementById('breadcrumb')) document.getElementById('breadcrumb').removeAttribute('style');
		if (document.getElementById('newtodolist')) {
			document.getElementById('newtodolist').setAttribute('style', 'display: none;');
		}
		list = new List(path);
		lucos.addNavBar(list.getTitle());
		
		
		var todoitems = list.getAll();
		
		// Add a spare item so new things can be added
		todoitems['/'] = '';
		var existingNode = document.getElementById('todo');
		var itemsNode = document.createElementNS("http://www.w3.org/1999/xhtml", "ul");
		for (var ii in todoitems) {
			var todoitem = todoitems[ii];
			var itemid = ii.replace('/', '');
			var itemNode = document.createElementNS("http://www.w3.org/1999/xhtml", "li");
				var itemText = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
					itemText.appendChild(document.createTextNode(todoitem));
				itemNode.appendChild(itemText);
				itemNode.setAttribute("draggable", true);
				itemNode.setAttribute("data-text", todoitem);
				itemNode.setAttribute("data-itemid", itemid);
				itemNode.addEventListener('dragstart', itemDragStart, true);
				addDoubleClick(itemNode, editItem);
				
				if (itemid) {
					var doneNode = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
					doneNode.appendChild(document.createTextNode('✓'));
					doneNode.setAttribute("class", "action done");
					doneNode.setAttribute("data-itemid", itemid);
					doneNode.addEventListener('click', function () {
						var itemText = this.parentNode.firstChild;
						if (itemText.getAttribute("class") == 'deleted') return false;
						itemText.setAttribute("class", 'deleted');
						list.remove(this.getAttribute("data-itemid"));
						setTimeout(lucos.nav.refresh, 2000);
					}, true);
					itemNode.appendChild(doneNode);
				} else {
					itemNode.className += " spare";
				}
			itemsNode.appendChild(itemNode);
		}
		itemsNode.addEventListener('dragover', onDragOver, true);
		itemsNode.addEventListener('drop', onDrop, true);
		existingNode.parentNode.replaceChild(itemsNode, existingNode);
		itemsNode.id = 'todo';
	} else {
		lucos.nav.send('');
	}
}

function newTodoList() {
	editListName.call(document.getElementById('todo').lastChild.firstChild);
	return false;
}

function addDoubleClick(node, callback) {
	var touchtimer = null;
	node.addEventListener('dblclick', callback, true);
	
	// Touchscreens don't support double click, so emulate using touch events
	node.addEventListener('touchstart', function (event) {
		if (touchtimer) {
			callback.call(node);
		} else {
			touchtimer = window.setTimeout(function () {
				touchtimer = null;
			}, 1000);
		}
	}, true);
	
}

/**
 * Replaces a node's first element with a text box containing the given text
 */
function makeEditable(node, text, callback) {
	var form = document.createElementNS("http://www.w3.org/1999/xhtml", "form");
	var submitted = false;
	form.setAttribute("class", "inlineform");
		var editField = document.createElementNS("http://www.w3.org/1999/xhtml", "input");
		editField.setAttribute("type", "text");
		editField.value = text;
	form.appendChild(editField);
	var submit = function _submitted(event) {
		event.preventDefault();
		
		// Make sure the field doesn't get submitted twice (by submitting and bluring at the same time)
		if (submitted) return;
		submitted = true;
		callback(editField.value);
	};
	form.addEventListener('submit', submit, true);
	editField.addEventListener('blur', submit, true);
	node.replaceChild(form, node.firstChild);
	if (node.lastChild != node.firstChild) node.removeChild(node.lastChild);
	editField.focus();
	
}
function editItem() {
	var itemid = this.getAttribute("data-itemid");
	var text = this.getAttribute("data-text");
	var edited = function _itemEdited(value) {
		if (!list) throw "list not defined";
		if (itemid) list.update(itemid, value);
		else if (value) list.add(value);
		lucos.nav.refresh();
	};
	makeEditable(this, text, edited);
}
function editListName() {
	var path = this.getAttribute("data-path");
	if (!path) path = prompt("New List - slug:");
	if (!path) return;
	var todolist = new List(path);
	var text = todolist.getTitle();
	var edited = function _itemEdited(newtitle) {
		if (newtitle) todolist.setTitle(newtitle);
		lucos.nav.refresh();
	};
	makeEditable(this.parentNode, text, edited);
}
function itemDragStart(event) {
	var text = this.getAttribute("data-text");
	if (!text) return;
	event.dataTransfer.setData('text/plain', text);
}

function onDragOver(event) {
	if (!event.dataTransfer.types) return;
	if (event.dataTransfer.types.indexOf("text/plain") > -1) event.preventDefault();
}
function onDrop(event) {
	var text = event.dataTransfer.getData("text/plain");
	if (!text) return;
	if (!list) throw "list not defined";
	list.replace(text);
	lucos.nav.refresh();
}
