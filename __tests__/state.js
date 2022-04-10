import {jest} from '@jest/globals'
import State from '../src/classes/state.js';

describe('Handle raw state data', () => {
	test('Set and read the same raw data', async () => {
		const state = new State();
		state.setRawData({lists:{groceries:{name: "Grocery Shopping"}}, items:{}});
		const output = await state.getRawData();
		expect(output).toEqual({lists:{groceries:{name: "Grocery Shopping"}}, items:{}});
	});
	test('Getters wait for rawData', async () => {
		const state = new State();
		const outputPromise = state.getRawData();
		state.setRawData({lists:{groceries:{name: "Grocery Shopping"}}, items:{}});
		const output = await outputPromise;
		expect(output).toEqual({lists:{groceries:{name: "Grocery Shopping"}}, items:{}});
	});
	test('Raw data with no lists array fails', () => {
		const state = new State();

		// Missing lists field
		expect(() => {
			state.setRawData({listicles:{groceries:{name: "Grocery Shopping"}}, items:{}});
		}).toThrow(Error);

		// Lists field is array
		expect(() => {
			state.setRawData({lists:[{slug:'groceries',name: "Grocery Shopping"}], items:{}});
		}).toThrow(TypeError);

		// Lists field is integer
		expect(() => {
			state.setRawData({lists:7, items:{}});
		}).toThrow(TypeError);
	});
	test('Raw data with no items object fails', () => {
		const state = new State();

		// Missing lists field
		expect(() => {
			state.setRawData({itum:{}, lists:{}});
		}).toThrow(Error);

		// Lists field of wrong type
		expect(() => {
			state.setRawData({items:"items go here", lists:{}});
		}).toThrow(TypeError);
	});
});

describe('Get and set state data', () => {
	function getPrepopulatedState() {
		const state = new State();
		state.setRawData({lists:{
			'groceries': {name: "Grocery Shopping", extraneousField: true, items:["abc","123"]},
			'moarthings': {name: "Even More Stuff", ignoreme:"yes please", metoo: ["of course"], items:[]},
		}, items:{
			"123": {"name":"Second Item", extraExtraneousField: true, "list":"groceries", "url": "http://example.com/2nditem"},
			"abc": {"name":"First Item", ignoreThese:["this", "and this"], "list":"groceries"},
			"unused": {"name":"Unused Item"},
		}});
		return state;
	}

	test('Get a list of lists in a format usable for templates', async	() => {
		const state = getPrepopulatedState();
		const output = await state.getLists();
		expect(output).toEqual({lists:[
			{slug:'groceries',name: "Grocery Shopping"},
			{slug:'moarthings',name: "Even More Stuff"},
		]});
	});
	test('Get a list in a format usable for templates', async	() => {
		const state = getPrepopulatedState();
		expect(state.getList('missing list')).rejects.toThrow("Can't find list 'missing list'");

		const output = await state.getList('groceries');
		expect(output).toEqual({
			name: "Grocery Shopping",
			items: [
				{"name":"First Item"},
				{"name":"Second Item", "url": "http://example.com/2nditem"},
			]
		});
	});
	test('Update list with a new name', async () => {
		const state = getPrepopulatedState();

		state.setList("groceries", {name:"Food Shopping"});
		const output = await state.getList('groceries');
		expect(output.name).toEqual("Food Shopping");
	});
	test('Update list with empty name', async () => {
		const state = getPrepopulatedState();

		state.setList("groceries",  {});
		const output = await state.getList('groceries');
		expect(output.name).toEqual('groceries');

		const indexOutput = await state.getLists();
		expect(indexOutput.lists[0].name).toEqual('groceries');
	});
	test('Update non-existant list', async () => {
		const state = getPrepopulatedState();

		state.setList("newlist", {name:"Brand New List"});
		const output = await state.getList('newlist');
		expect(output.name).toEqual('Brand New List');
	});
	test('Update item with a new name', async () => {
		const state = getPrepopulatedState();

		state.setItem("abc", {name:"The First Item", irrelevantField: "hi 👋", list:"groceries"});
		const output = await state.getList('groceries');
		expect(output.items[0]).toEqual({name: "The First Item"});
	});
	test('Move item to different list', async () => {
		const state = getPrepopulatedState();

		state.setItem("abc", {name:"First Item", irrelevantField: "hi 👋", list:"moarthings"});
		const groceryOutput = await state.getList('groceries');
		const moarOutput = await state.getList('moarthings');
		expect(groceryOutput.items).not.toContainEqual({name: "First Item"});
		expect(moarOutput.items).toContainEqual({name: "First Item"});
	});
	test('Create new Item', async () => {
		const state = getPrepopulatedState();

		state.setItem("xyz", {name:"Third Item", otherField: true, list:"groceries"});
		const output = await state.getList('groceries');
		expect(output.items[2]).toEqual({name: "Third Item"});
	});
	test('Set Listless Item', async () => {
		const state = getPrepopulatedState();

		expect(state.setItem("abc", {name:"Third Item"})).rejects.toThrow("Item is missing a list");
		expect(state.setItem("abc", {name:"Third Item", list: ""})).rejects.toThrow("Item is missing a list");
		expect(state.setItem("abc", {name:"Third Item", list: []})).rejects.toThrow("Item's list slug is not a string");
	});
	test('Move item to non-existant list', async () => {
		const state = getPrepopulatedState();

		state.setItem("abc", {name:"First Item", irrelevantField: "hi 👋", list:"extralist"});
		const groceryOutput = await state.getList('groceries');
		const extraOutput = await state.getList('extralist');
		expect(groceryOutput.items).not.toContainEqual({name: "First Item"});
		expect(extraOutput.name).toEqual("extralist");
		expect(extraOutput.items).toContainEqual({name: "First Item"});
		expect(extraOutput.items).toHaveLength(1);
	});
	test('Add url to item', async () => {
		const state = getPrepopulatedState();

		state.setItem('abc', {name: "First Item", list: "groceries", url: "https://example.com/1st"});
		const groceryOutput = await state.getList('groceries');
		expect(groceryOutput.items[0].url).toEqual("https://example.com/1st");
	});
	test('Remove url from item', async () => {
		const state = getPrepopulatedState();

		state.setItem('123', {name: "Second Item", list: "groceries"});
		const groceryOutput = await state.getList('groceries');
		expect(groceryOutput.items[1].url).toBeFalsy();
	});
	test('Modify url of item', async () => {
		const state = getPrepopulatedState();

		state.setItem('123', {name: "Second Item", list: "groceries", url: "https://example.com/new2nditem"});
		const groceryOutput = await state.getList('groceries');
		expect(groceryOutput.items[1].url).toEqual("https://example.com/new2nditem");
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
		await state.getLists();
		await state.getList('groceries');
		expect(syncFunction.mock.calls.length).toBe(0);
	});
});