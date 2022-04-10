export default class State {
	#data;
	constructor() {
		const state = this;
		state.waitUntilDataLoaded = new Promise((resolve, reject) => {
			state.dataLoaded = resolve;
		});
	}
	setRawData(rawData) {
		if (!('lists' in rawData)) throw new Error("No 'lists' field in raw data");
		if (typeof rawData.lists !== 'object') throw new TypeError("'lists' field in raw data isn't an object");
		if (Array.isArray(rawData.lists)) throw new TypeError("'lists' field in raw data is an array");
		if (!('items' in rawData)) throw new Error("No 'items' field in raw data");
		if (typeof rawData.items !== 'object') throw new TypeError("'items' field in raw data isn't an object");
		this.#data = rawData;
		this.dataLoaded(true);
	}

	async getRawData() {
		await this.waitUntilDataLoaded;
		return this.#data;
	}

	async getLists() {
		await this.waitUntilDataLoaded;
		let lists = [];
		for (const slug in this.#data.lists) {
			lists.push({
				slug,
				name: this.#data.lists[slug].name,
			});
		}
		return {lists};
	}
	async getList(slug) {
		await this.waitUntilDataLoaded;
		if (!(slug in this.#data.lists)) throw new Error(`Can't find list '${slug}'`);
		return {
			name: this.#data.lists[slug].name,
			items: this.#data.lists[slug].items.map(uuid => {
				const item = this.#data.items[uuid];
				return {name: item.name};
			}),
		}
	}
}