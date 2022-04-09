export default async function fetchData(state) {
	const resp = await fetch('/todo.json')
	const data = resp.json();
	state.setRawData(data);
}