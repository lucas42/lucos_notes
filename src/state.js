export default class State {
	#data;
	constructor() {
		const state = this;
		state.waitUntilDataLoaded = new Promise((resolve, reject) => {
			state.dataLoaded = resolve;
		});
	}
	setRawData(rawData) {
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
			items: this.#data.lists[slug].items.map(uuid => this.#data.items[uuid]),
		}
	}
}