import { jest } from '@jest/globals';
import { generateKeyPair, exportJWK, SignJWT, jwtVerify, createLocalJWKSet } from 'jose';
import {
	parseCookies,
	hasNotesAccess,
	verifySessionToken,
	middleware,
	csrfMiddleware,
	_setVerifier,
	isJWKSInfraError,
	createServeStaleJWKS,
} from '../src/server/auth.js';

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

// ─── parseCookies ─────────────────────────────────────────────────────────────

describe('parseCookies', () => {
	test('returns empty object for undefined header', () => {
		expect(parseCookies(undefined)).toEqual({});
	});

	test('returns empty object for empty string', () => {
		expect(parseCookies('')).toEqual({});
	});

	test('parses a single cookie', () => {
		expect(parseCookies('foo=bar')).toEqual({ foo: 'bar' });
	});

	test('parses multiple cookies', () => {
		expect(parseCookies('foo=bar; baz=qux')).toEqual({ foo: 'bar', baz: 'qux' });
	});

	test('preserves = within cookie value (e.g. base64 JWT padding)', () => {
		expect(parseCookies('aithne_session=abc.def.ghi==')).toEqual({ aithne_session: 'abc.def.ghi==' });
	});

	test('only splits on the first = in a pair', () => {
		expect(parseCookies('k=a=b=c')).toEqual({ k: 'a=b=c' });
	});

	test('extracts aithne_session from a multi-cookie header', () => {
		const result = parseCookies('other=value; aithne_session=jwt.tok.en==; another=x');
		expect(result.aithne_session).toBe('jwt.tok.en==');
		expect(result.other).toBe('value');
		expect(result.another).toBe('x');
	});
});

// ─── hasNotesAccess ───────────────────────────────────────────────────────────

describe('hasNotesAccess', () => {
	test('notes:use grants access', () => {
		expect(hasNotesAccess(['notes:use'])).toBe(true);
	});

	test('notes:use alongside other scopes grants access', () => {
		expect(hasNotesAccess(['eolas:read', 'notes:use', 'webhook'])).toBe(true);
	});

	test('empty scopes denies access', () => {
		expect(hasNotesAccess([])).toBe(false);
	});

	test('unrelated scopes deny access', () => {
		expect(hasNotesAccess(['eolas:read', 'webhook'])).toBe(false);
	});

	test('render-ui grants access in development', () => {
		const orig = process.env.ENVIRONMENT;
		process.env.ENVIRONMENT = 'development';
		try {
			expect(hasNotesAccess(['render-ui'])).toBe(true);
		} finally {
			if (orig === undefined) { delete process.env.ENVIRONMENT; } else { process.env.ENVIRONMENT = orig; }
		}
	});

	test('render-ui is denied in production', () => {
		const orig = process.env.ENVIRONMENT;
		process.env.ENVIRONMENT = 'production';
		try {
			expect(hasNotesAccess(['render-ui'])).toBe(false);
		} finally {
			if (orig === undefined) { delete process.env.ENVIRONMENT; } else { process.env.ENVIRONMENT = orig; }
		}
	});
});

// ─── isJWKSInfraError ─────────────────────────────────────────────────────────

describe('isJWKSInfraError', () => {
	test('matches ERR_JWKS_TIMEOUT', () => {
		expect(isJWKSInfraError({ code: 'ERR_JWKS_TIMEOUT' })).toBe(true);
	});

	test('matches ECONNREFUSED', () => {
		expect(isJWKSInfraError({ code: 'ECONNREFUSED' })).toBe(true);
	});

	test('matches ENOTFOUND', () => {
		expect(isJWKSInfraError({ code: 'ENOTFOUND' })).toBe(true);
	});

	test('does not match ERR_JWKS_NO_MATCHING_KEY (unknown kid, not an infra failure)', () => {
		// jose already did its own reload-and-retry before surfacing this —
		// aithne responded fine, the kid just genuinely isn't in the key set.
		expect(isJWKSInfraError({ code: 'ERR_JWKS_NO_MATCHING_KEY' })).toBe(false);
	});

	test('does not match unrelated JWT error codes', () => {
		expect(isJWKSInfraError({ code: 'ERR_JWT_EXPIRED' })).toBe(false);
	});

	test('does not match an error with no code', () => {
		expect(isJWKSInfraError({})).toBe(false);
	});
});

// ─── createServeStaleJWKS ─────────────────────────────────────────────────────
//
// Exercises the wrapper against a fake "remote JWKS getter" shaped like jose's
// createRemoteJWKSet output (a callable function with a .jwks() property),
// using real EC keys and jwtVerify so the fallback path is genuinely proven
// end-to-end rather than just asserting on call counts.

describe('createServeStaleJWKS', () => {
	let privateKey, goodJWK;

	beforeAll(async () => {
		const keyPair = await generateKeyPair('ES256');
		privateKey = keyPair.privateKey;
		goodJWK = { ...(await exportJWK(keyPair.publicKey)), kid: 'test-kid', alg: 'ES256', use: 'sig' };
	});

	function makeToken(kid = 'test-kid') {
		return new SignJWT({})
			.setProtectedHeader({ alg: 'ES256', kid })
			.setIssuedAt()
			.setExpirationTime('1h')
			.sign(privateKey);
	}

	// A fake remote getter: `impl` is the per-call behaviour (return a key or
	// throw), `snapshot` is what .jwks() reports as the currently-fetched set.
	function fakeRemoteJWKS(impl, snapshot) {
		const fn = (protectedHeader, token) => impl(protectedHeader, token);
		fn.jwks = () => snapshot;
		return fn;
	}

	const jwksInfraError = () => Object.assign(new Error('fetch failed'), { code: 'ERR_JWKS_TIMEOUT' });

	test('resolves normally on a successful remote fetch', async () => {
		const jwks = { keys: [goodJWK] };
		const remote = fakeRemoteJWKS(
			(protectedHeader, token) => createLocalJWKSet(jwks)(protectedHeader, token),
			jwks
		);
		const wrapped = createServeStaleJWKS(remote);
		const token = await makeToken();
		const { payload } = await jwtVerify(token, wrapped);
		expect(payload).toBeTruthy();
	});

	test('falls back to the last-known-good key set on a JWKS infra error', async () => {
		const jwks = { keys: [goodJWK] };
		let callCount = 0;
		const remote = fakeRemoteJWKS((protectedHeader, token) => {
			callCount++;
			if (callCount === 1) return createLocalJWKSet(jwks)(protectedHeader, token);
			throw jwksInfraError();
		}, jwks);
		const wrapped = createServeStaleJWKS(remote);
		const token = await makeToken();

		// First call succeeds and captures the snapshot.
		await jwtVerify(token, wrapped);
		// Second call: remote throws an infra error; wrapper should serve stale.
		const { payload } = await jwtVerify(token, wrapped);
		expect(payload).toBeTruthy();
		expect(callCount).toBe(2);
	});

	test('rethrows the infra error when there is no last-known-good key set yet', async () => {
		const remote = fakeRemoteJWKS(() => { throw jwksInfraError(); }, undefined);
		const wrapped = createServeStaleJWKS(remote);
		const token = await makeToken();
		await expect(jwtVerify(token, wrapped)).rejects.toThrow();
	});

	test('still rejects a token whose kid is unknown even to the last-known-good set', async () => {
		const jwks = { keys: [goodJWK] };
		let callCount = 0;
		const remote = fakeRemoteJWKS((protectedHeader, token) => {
			callCount++;
			if (callCount === 1) return createLocalJWKSet(jwks)(protectedHeader, token);
			throw jwksInfraError();
		}, jwks);
		const wrapped = createServeStaleJWKS(remote);

		// Capture the snapshot with a successful call first.
		await jwtVerify(await makeToken(), wrapped);

		// A different kid, absent from the last-known-good set.
		const unknownKidToken = await makeToken('unknown-kid');
		await expect(jwtVerify(unknownKidToken, wrapped)).rejects.toThrow();
	});

	test('propagates non-infra errors without attempting a fallback', async () => {
		const jwks = { keys: [goodJWK] };
		const remote = fakeRemoteJWKS(() => {
			throw Object.assign(new Error('boom'), { code: 'ERR_SOMETHING_ELSE' });
		}, jwks);
		const wrapped = createServeStaleJWKS(remote);
		const token = await makeToken();
		await expect(jwtVerify(token, wrapped)).rejects.toThrow();
	});
});

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
