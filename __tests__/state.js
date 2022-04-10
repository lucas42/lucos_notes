import State from '../src/state.js';

describe('State', () => {
	it('Set and read the same raw data', async () => {
		const state = new State();
		state.setRawData({lists:{groceries:{name: "Grocery Shopping"}}, items:{}});
		const output = await state.getRawData();
		expect(output).toEqual({lists:{groceries:{name: "Grocery Shopping"}}, items:{}});
	});
	it('Getters wait for rawData', async () => {
		const state = new State();
		const outputPromise = state.getRawData();
		state.setRawData({lists:{groceries:{name: "Grocery Shopping"}}, items:{}});
		const output = await outputPromise;
		expect(output).toEqual({lists:{groceries:{name: "Grocery Shopping"}}, items:{}});
	});
	it('Raw data with no lists array fails', () => {
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
	it('Raw data with no items object fails', () => {
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
	it('Can get a list of lists in a format usable for templates', async	() => {
		const state = new State();
		state.setRawData({lists:{
			'groceries': {name: "Grocery Shopping", extraneousField: true, items:["abc","123"]},
			'moarthings': {name: "Even More Stuff", ignoreme:"yes please", metoo: ["of course"]},
		}, items:{
			"abc": {"name":"First Item"},
		}});
		const output = await state.getLists();
		expect(output).toEqual({lists:[
			{slug:'groceries',name: "Grocery Shopping"},
			{slug:'moarthings',name: "Even More Stuff"},
		]});
	});
	it('Can get a list in a format usable for templates', async	() => {
		const state = new State();
		state.setRawData({lists:{
			'groceries': {name: "Grocery Shopping", extraneousField: true, items:["abc","123"]},
			'moarthings': {name: "Even More Stuff", ignoreme:"yes please", metoo: ["of course"]},
		}, items:{
			"123": {"name":"Second Item", extraExtraneousField: true},
			"abc": {"name":"First Item", ignoreThese:["this", "and this"]},
			"unused": {"name":"Unused Item"},
		}});
		expect(state.getList('missing list')).rejects.toThrow("Can't find list 'missing list'");

		const output = await state.getList('groceries');
		expect(output).toEqual({
			name: "Grocery Shopping",
			items: [
				{"name":"First Item"},
				{"name":"Second Item"},
			]
		});
	});
});