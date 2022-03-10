const fs = require('fs');

let STATE_FILE;
let notes = {};

// STATE_DIR should be the path of a directory which persists between restarts
if ('STATE_DIR' in process.env) {
	try {
		STATE_FILE = `${process.env.STATE_DIR}/data.json`
		notes = require(STATE_FILE);
		console.log(STATE_FILE, notes);
	} catch (err) {
		console.log(`Can't find or parse data.json; using empty notes object.`, err);
	}
}

console.log('notes', notes);

function saveState() {
	fs.unlink(STATE_FILE, function(unlinkErr) {
		fs.writeFile(STATE_FILE, JSON.stringify(notes), function(writeErr) {
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

module.exports = {
	getInfoCheck,
}