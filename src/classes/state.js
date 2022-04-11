export default class State {
	#data;
	constructor(syncFunction = () => {}) {
		const state = this;
		state.waitUntilDataLoaded = new Promise((resolve, reject) => {
			state.dataLoaded = resolve;
		});
		state.syncFunction = syncFunction;
	}
	setRawData(rawData) {
		if (!('lists' in rawData)) throw new ValidationError("No 'lists' field in raw data");
		if (typeof rawData.lists !== 'object') throw new ValidationError("'lists' field in raw data isn't an object");
		if (Array.isArray(rawData.lists)) throw new ValidationError("'lists' field in raw data is an array");
		if (!('items' in rawData)) throw new ValidationError("No 'items' field in raw data");
		if (typeof rawData.items !== 'object') throw new ValidationError("'items' field in raw data isn't an object");
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
				name: this.#data.lists[slug].name || slug,
			});
		}
		return {lists};
	}
	async getList(slug) {
		await this.waitUntilDataLoaded;
		if (!(slug in this.#data.lists)) throw new NotFoundError(`Can't find list '${slug}'`);
		return {
			slug,
			name: this.#data.lists[slug].name || slug,
			items: this.#data.lists[slug].items.map(uuid => {
				const item = this.#data.items[uuid];
				return {uuid, name: item.name, url: item.url};
			}),
		}
	}
	async setList(slug, data) {
		await this.waitUntilDataLoaded;
		data.items = this.#data.lists[slug]?.items || [];
		this.#data.lists[slug] = data;
		await this.syncFunction();
	}
	async setItem(uuid, data) {
		if (!('list' in data) || !data.list) throw new ValidationError("Item is missing a list");
		if (typeof data.list !== 'string') throw new ValidationError("Item's list slug is not a string");
		const previousList = this.#data.items[uuid]?.list;
		this.#data.items[uuid] = data;
		if (!(data.list in this.#data.lists)) {
			this.#data.lists[data.list] = {name: data.list, items: []};
		}
		if (data.list !== previousList) {
			if (previousList in this.#data.lists) {
				this.#data.lists[previousList].items = this.#data.lists[previousList].items.filter(itemuuid => (itemuuid !== uuid));
			}
		}
		if (!this.#data.lists[data.list].items.includes(uuid)) {
			this.#data.lists[data.list].items.push(uuid);
		}
		await this.syncFunction();
	}
}

export class ValidationError extends Error { }
export class NotFoundError extends Error { }