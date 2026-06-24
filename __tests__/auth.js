import { jest } from '@jest/globals';
import { isAuthenticated, middleware } from '../src/server/auth.js';

/**
 * Build a minimal Express-like request object.
 *
 * @param {object} opts
 * @param {string}  opts.cookieStr  Raw Cookie header value (default: '')
 * @param {string}  opts.queryToken Token supplied as ?token= query param
 * @param {string}  opts.host       Host header (default: 'notes.l42.eu')
 * @param {string}  opts.path       originalUrl (default: '/')
 */
function makeReq({ cookieStr = '', queryToken, host = 'notes.l42.eu', path = '/' } = {}) {
	const query = {};
	if (queryToken !== undefined) query.token = queryToken;
	return {
		headers: { cookie: cookieStr, host },
		query,
		originalUrl: path,
		// express-rate-limit reads req.ip for per-client counting and
		// validates the trust-proxy setting via req.app.get()
		ip: '127.0.0.1',
		socket: { remoteAddress: '127.0.0.1' },
		app: { get: () => undefined },
	};
}

/**
 * Build a minimal Express-like response object.
 * express-rate-limit needs setHeader/getHeader; auth middleware needs
 * redirect() and cookie().
 */
function makeRes() {
	const res = {};
	res.cookie = jest.fn();
	res.redirect = jest.fn();
	res.setHeader = jest.fn();
	res.getHeader = jest.fn(() => null);
	res.removeHeader = jest.fn();
	return res;
}

// ---------------------------------------------------------------------------
// isAuthenticated() unit tests
// ---------------------------------------------------------------------------
describe('isAuthenticated', () => {
	let originalFetch;
	let consoleErrorSpy;

	beforeAll(() => {
		originalFetch = global.fetch;
	});

	beforeEach(() => {
		global.fetch = jest.fn();
		// Suppress expected console.error output from failed auth attempts
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		global.fetch = originalFetch;
		consoleErrorSpy.mockRestore();
	});

	test('Returns false immediately for missing token', async () => {
		expect(await isAuthenticated(undefined)).toBe(false);
		expect(await isAuthenticated(null)).toBe(false);
		expect(await isAuthenticated('')).toBe(false);
		// No fetch call needed for missing tokens
		expect(global.fetch).not.toHaveBeenCalled();
	});

	test('Returns true and calls auth server for a valid token', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			status: 200,
			json: () => Promise.resolve({ user: 'alice' }),
		});
		expect(await isAuthenticated('valid-unique-token-a')).toBe(true);
		expect(global.fetch).toHaveBeenCalledWith(
			'https://auth.l42.eu/data?token=valid-unique-token-a'
		);
	});

	test('Returns false when auth server returns a non-200 status', async () => {
		global.fetch = jest.fn().mockResolvedValue({ status: 401 });
		expect(await isAuthenticated('rejected-token-a')).toBe(false);
	});

	test('Returns false when the auth server request throws', async () => {
		global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
		expect(await isAuthenticated('network-error-token-a')).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// middleware() integration tests
// ---------------------------------------------------------------------------
describe('middleware', () => {
	let originalFetch;
	let consoleErrorSpy;

	beforeAll(() => {
		originalFetch = global.fetch;
	});

	beforeEach(() => {
		global.fetch = jest.fn();
		// Suppress expected console.error from auth failures / rate-limiter validation
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		global.fetch = originalFetch;
		consoleErrorSpy.mockRestore();
	});

	test('Passes through a request carrying a valid session cookie', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			status: 200,
			json: () => Promise.resolve({ user: 'alice' }),
		});
		const req = makeReq({ cookieStr: 'auth_token=cookie-token-b' });
		const res = makeRes();
		const next = jest.fn();

		await middleware(req, res, next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(res.redirect).not.toHaveBeenCalled();
		expect(res.auth_agent).toEqual({ user: 'alice' });
	});

	test('Redirects a request with a missing cookie to the auth login page', async () => {
		// No token at all — fetch should not be called
		const req = makeReq({ cookieStr: '' });
		const res = makeRes();
		const next = jest.fn();

		await middleware(req, res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.redirect).toHaveBeenCalledTimes(1);
		const [status, url] = res.redirect.mock.calls[0];
		expect(status).toBe(302);
		expect(url).toContain('https://auth.l42.eu/authenticate');
	});

	test('Redirect URL encodes the correct redirect_uri for the current request', async () => {
		const req = makeReq({
			cookieStr: '',
			host: 'notes.l42.eu',
			path: '/my-list',
		});
		const res = makeRes();

		await middleware(req, res, jest.fn());

		expect(res.redirect).toHaveBeenCalledTimes(1);
		const [status, rawUrl] = res.redirect.mock.calls[0];
		expect(status).toBe(302);

		const url = new URL(rawUrl);
		expect(url.origin + url.pathname).toBe('https://auth.l42.eu/authenticate');

		const redirectUri = decodeURIComponent(url.searchParams.get('redirect_uri'));
		expect(redirectUri).toContain('notes.l42.eu');
		expect(redirectUri).toContain('/my-list');
	});

	test('Redirects a request with an invalid session cookie to the auth login page', async () => {
		global.fetch = jest.fn().mockResolvedValue({ status: 403 });
		const req = makeReq({ cookieStr: 'auth_token=invalid-token-b' });
		const res = makeRes();
		const next = jest.fn();

		await middleware(req, res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.redirect).toHaveBeenCalledTimes(1);
		const [status, url] = res.redirect.mock.calls[0];
		expect(status).toBe(302);
		expect(url).toContain('https://auth.l42.eu/authenticate');
	});

	test('Sets auth_token cookie when token arrives as a query parameter', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			status: 200,
			json: () => Promise.resolve({ user: 'bob' }),
		});
		// Token in query string, not in cookie
		const req = makeReq({ cookieStr: '', queryToken: 'query-token-b' });
		const res = makeRes();
		const next = jest.fn();

		await middleware(req, res, next);

		expect(next).toHaveBeenCalledTimes(1);
		// Middleware should persist the token as a cookie for future requests
		expect(res.cookie).toHaveBeenCalledWith('auth_token', 'query-token-b');
	});

	test('Does not reset cookie when token already matches the cookie', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			status: 200,
			json: () => Promise.resolve({ user: 'carol' }),
		});
		// Token present in both cookie and query — cookie already correct
		const req = makeReq({ cookieStr: 'auth_token=same-token-b', queryToken: 'same-token-b' });
		const res = makeRes();
		const next = jest.fn();

		await middleware(req, res, next);

		expect(next).toHaveBeenCalledTimes(1);
		// Token was already in the cookie — no need to set it again
		expect(res.cookie).not.toHaveBeenCalled();
	});
});
