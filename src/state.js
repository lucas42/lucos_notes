const fs = require('fs');

let STATE_FILE;
let data = {};

// STATE_DIR should be the path of a directory which persists between restarts
if ('STATE_DIR' in process.env) {
	try {
		STATE_FILE = `${process.env.STATE_DIR}/data_v2.json`
		data = require(STATE_FILE);
		console.log(STATE_FILE, data);
	} catch (err) {
		console.log(`Can't find or parse data_v2.json; Trying to convert v1 data`, err);
		v2Migration(process.env.STATE_DIR);
	}
}

function saveState() {
	fs.unlink(STATE_FILE, function(unlinkErr) {
		fs.writeFile(STATE_FILE, JSON.stringify(data), function(writeErr) {
			if (writeErr) {
				console.error("Error saving state:", writeErr.message);
			}
		});
	});
}

function getInfoCheck() {
	try {
		require(STATE_FILE);
		return {
			techDetail: `Reads ${STATE_FILE} from file system`,
			ok: true,
		}
	} catch (error) {
		return {
			techDetail: `Reads ${STATE_FILE} from file system`,
			ok: false,
			debug: error.message,
		}
	}
}

/**
 * Transforms the state file format used in v1 to the v2 format
 **/
function v2Migration (STATE_DIR) {
	const { v4: uuidv4 } = require('uuid');
	try {
		const V1_STATE_FILE = `${STATE_DIR}/data.json`;
		const v1Data = require(V1_STATE_FILE);
		data = {
			lists: {},
			items: {},
		}
		for (let path in v1Data) {
			const val = v1Data[path];
			const parts = path.split("/");
			const prefix = parts.shift();
			if (prefix) {
				console.warn(`path doesn't begin with leading slash ${path}`);
				continue;
			}
			const category = parts.shift();
			if (category === ".admin") {
				continue;
			}
			if (category !== "todo") {
				console.warn(`unrecognised entry "${path}" (val="${val}")`);
				continue;
			}
			const list = parts.shift();
			if (!(list in data.lists)) data.lists[list] = {
				unsorted_items: [],
			};
			const inc = parts.shift();
			if (!inc) {
				if (data.lists[list].name) {
					console.warn(`Clash for list id ${list}`);
					continue;
				}
				data.lists[list].name = val;
				continue;
			}
			if (inc === '.increment') {
				data.lists[list].increment = val;
				continue;
			}

			const uuid = uuidv4();
			let name = val;
			let url;
			const match = /^(?<start>.*?)[ \-]*(?<url>https?:\/\/[^ ]+)[ \-]*(?<end>.*?)$/i.exec(val);
			if (match) {
				url = match.groups.url;
				name = match.groups.start;
				if (match.groups.end) name += " " + match.groups.end;
				if (!name.trim()) name = url;
			}
			data.items[uuid] = {
				name,
				increment: inc,
				list,
			};
			if (url) data.items[uuid].url = url;
			data.lists[list].unsorted_items.push({
				uuid,
				inc
			});
		}
		for (const list in data.lists) {

			// Any list without a name at this point is redundant
			if (!('name' in data.lists[list])) {
				console.log(`Deleting list ${list}`);
				delete data.lists[list];
				continue;
			}

			data.lists[list].unsorted_items.sort((a,b) => a.inc - b.inc);
			data.lists[list].items = data.lists[list].unsorted_items.map(item => item.uuid);
			delete data.lists[list].unsorted_items;
		}
		console.log("data", data.items, data.lists);
		// saveState();
	} catch (err) {
		console.log(`Failed to transform v1 state file`, err);
	}
}

module.exports = {
	getInfoCheck,
}