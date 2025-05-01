export default class State {
	#data;
	constructor(syncFunction) {
		this.waitUntilDataLoaded = new Promise((resolve, reject) => {
			this.dataLoaded = resolve;
		});
		this.syncFunction = async () => {
			if (!syncFunction) return;
			try {
				await syncFunction();
				Object.values(this.#data.lists).forEach(list => { delete list.unsynced; });
				Object.values(this.#data.items).forEach(item => { delete item.unsynced; });
			} catch(error) {
				// If the sync failed, don't update unsynced properties on lists or items
			}
		}
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

	#hasUnsyncedData() {
		return Object.values(this.#data.lists).some(list => list.unsynced) || Object.values(this.#data.items).some(item => item.unsynced);
	}
	getListTypes(currentType = null) {
		let listtypes = [];
		const listTypeSlugs = new Set(['todo', 'plans', 'ideas', 'phrasebooks']);
		for (const slug of listTypeSlugs) {
			const listtype = {
				slug,
				name: slug,
			}
			if (slug === currentType) listtype.current = true;
			listtypes.push(listtype);
		}
		return listtypes;
	}
	async getListsByType(listType) {
		await this.waitUntilDataLoaded;
		let lists = [];
		for (const slug in this.#data.lists) {
			if (listType != (this.#data.lists[slug].type || 'todo')) continue;
			lists.push({
				slug,
				name: this.#data.lists[slug].name || slug,
				type: this.#data.lists[slug].type || 'todo',
				icon: this.#data.lists[slug].icon || '📋',
				unsynced: this.#data.lists[slug].unsynced,
				deleted: this.#data.lists[slug].deleted,
				complete: this.#data.lists[slug].items.length === 0,
			});
		}
		return {
			lists,
			hasUnsyncedData: this.#hasUnsyncedData(),
			pagetype: 'listoflists',
			name: listType[0].toUpperCase() + listType.slice(1) + ' Lists',
			listTypes: this.getListTypes(listType),
			listType,
		};
	}
	#getPageTypeByListType(listType) {
		if (listType == 'phrasebooks') return 'phrasebook';
		return 'list';
	}
	async getList(slug) {
		await this.waitUntilDataLoaded;
		if (!(slug in this.#data.lists)) throw new NotFoundError(`Can't find list '${slug}'`);
		return {
			slug,
			name: this.#data.lists[slug].name || slug,
			type: this.#data.lists[slug].type || 'todo',
			items: this.#data.lists[slug].items.map(uuid => {
				const item = this.#data.items[uuid];
				return {uuid, name: item.name, url: item.url, translation: item.translation, unsynced: item.unsynced, deleted: item.deleted};
			}),
			unsynced: this.#data.lists[slug].unsynced,
			hasUnsyncedData: this.#hasUnsyncedData(),
			deleted: this.#data.lists[slug].deleted,
			icon: this.#data.lists[slug].icon || '📋',
			pagetype: this.#getPageTypeByListType(this.#data.lists[slug].type),
		}
	}
	async setList(slug, data, alreadySynced) {
		await this.waitUntilDataLoaded;
		this.#setListData(slug, data, alreadySynced);
		await this.syncFunction();
	}
	#setListData(slug, data={}, alreadySynced) {
		data.items = this.#data.lists[slug]?.items || [];
		if (!alreadySynced) data.unsynced = true;

		// Use a segmenter to ensure only the first grapheme is displayed as an icon
		const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
		if (data.icon) data.icon = [...segmenter.segment(data.icon)][0].segment;
		this.#data.lists[slug] = data;
	}
	#removeItemFromList(itemuuid, listslug) {
		if (listslug in this.#data.lists) {
			this.#data.lists[listslug].items = this.#data.lists[listslug].items.filter(uuid => (uuid !== itemuuid));
		}
	}
	async setItem(uuid, data, alreadySynced) {
		await this.waitUntilDataLoaded;
		if (!('list' in data) || !data.list) throw new ValidationError("Item is missing a list");
		if (typeof data.list !== 'string') throw new ValidationError("Item's list slug is not a string");
		const previousList = this.#data.items[uuid]?.list;
		if (!alreadySynced) data.unsynced = true;
		this.#data.items[uuid] = data;
		if (!(data.list in this.#data.lists)) {
			await this.#setListData(data.list, {}, alreadySynced);
		}
		if (data.list !== previousList) {
			this.#removeItemFromList(uuid, previousList);
		}
		if (!this.#data.lists[data.list].items.includes(uuid)) {
			this.#data.lists[data.list].items.push(uuid);
		}
		await this.syncFunction();
	}

	async deleteItem(uuid, hardDelete) {
		await this.waitUntilDataLoaded;
		const existingData = this.#data.items[uuid];
		if (!existingData) return;

		// Hard deletes remove the item from its list and also the item's data
		if (hardDelete) {
			this.#removeItemFromList(uuid, existingData.list);
			delete this.#data.items[uuid];

		// Soft deletes just mark the item as deleted, but preserve its existance until a hard delete
		} else {
			this.#data.items[uuid].deleted = true;
		}
		await this.syncFunction();
	}

	async deleteList(slug, hardDelete) {
		await this.waitUntilDataLoaded;
		const existingData = this.#data.lists[slug];
		if (!existingData) return;
		if (hardDelete) {
			delete this.#data.lists[slug];

			// Tidy up any items from this list too
			existingData.items.forEach(uuid => {
				delete this.#data.items[uuid];
			});
		} else {
			this.#data.lists[slug].deleted = true;
		}
		await this.syncFunction();
	}
}

export class ValidationError extends Error { }
export class NotFoundError extends Error { }