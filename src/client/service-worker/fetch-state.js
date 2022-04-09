export default async function fetchData(state) {
	const resp = await fetch('/todo.json')
	const data = await resp.json();
	state.setRawData(data);
}