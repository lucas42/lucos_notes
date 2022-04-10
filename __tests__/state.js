import State from '../src/state.js';

describe('State', () => {
	it('set and read raw data', async () => {
		const state = new State();
		state.setRawData({lists:[{slug:'groceries',name: "Grocery Shopping"}]});
		const output = await state.getRawData();
		expect(output).toEqual({lists:[{slug:'groceries',name: "Grocery Shopping"}]});
	});
});