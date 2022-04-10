import { readFile, writeFile, unlink } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import State from '../classes/state.js';

// STATE_DIR should be the path of a directory which persists between restarts
if (!('STATE_DIR' in process.env)) throw new Error('Environment varible STATE_DIR not set');
const STATE_FILE = `${process.env.STATE_DIR}/data_v2.json`;
const state = new State();

async function init() {
	const rawData = await readFromFS();
	state.setRawData(rawData);
}

init();

async function readFromFS() {
	try {
		return JSON.parse(await readFile(STATE_FILE));
	} catch (err) {
		console.log(`Can't find or parse data_v2.json; Trying to convert v1 data`, err);
		return v2Migration(process.env.STATE_DIR);
	}
}

async function writeToFS() {
	try {
		await unlink(STATE_FILE);
		await writeFile(STATE_FILE, JSON.stringify(await state.getRawData()));
	} catch (error) {
		console.error("Error saving state:", error);
	}
}

export async function getInfoCheck() {
	try {
		await readFromFS();
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
async function v2Migration (STATE_DIR) {
	try {
		const V1_STATE_FILE = `${STATE_DIR}/data.json`;
		const v1Data = JSON.parse(await readFile(V1_STATE_FILE));
		const data = {
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
		return data;
	} catch (err) {
		console.log(`Failed to transform v1 state file`, err);
	}
}

export default state;
