import {jest} from '@jest/globals'
import {default as State, ValidationError, NotFoundError} from '../src/classes/state.js';

describe('Handle raw state data', () => {
	test('Set and read the same raw data', async () => {
		const state = new State();
		state.setRawData({lists:{groceries:{name: "Grocery Shopping"}}, items:{}});
		const output = await state.getRawData();
		expect(output).toEqual({lists:{groceries:{name: "Grocery Shopping"}}, items:{}});
	});
	test('Raw data with no lists array fails', () => {
		const state = new State();

		// Missing lists field
		expect(() => {
			state.setRawData({listicles:{groceries:{name: "Grocery Shopping"}}, items:{}});
		}).toThrow(ValidationError);

		// Lists field is array
		expect(() => {
			state.setRawData({lists:[{slug:'groceries',name: "Grocery Shopping"}], items:{}});
		}).toThrow(ValidationError);

		// Lists field is integer
		expect(() => {
			state.setRawData({lists:7, items:{}});
		}).toThrow(ValidationError);
	});
	test('Raw data with no items object fails', () => {
		const state = new State();

		// Missing lists field
		expect(() => {
			state.setRawData({itum:{}, lists:{}});
		}).toThrow(ValidationError);

		// Lists field of wrong type
		expect(() => {
			state.setRawData({items:"items go here", lists:{}});
		}).toThrow(ValidationError);
	});
});

describe('Get, set and delete state data', () => {
	function getPrepopulatedState() {
		const state = new State(() => {});
		state.setRawData({lists:{
			'groceries': {name: "Grocery Shopping", extraneousField: true, items:["abc","123"], icon:'🛒', type: 'todo'},
			'moarthings': {name: "Even More Stuff", ignoreme:"yes please", metoo: ["of course"], items:[], type: 'todo'},
			'idealess': {name: "Ideas of things which aren't in tests", type: 'ideas'},
		}, items:{
			"123": {"name":"Second Item", extraExtraneousField: true, "list":"groceries", "url": "http://example.com/2nditem", "type": "todo"},
			"abc": {"name":"First Item", ignoreThese:["this", "and this"], "list":"groceries", "type": "todo"},
			"unused": {"name":"Unused Item", "type": "todo"},
		}});
		return state;
	}

	test('Get a list of lists in a format usable for templates', async	() => {
		const state = getPrepopulatedState();
		const output = await state.getListsByType('todo');
		expect(output).toEqual({
			lists:[
				{slug:'groceries', name: "Grocery Shopping", icon: "🛒", "type": "todo", complete: false },
				{slug:'moarthings', name: "Even More Stuff", icon: "📋", "type": "todo", complete: true },
			],
			hasUnsyncedData: false,
			pagetype: 'listoflists',
			name: "Todo Lists",
			listTypes: [
				{
					"name": "todo",
					"slug": "todo",
					"current": true,
				},
				{
					"name": "plans",
					"slug": "plans",
				},
				{
					"name": "ideas",
					"slug": "ideas",
				},
			],
			listType: "todo",
		});
	});
	test('Get a list in a format usable for templates', async	() => {
		const state = getPrepopulatedState();
		expect(state.getList('missing list')).rejects.toThrow(NotFoundError);
		expect(state.getList('missing list')).rejects.toThrow("Can't find list 'missing list'");

		const output = await state.getList('groceries');
		expect(output).toEqual({
			slug: "groceries",
			name: "Grocery Shopping",
			items: [
				{"name":"First Item", "uuid": "abc"},
				{"name":"Second Item", "url": "http://example.com/2nditem", "uuid": "123"},
			],
			hasUnsyncedData: false,
			icon: "🛒",
			pagetype: 'list',
			type: 'todo',
		});
	});
	test('Update list with a new name', async () => {
		const state = getPrepopulatedState();

		await state.setList("groceries", {name:"Food Shopping"});
		const output = await state.getList('groceries');
		expect(output.name).toEqual("Food Shopping");
	});
	test('Update list with empty name', async () => {
		const state = getPrepopulatedState();

		await state.setList("groceries",  {});
		const output = await state.getList('groceries');
		expect(output.name).toEqual('groceries');

		const indexOutput = await state.getListsByType('todo');
		expect(indexOutput.lists[0].name).toEqual('groceries');
	});
	test('Update non-existant list', async () => {
		const state = getPrepopulatedState();

		await state.setList("newlist", {name:"Brand New List"});
		const output = await state.getList('newlist');
		expect(output.name).toEqual('Brand New List');
	});
	test('Update item with a new name', async () => {
		const state = getPrepopulatedState();

		await state.setItem("abc", {name:"The First Item", irrelevantField: "hi 👋", list:"groceries"});
		const output = await state.getList('groceries');
		expect(output.items[0]).toEqual({name: "The First Item", uuid: "abc"});
	});
	test('Move item to different list', async () => {
		const state = getPrepopulatedState();

		await state.setItem("abc", {name:"First Item", irrelevantField: "hi 👋", list:"moarthings"});
		const groceryOutput = await state.getList('groceries');
		const moarOutput = await state.getList('moarthings');
		expect(groceryOutput.items).not.toContainEqual({name: "First Item", uuid: "abc"});
		expect(moarOutput.items).toContainEqual({name: "First Item", uuid: "abc"});
	});
	test('Create new Item', async () => {
		const state = getPrepopulatedState();

		await state.setItem("xyz", {name:"Third Item", otherField: true, list:"groceries"});
		const output = await state.getList('groceries');
		expect(output.items[2]).toEqual({name: "Third Item", uuid:"xyz"});
	});
	test('Set Listless Item', async () => {
		const state = getPrepopulatedState();

		expect(state.setItem("abc", {name:"Third Item"})).rejects.toThrow(ValidationError);
		expect(state.setItem("abc", {name:"Third Item"})).rejects.toThrow("Item is missing a list");
		expect(state.setItem("abc", {name:"Third Item", list: ""})).rejects.toThrow(ValidationError);
		expect(state.setItem("abc", {name:"Third Item", list: ""})).rejects.toThrow("Item is missing a list");
		expect(state.setItem("abc", {name:"Third Item", list: []})).rejects.toThrow(ValidationError);
		expect(state.setItem("abc", {name:"Third Item", list: []})).rejects.toThrow("Item's list slug is not a string");
	});
	test('Move item to non-existant list', async () => {
		const state = getPrepopulatedState();

		await state.setItem("abc", {name:"First Item", irrelevantField: "hi 👋", list:"extralist"});
		const groceryOutput = await state.getList('groceries');
		const extraOutput = await state.getList('extralist');
		expect(groceryOutput.items).not.toContainEqual({name: "First Item", uuid: "abc"});
		expect(extraOutput.name).toEqual("extralist");
		expect(extraOutput.items).toContainEqual({name: "First Item", uuid: "abc"});
		expect(extraOutput.items).toHaveLength(1);
	});
	test('Add url to item', async () => {
		const state = getPrepopulatedState();

		await state.setItem('abc', {name: "First Item", list: "groceries", url: "https://example.com/1st"});
		const groceryOutput = await state.getList('groceries');
		expect(groceryOutput.items[0].url).toEqual("https://example.com/1st");
	});
	test('Remove url from item', async () => {
		const state = getPrepopulatedState();

		await state.setItem('123', {name: "Second Item", list: "groceries"});
		const groceryOutput = await state.getList('groceries');
		expect(groceryOutput.items[1].url).toBeFalsy();
	});
	test('Modify url of item', async () => {
		const state = getPrepopulatedState();

		await state.setItem('123', {name: "Second Item", list: "groceries", url: "https://example.com/new2nditem"});
		const groceryOutput = await state.getList('groceries');
		expect(groceryOutput.items[1].url).toEqual("https://example.com/new2nditem");
	});
	test('Hard delete item from list', async () => {
		const state = getPrepopulatedState();

		await state.deleteItem('abc', true);
		const groceryOutput = await state.getList('groceries');
		expect(groceryOutput.items).not.toContainEqual({name: "First Item", uuid: "abc"});
		expect(groceryOutput.items).toHaveLength(1);
		expect(groceryOutput.items[0].deleted).toBeFalsy();
	});
	test('Hard delete non-existant item', async () => {
		const state = getPrepopulatedState();

		await state.deleteItem('def', true);
		const groceryOutput = await state.getList('groceries');
		expect(groceryOutput.items).toContainEqual({name: "First Item", uuid: "abc"});
		expect(groceryOutput.items).toContainEqual({name: "Second Item", uuid: "123", url: "http://example.com/2nditem"});
		expect(groceryOutput.items).toHaveLength(2);
	});
	test('Soft delete item from list', async () => {
		const state = getPrepopulatedState();

		await state.deleteItem('abc', false);
		const groceryOutput = await state.getList('groceries');
		expect(groceryOutput.items[0].deleted).toBe(true);
		expect(groceryOutput.items).toContainEqual({name: "Second Item", uuid: "123", url: "http://example.com/2nditem"});
		expect(groceryOutput.items[1].deleted).toBeFalsy();
		expect(groceryOutput.items).toHaveLength(2);
	});
	test('Soft delete non-existant item', async () => {
		const state = getPrepopulatedState();

		await state.deleteItem('def', false);
		const groceryOutput = await state.getList('groceries');
		expect(groceryOutput.items).toContainEqual({name: "First Item", uuid: "abc"});
		expect(groceryOutput.items).toContainEqual({name: "Second Item", uuid: "123", url: "http://example.com/2nditem"});
		expect(groceryOutput.items).toHaveLength(2);
	});
	test('Hard delete entire list', async () => {
		const state = getPrepopulatedState();

		await state.deleteList('groceries', true);

		expect(state.getList('groceries')).rejects.toThrow(NotFoundError);

		const indexOutput = await state.getListsByType('todo');
		expect(indexOutput.lists).toHaveLength(1);
	});
	test('Hard delete non-existant list', async () => {
		const state = getPrepopulatedState();

		await state.deleteList('jellies', true);

		expect(state.getList('jellies')).rejects.toThrow(NotFoundError);

		const indexOutput = await state.getListsByType('todo');
		expect(indexOutput.lists).toHaveLength(2);
	});
	test('Soft delete entire list', async () => {
		const state = getPrepopulatedState();

		await state.deleteList('groceries', false);
		const groceryOutput = await state.getList('groceries');
		expect(groceryOutput.deleted).toBe(true);

		const indexOutput = await state.getListsByType('todo');
		expect(indexOutput.lists).toHaveLength(2);
		expect(indexOutput.lists[0].deleted).toBe(true);
	});
	test('Soft delete non-existant list', async () => {
		const state = getPrepopulatedState();

		await state.deleteList('jellies', false);

		expect(state.getList('jellies')).rejects.toThrow(NotFoundError);

		const indexOutput = await state.getListsByType('todo');
		expect(indexOutput.lists).toHaveLength(2);
	});
	test('Lists get default icon', async () => {
		const state = getPrepopulatedState();

		await state.setList("race-results",  {});
		const output = await state.getList('race-results');
		expect(output.icon).toEqual('📋');
	});
	test('List icon limited to one character', async () => {
		const state = getPrepopulatedState();

		await state.setList("housework",  {icon: "🧹🧽🧼✨🛁"});
		const output = await state.getList('housework');
		expect(output.icon).toEqual('🧹');
	});
	test('List icon can handle zwj sequence emojis', async () => {
		const state = getPrepopulatedState();

		await state.setList("coding",  {icon: "🧑‍💻"});
		const output = await state.getList('coding');
		expect(output.icon).toEqual('🧑‍💻');
	});
});

describe('Functions wait for raw data to be set', () => {

	// It doesn't really matter what the raw data is in this set of tests, we're mostly checking that functions wait for it to be set.
	const rawData = () => {
		return {
			lists:{
				'groceries': {name: "Grocery Shopping", extraneousField: true, items:["abc","123"]},
				'moarthings': {name: "Even More Stuff", ignoreme:"yes please", metoo: ["of course"], items:[]},
			}, items:{
				"123": {"name":"Second Item", extraExtraneousField: true, "list":"groceries", "url": "http://example.com/2nditem"},
				"abc": {"name":"First Item", ignoreThese:["this", "and this"], "list":"groceries"},
				"unused": {"name":"Unused Item"},
			}
		}
	};
	test('getRawData waits for rawData', async () => {
		const state = new State();
		const outputPromise = state.getRawData();
		state.setRawData(rawData());
		const output = await outputPromise;
		expect(output).toEqual(rawData());
	});
	test('getLists waits for rawData', async () => {
		const state = new State();
		const outputPromise = state.getListsByType('todo');
		state.setRawData(rawData());
		const output = await outputPromise;
		expect(output.lists).toHaveLength(2);
	});
	test('getList waits for rawData', async () => {
		const state = new State();
		const outputPromise = state.getList('groceries');
		state.setRawData(rawData());
		const output = await outputPromise;
		expect(output.name).toEqual("Grocery Shopping");
	});
	test('setList waits for rawData', async () => {
		const state = new State();
		const setPromise = state.setList("groceries", {name:"Food Shopping"});
		state.setRawData(rawData());
		await setPromise;
		const output = await state.getList('groceries');
		expect(output.name).toEqual("Food Shopping");
	});
	test('deleteList waits for rawData', async () => {
		const state = new State();
		const setPromise = state.deleteList("groceries", true);
		state.setRawData(rawData());
		await setPromise;
		const output = await state.getListsByType('todo');
		expect(output.lists).toHaveLength(1);
	});
	test('setItem waits for rawData', async () => {
		const state = new State();
		const setPromise = state.setItem("abc", {name:"The First Item", list:"groceries"});
		state.setRawData(rawData());
		await setPromise;
		const output = await state.getList('groceries');
		expect(output.items[0].name).toEqual("The First Item");
	});
	test('deleteItem waits for rawData', async () => {
		const state = new State();
		const setPromise = state.deleteItem("abc", true);
		state.setRawData(rawData());
		await setPromise;
		const output = await state.getList('groceries');
		expect(output.items).toHaveLength(1);
	});

});

describe('Sync function', () => {
	test('Sync function gets called after list setting', async () => {
		const syncFunction = jest.fn();
		const state = new State(syncFunction);
		state.setRawData({lists:{}, items:{}});
		expect(syncFunction.mock.calls.length).toBe(0);
		await state.setList('newlist', {name: "New List"});
		expect(syncFunction.mock.calls.length).toBe(1);
	});
	test('Sync function gets called after item setting', async () => {
		const syncFunction = jest.fn();
		const state = new State(syncFunction);
		state.setRawData({lists:{}, items:{}});
		expect(syncFunction.mock.calls.length).toBe(0);
		await state.setItem('abc', {name: "New Item", list:'newlist'});
		expect(syncFunction.mock.calls.length).toBe(1);
	});
	test('Sync function doesnt get called during getters', async () => {
		const syncFunction = jest.fn();
		const state = new State(syncFunction);
		state.setRawData({lists:{'groceries':{items:[]}}, items:{}});
		await state.getRawData();
		await state.getListsByType('todo');
		await state.getList('groceries');
		expect(syncFunction.mock.calls.length).toBe(0);
	});
});

describe('Check for unsynced data', () => {
	test('With no sync function, data only counts as synced when new raw data is set', async () => {
		const state = new State();
		state.setRawData({lists:{}, items:{}});
		expect((await state.getListsByType('todo')).hasUnsyncedData).toBe(false);
		await state.setItem('abc', {name: "New Item", list:'newlist'});
		expect((await state.getListsByType('todo')).hasUnsyncedData).toBe(true);
		expect((await state.getListsByType('todo')).lists[0]).toHaveProperty('unsynced', true);
		expect((await state.getList('newlist'))).toHaveProperty('unsynced', true);
		expect((await state.getList('newlist')).items[0]).toHaveProperty('unsynced', true);
		state.setRawData({lists:{'newlist':{items:['abc']}}, items:{'abc': {name: "New Item", list:'newlist'}}});
		expect((await state.getListsByType('todo')).hasUnsyncedData).toBe(false);
		expect((await state.getListsByType('todo')).lists[0]).toHaveProperty('unsynced', undefined);
		expect((await state.getList('newlist'))).toHaveProperty('unsynced', undefined);
		expect((await state.getList('newlist')).items[0]).toHaveProperty('unsynced', undefined);
	});
	test('With sync function, data counts as synced once function is completed succesfully', async () => {
		let resolvePromise, rejectPromise;
		const promise = new Promise((resolve, reject) => {
			resolvePromise = resolve;
			rejectPromise = reject;
		});
		const syncFunction = jest.fn(() => promise);
		const state = new State(syncFunction);
		state.setRawData({lists:{}, items:{}});
		expect((await state.getListsByType('todo')).hasUnsyncedData).toBe(false);
		const setItemPromise = state.setItem('abc', {name: "New Item", list:'newlist'});
		expect((await state.getListsByType('todo')).hasUnsyncedData).toBe(true);
		resolvePromise(true);
		await setItemPromise;
		expect((await state.getListsByType('todo')).hasUnsyncedData).toBe(false);
	});
	test('With sync function, data counts as unsynced if function fails', async () => {
		let resolvePromise, rejectPromise;
		const promise = new Promise((resolve, reject) => {
			resolvePromise = resolve;
			rejectPromise = reject;
		});
		const syncFunction = jest.fn(() => promise);
		const state = new State(syncFunction);
		state.setRawData({lists:{}, items:{}});
		expect((await state.getListsByType('todo')).hasUnsyncedData).toBe(false);
		const setItemPromise = state.setItem('abc', {name: "New Item", list:'newlist'});
		expect((await state.getListsByType('todo')).hasUnsyncedData).toBe(true);
		rejectPromise(false);
		await setItemPromise;
		expect((await state.getListsByType('todo')).hasUnsyncedData).toBe(true);
	});
	test('When data is passed with `alreadySynced` parameter, it never gets marked as unsynced', async () => {
		const state = new State();
		state.setRawData({lists:{}, items:{}});
		expect((await state.getListsByType('todo')).hasUnsyncedData).toBe(false);
		await state.setItem('abc', {name: "New Item", list:'newlist'}, true);
		expect((await state.getListsByType('todo')).hasUnsyncedData).toBe(false);
	});
	test('When unsynced data is replaced by a call with `alreadySynced` parameter, it gets marked as synced', async () => {
		const state = new State();
		state.setRawData({lists:{}, items:{}});
		await state.setList('newlist', {name: "New List"});
		expect((await state.getListsByType('todo')).hasUnsyncedData).toBe(true);
		await state.setList('newlist', {name: "New List"}, true);
		expect((await state.getListsByType('todo')).hasUnsyncedData).toBe(false);
	});

});


describe('Synchronous functions', () => {
	test('Can get type slugs without waiting to sync', async () => {
		const state = new State();
		const slugs = state.getListTypes();
		expect(slugs).toHaveLength(3);
	});
});