import { readFile, writeFile, unlink } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import State from '../classes/state.js';

// STATE_DIR should be the path of a directory which persists between restarts
if (!('STATE_DIR' in process.env)) throw new Error('Environment varible STATE_DIR not set');
const STATE_FILE = `${process.env.STATE_DIR}/data_v2.json`;
const state = new State(writeToFS);

async function init() {
	const rawData = await readFromFS();
	state.setRawData(rawData);
}

init();

async function readFromFS() {
	try {
		return JSON.parse(await readFile(STATE_FILE));
	} catch (err) {
		console.log(`Can't find or parse data_v2.json;`, err);
	}
}

async function writeToFS() {
	try {
		await writeFile(STATE_FILE, JSON.stringify(await state.getRawData()));
	} catch (error) {
		console.error("Error saving state:", error);
		throw error;
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

export default state;
