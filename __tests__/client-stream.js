import { jest } from '@jest/globals';
import {
	createStatusMessageHandler,
	FORBIDDEN_BACKSTOP_COUNT,
	FORBIDDEN_BACKSTOP_WINDOW_MS,
} from '../src/client/stream.js';

// createStatusMessageHandler is exercised directly (rather than through a
// real BroadcastChannel + window.location) so these tests don't depend on a
// browser environment — the factory takes redirectToLogin/now as injectable
// seams for exactly this purpose.

function makeHandler(overrides = {}) {
	const redirectToLogin = jest.fn();
	let clock = overrides.startTime ?? 0;
	const now = () => clock;
	const advance = (ms) => { clock += ms; };
	const handler = createStatusMessageHandler({ redirectToLogin, now, ...overrides });
	return { handler, redirectToLogin, advance };
}

describe('createStatusMessageHandler: streaming-forbidden', () => {
	test('a single streaming-forbidden does not redirect', () => {
		const { handler, redirectToLogin } = makeHandler();
		handler({ data: 'streaming-forbidden' });
		expect(redirectToLogin).not.toHaveBeenCalled();
	});

	test('fewer than the backstop count does not redirect', () => {
		const { handler, redirectToLogin } = makeHandler();
		for (let i = 0; i < FORBIDDEN_BACKSTOP_COUNT - 1; i++) {
			handler({ data: 'streaming-forbidden' });
		}
		expect(redirectToLogin).not.toHaveBeenCalled();
	});

	test('reaching the backstop count within the window redirects', () => {
		const { handler, redirectToLogin } = makeHandler();
		for (let i = 0; i < FORBIDDEN_BACKSTOP_COUNT; i++) {
			handler({ data: 'streaming-forbidden' });
		}
		expect(redirectToLogin).toHaveBeenCalledTimes(1);
	});

	test('forbidden events outside the window are pruned and do not count towards the backstop', () => {
		const { handler, redirectToLogin, advance } = makeHandler();
		// One forbidden, then let the window fully elapse before any more.
		handler({ data: 'streaming-forbidden' });
		advance(FORBIDDEN_BACKSTOP_WINDOW_MS + 1);
		for (let i = 0; i < FORBIDDEN_BACKSTOP_COUNT - 1; i++) {
			handler({ data: 'streaming-forbidden' });
		}
		// Only FORBIDDEN_BACKSTOP_COUNT - 1 forbidden events remain within the window.
		expect(redirectToLogin).not.toHaveBeenCalled();
	});

	test('does not redirect again after the backstop has already fired once', () => {
		const { handler, redirectToLogin } = makeHandler();
		for (let i = 0; i < FORBIDDEN_BACKSTOP_COUNT; i++) {
			handler({ data: 'streaming-forbidden' });
		}
		handler({ data: 'streaming-forbidden' });
		handler({ data: 'session-expired' });
		expect(redirectToLogin).toHaveBeenCalledTimes(1);
	});
});

describe('createStatusMessageHandler: session-active', () => {
	test('resets the forbidden count, so a prior near-backstop streak does not carry over', () => {
		const { handler, redirectToLogin } = makeHandler();
		for (let i = 0; i < FORBIDDEN_BACKSTOP_COUNT - 1; i++) {
			handler({ data: 'streaming-forbidden' });
		}
		handler({ data: 'session-active' });
		handler({ data: 'streaming-forbidden' });
		// Only one forbidden recorded since the reset — well under the backstop.
		expect(redirectToLogin).not.toHaveBeenCalled();
	});
});

describe('createStatusMessageHandler: session-expired', () => {
	test('redirects immediately, even with zero prior streaming-forbidden events', () => {
		const { handler, redirectToLogin } = makeHandler();
		handler({ data: 'session-expired' });
		expect(redirectToLogin).toHaveBeenCalledTimes(1);
	});

	test('redirects immediately regardless of forbidden count being below the backstop', () => {
		const { handler, redirectToLogin } = makeHandler();
		handler({ data: 'streaming-forbidden' });
		handler({ data: 'session-expired' });
		expect(redirectToLogin).toHaveBeenCalledTimes(1);
	});

	test('does not redirect a second time on a further streaming-forbidden after session-expired', () => {
		const { handler, redirectToLogin } = makeHandler();
		handler({ data: 'session-expired' });
		handler({ data: 'streaming-forbidden' });
		handler({ data: 'streaming-forbidden' });
		handler({ data: 'streaming-forbidden' });
		expect(redirectToLogin).toHaveBeenCalledTimes(1);
	});
});

describe('createStatusMessageHandler: other messages', () => {
	test('ignores unrelated status messages without redirecting', () => {
		const { handler, redirectToLogin } = makeHandler();
		handler({ data: 'streaming-opened' });
		handler({ data: 'streaming-closed' });
		handler({ data: 'service-worker-waiting' });
		expect(redirectToLogin).not.toHaveBeenCalled();
	});
});
