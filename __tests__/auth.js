import { jest } from '@jest/globals';
import {
	verifySessionToken,
	middleware,
	csrfMiddleware,
	_setVerifier,
} from '../src/server/auth.js';

// parseCookies, hasNotesAccess (including the render-ui dev bypass),
// isJWKSInfraError, createServeStaleJWKS and loginUrl's returnUrl validation
// are all owned and unit-tested by lucos_aithne_jsclient itself (ADR-0001) —
// this suite only exercises this app's own presentation on top of
// Classification.outcome (verifySessionToken/middleware), plus csrfMiddleware,
// which stays consumer-owned.

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq({ cookie, method = 'GET', originalUrl = '/', protocol = 'https', origin, referer } = {}) {
	return {
		headers: {
			host: 'notes.l42.eu',
			...(cookie !== undefined && { cookie }),
			...(origin !== undefined && { origin }),
			...(referer !== undefined && { referer }),
		},
		method,
		originalUrl,
		protocol,
	};
}

function makeRes() {
	const res = { auth_agent: undefined, locals: {} };
	res.redirect = jest.fn();
	res.status = jest.fn().mockReturnValue(res);
	res.render = jest.fn().mockReturnValue(res);
	res.json = jest.fn().mockReturnValue(res);
	return res;
}

// Sentinel verifier — throws if called unexpectedly (guards against tests
// accidentally hitting the real JWKS endpoint).
const sentinelVerifier = () => {
	throw Object.assign(new Error('Test: real verifier should not be called'), { code: 'TEST_SENTINEL' });
};

// ─── verifySessionToken ───────────────────────────────────────────────────────

describe('verifySessionToken', () => {
	afterEach(() => {
		_setVerifier(sentinelVerifier);
	});

	test('no cookie header → not authenticated, not authorized', async () => {
		const result = await verifySessionToken(undefined);
		expect(result.authenticated).toBe(false);
		expect(result.authorized).toBe(false);
	});

	test('cookie header without aithne_session → not authenticated', async () => {
		const result = await verifySessionToken('other=value');
		expect(result.authenticated).toBe(false);
		expect(result.authorized).toBe(false);
	});

	test('valid JWT with notes:use → authenticated and authorized', async () => {
		const fakePayload = { sub: 'user:1', principal_class: 'human', scopes: ['notes:use'], exp: 9999999999 };
		_setVerifier(async () => ({ payload: fakePayload }));
		const result = await verifySessionToken('aithne_session=valid.jwt.token');
		expect(result.authenticated).toBe(true);
		expect(result.authorized).toBe(true);
		expect(result.payload).toEqual(fakePayload);
	});

	test('valid JWT missing notes:use → authenticated but not authorized', async () => {
		const fakePayload = { sub: 'user:2', principal_class: 'human', scopes: ['eolas:read'], exp: 9999999999 };
		_setVerifier(async () => ({ payload: fakePayload }));
		const result = await verifySessionToken('aithne_session=valid.jwt.no-scope');
		expect(result.authenticated).toBe(true);
		expect(result.authorized).toBe(false);
		expect(result.payload).toEqual(fakePayload);
	});

	test('valid JWT with empty scopes → authenticated but not authorized', async () => {
		const fakePayload = { sub: 'user:3', scopes: [], exp: 9999999999 };
		_setVerifier(async () => ({ payload: fakePayload }));
		const result = await verifySessionToken('aithne_session=valid.jwt.empty-scopes');
		expect(result.authenticated).toBe(true);
		expect(result.authorized).toBe(false);
	});

	test('expired JWT → not authenticated, not authorized', async () => {
		_setVerifier(async () => { throw Object.assign(new Error('JWTExpired'), { code: 'ERR_JWT_EXPIRED' }); });
		const result = await verifySessionToken('aithne_session=expired.jwt.token');
		expect(result.authenticated).toBe(false);
		expect(result.authorized).toBe(false);
	});

	test('tampered JWT → not authenticated, not authorized', async () => {
		_setVerifier(async () => { throw Object.assign(new Error('JWSSignatureVerificationFailed'), { code: 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' }); });
		const result = await verifySessionToken('aithne_session=tampered.jwt.token');
		expect(result.authenticated).toBe(false);
		expect(result.authorized).toBe(false);
	});

	test('JWKS infra failure → not authenticated, not authorized (no local unavailable page)', async () => {
		// lucos_aithne_jsclient classifies this as outcome: 'unavailable'. Problem 2
		// (a local "sign-in unavailable" page) was abandoned (lucas42/lucos#260), so
		// this consumer treats it identically to any other failed verification.
		_setVerifier(async () => { throw Object.assign(new Error('fetch failed'), { code: 'ERR_JWKS_TIMEOUT' }); });
		const result = await verifySessionToken('aithne_session=some.jwt.token');
		expect(result.authenticated).toBe(false);
		expect(result.authorized).toBe(false);
	});
});

// ─── middleware ───────────────────────────────────────────────────────────────

describe('middleware', () => {
	let consoleWarnSpy;

	beforeEach(() => {
		consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		_setVerifier(sentinelVerifier);
		consoleWarnSpy.mockRestore();
	});

	// Branch 1: valid token + notes:use scope → proceed
	test('valid JWT with notes:use → calls next() and sets res.auth_agent', async () => {
		const fakePayload = { sub: 'user:1', principal_class: 'human', scopes: ['notes:use'], exp: 9999999999 };
		_setVerifier(async () => ({ payload: fakePayload }));
		const req = makeReq({ cookie: 'aithne_session=valid.jwt.token' });
		const res = makeRes();
		const next = jest.fn();
		await middleware(req, res, next);
		expect(next).toHaveBeenCalledTimes(1);
		expect(res.redirect).not.toHaveBeenCalled();
		expect(res.render).not.toHaveBeenCalled();
		expect(res.auth_agent).toEqual(fakePayload);
	});

	// Branch 2: valid token, missing scope → render styled 403, no redirect
	test('valid JWT missing notes:use → renders own styled 403, does not redirect', async () => {
		const fakePayload = { sub: 'user:2', principal_class: 'human', scopes: ['eolas:read'], exp: 9999999999 };
		_setVerifier(async () => ({ payload: fakePayload }));
		const req = makeReq({ cookie: 'aithne_session=valid.jwt.no-scope' });
		const res = makeRes();
		const next = jest.fn();
		await middleware(req, res, next);
		expect(next).not.toHaveBeenCalled();
		expect(res.redirect).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.render).toHaveBeenCalledWith('page', expect.objectContaining({ pagetype: 'error' }));
	});

	// Branch 3: no/expired/invalid token → redirect to aithne login
	test('no cookie → redirects to aithne login', async () => {
		const req = makeReq();
		const res = makeRes();
		const next = jest.fn();
		await middleware(req, res, next);
		expect(next).not.toHaveBeenCalled();
		expect(res.render).not.toHaveBeenCalled();
		expect(res.redirect).toHaveBeenCalledTimes(1);
		const [status, url] = res.redirect.mock.calls[0];
		expect(status).toBe(302);
		expect(url).toContain('/auth/login?next=');
	});

	test('unauthenticated redirect encodes the server-side URL into next param', async () => {
		const req = makeReq({ protocol: 'https', originalUrl: '/todo/?filter=active' });
		const res = makeRes();
		await middleware(req, res, jest.fn());
		const [, redirectUrl] = res.redirect.mock.calls[0];
		const returnUrl = decodeURIComponent(new URL(redirectUrl).searchParams.get('next'));
		expect(returnUrl.startsWith('https://')).toBe(true);
		expect(returnUrl).toContain('/todo/?filter=active');
	});

	test('expired JWT → redirects to login', async () => {
		_setVerifier(async () => { throw Object.assign(new Error('JWTExpired'), { code: 'ERR_JWT_EXPIRED' }); });
		const req = makeReq({ cookie: 'aithne_session=expired.jwt.token' });
		const res = makeRes();
		const next = jest.fn();
		await middleware(req, res, next);
		expect(next).not.toHaveBeenCalled();
		expect(res.redirect).toHaveBeenCalledTimes(1);
		expect(res.render).not.toHaveBeenCalled();
	});

	test('tampered JWT → redirects to login', async () => {
		_setVerifier(async () => { throw Object.assign(new Error('JWSSignatureVerificationFailed'), { code: 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' }); });
		const req = makeReq({ cookie: 'aithne_session=tampered.jwt.token' });
		const res = makeRes();
		const next = jest.fn();
		await middleware(req, res, next);
		expect(next).not.toHaveBeenCalled();
		expect(res.redirect).toHaveBeenCalledTimes(1);
	});

	test('JWKS infra failure → redirects to login (no local unavailable page)', async () => {
		_setVerifier(async () => { throw Object.assign(new Error('fetch failed'), { code: 'ERR_JWKS_TIMEOUT' }); });
		const req = makeReq({ cookie: 'aithne_session=some.jwt.token' });
		const res = makeRes();
		const next = jest.fn();
		await middleware(req, res, next);
		expect(next).not.toHaveBeenCalled();
		expect(res.status).not.toHaveBeenCalled();
		expect(res.redirect).toHaveBeenCalledTimes(1);
	});
});

// ─── csrfMiddleware ───────────────────────────────────────────────────────────

describe('csrfMiddleware', () => {
	let origEnv;

	beforeEach(() => {
		origEnv = process.env.ENVIRONMENT;
	});

	afterEach(() => {
		if (origEnv === undefined) { delete process.env.ENVIRONMENT; } else { process.env.ENVIRONMENT = origEnv; }
	});

	test('GET request → passes through (no CSRF risk)', () => {
		const req = makeReq({ method: 'GET' });
		const res = makeRes();
		const next = jest.fn();
		csrfMiddleware(req, res, next);
		expect(next).toHaveBeenCalledTimes(1);
		expect(res.status).not.toHaveBeenCalled();
	});

	test('PUT with *.l42.eu Origin → allowed', () => {
		const req = makeReq({ method: 'PUT', origin: 'https://notes.l42.eu' });
		const res = makeRes();
		const next = jest.fn();
		csrfMiddleware(req, res, next);
		expect(next).toHaveBeenCalledTimes(1);
	});

	test('DELETE with subdomain l42.eu Origin → allowed', () => {
		const req = makeReq({ method: 'DELETE', origin: 'https://other.l42.eu' });
		const res = makeRes();
		const next = jest.fn();
		csrfMiddleware(req, res, next);
		expect(next).toHaveBeenCalledTimes(1);
	});

	test('DELETE with evil.com Origin → rejected with 403', () => {
		process.env.ENVIRONMENT = 'production';
		const req = makeReq({ method: 'DELETE', origin: 'https://evil.com' });
		const res = makeRes();
		const next = jest.fn();
		csrfMiddleware(req, res, next);
		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(403);
	});

	test('PUT with l42.eu Referer (no Origin) → allowed', () => {
		const req = makeReq({ method: 'PUT', referer: 'https://notes.l42.eu/todo/' });
		const res = makeRes();
		const next = jest.fn();
		csrfMiddleware(req, res, next);
		expect(next).toHaveBeenCalledTimes(1);
	});

	test('DELETE with evil.com Referer (no Origin) → rejected with 403', () => {
		process.env.ENVIRONMENT = 'production';
		const req = makeReq({ method: 'DELETE', referer: 'https://evil.com/phishing' });
		const res = makeRes();
		const next = jest.fn();
		csrfMiddleware(req, res, next);
		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(403);
	});

	test('PUT with no Origin and no Referer → allowed (same-origin request)', () => {
		const req = makeReq({ method: 'PUT' });
		const res = makeRes();
		const next = jest.fn();
		csrfMiddleware(req, res, next);
		expect(next).toHaveBeenCalledTimes(1);
	});

	test('PUT with localhost Origin in development → allowed', () => {
		process.env.ENVIRONMENT = 'development';
		const req = makeReq({ method: 'PUT', origin: 'http://localhost:8004' });
		const res = makeRes();
		const next = jest.fn();
		csrfMiddleware(req, res, next);
		expect(next).toHaveBeenCalledTimes(1);
	});

	test('PUT with localhost Origin in production → rejected with 403', () => {
		process.env.ENVIRONMENT = 'production';
		const req = makeReq({ method: 'PUT', origin: 'http://localhost:8004' });
		const res = makeRes();
		const next = jest.fn();
		csrfMiddleware(req, res, next);
		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(403);
	});
});
