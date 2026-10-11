import { jest } from '@jest/globals';

// update.js has top-level side effects (registers self-level 'message' and
// 'activate' listeners) that run at import
// time — so each test stubs the required globals and then dynamically
// imports the module fresh (jest.resetModules() first), rather than a static
// import at the top of this file. Same rationale as the other
// service-worker-*.js test files: these globals don't exist in jest's 'node'
// test environment.

beforeEach(() => {
	jest.resetModules();
});

afterEach(() => {
	delete global.self;
});

function makeSelf() {
	const handlers = {};
	global.self = {
		skipWaiting: jest.fn(),
		clients: { claim: jest.fn().mockResolvedValue(undefined) },
		addEventListener: jest.fn((type, cb) => { handlers[type] = cb; }),
	};
	return handlers;
}

test("'skip-waiting' message calls self.skipWaiting()", async () => {
	const handlers = makeSelf();
	await import('../src/service-worker/update.js');

	handlers.message({ data: 'skip-waiting' });
	expect(global.self.skipWaiting).toHaveBeenCalledTimes(1);
});

test('ignores unrelated messages', async () => {
	const handlers = makeSelf();
	await import('../src/service-worker/update.js');

	handlers.message({ data: 'streaming-opened' });
	expect(global.self.skipWaiting).not.toHaveBeenCalled();
});

test('claims existing clients on activate — without this, the tab that clicked "update" never sees controllerchange and the navbar spin never clears', async () => {
	const handlers = makeSelf();
	await import('../src/service-worker/update.js');

	const waitUntil = jest.fn();
	handlers.activate({ waitUntil });

	expect(waitUntil).toHaveBeenCalledTimes(1);
	await waitUntil.mock.calls[0][0];
	expect(global.self.clients.claim).toHaveBeenCalledTimes(1);
});
