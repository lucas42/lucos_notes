export default class State {
	#data;
	constructor(rawData) {
		this.#data = rawData;
	}
	setRawData(rawData) {
		this.#data = rawData;
	}

	getRawData() {
		return this.#data;
	}

	getLists() {
		let lists = [];
		for (const slug in this.#data.lists) {
			lists.push({
				slug,
				name: this.#data.lists[slug].name,
			});
		}
		return {lists};
	}
	getList(slug) {
		if (!(slug in this.#data.lists)) throw new Error(`Can't find list '${slug}'`);
		return {
			name: this.#data.lists[slug].name,
			items: this.#data.lists[slug].items.map(uuid => this.#data.items[uuid]),
		}
	}
}