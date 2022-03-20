import State from '../../state.js';
const state = new State();

async function fetchData() {
	const resp = await fetch('/todo.json')
	const data = resp.json();
	state.setRawData(data);
}

fetchData();