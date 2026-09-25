import { afterEach, describe, it, expect, vi } from 'vitest';
import worker from '../src/index';

const env = { RESEND_API_KEY: 'test-key', TURNSTILE_SECRET_KEY: 'turnstile-secret' };
const ORIGIN = 'https://divanimmelman.com';

const valid = {
	name: 'Jane <b>Doe</b>',
	email: 'jane@example.com',
	subject: 'Hello\r\nBcc: x@evil.test',
	message: '<script>alert(1)</script>\nSecond line',
	'cf-turnstile-response': 'good-token',
};

function post(body: unknown, origin: string | null = ORIGIN) {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (origin) headers.Origin = origin;
	return new Request('https://contact-worker.test', {
		method: 'POST',
		headers,
		body: typeof body === 'string' ? body : JSON.stringify(body),
	});
}

// Stubs both outbound calls: Turnstile siteverify and Resend.
function mockUpstreams({
	turnstile = { success: true, hostname: 'divanimmelman.com' } as object,
	resend = () => new Response('{"id":"1"}', { status: 200 }),
} = {}) {
	return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
		const url = input instanceof Request ? input.url : String(input);
		if (url.includes('challenges.cloudflare.com')) return Response.json(turnstile);
		return resend();
	});
}

function resendCall(spy: ReturnType<typeof mockUpstreams>) {
	return spy.mock.calls.find(([url]) => String(url).includes('api.resend.com'));
}

afterEach(() => vi.restoreAllMocks());

describe('contact worker', () => {
	it('rejects requests from other origins', async () => {
		const res = await worker.fetch(post(valid, 'https://evil.test'), env);
		expect(res.status).toBe(403);
	});

	it('rejects requests with no origin', async () => {
		const res = await worker.fetch(post(valid, null), env);
		expect(res.status).toBe(403);
	});

	it('answers CORS preflight for the site origin', async () => {
		const req = new Request('https://contact-worker.test', { method: 'OPTIONS', headers: { Origin: ORIGIN } });
		const res = await worker.fetch(req, env);
		expect(res.status).toBe(204);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
	});

	it('returns 400 when a field is missing', async () => {
		const res = await worker.fetch(post({ ...valid, name: '' }), env);
		expect(res.status).toBe(400);
		expect(await res.text()).toBe('Missing fields');
	});

	it('returns 400 for an invalid email', async () => {
		const res = await worker.fetch(post({ ...valid, email: 'not-an-email' }), env);
		expect(res.status).toBe(400);
	});

	it('returns 400 for an overly long message', async () => {
		const res = await worker.fetch(post({ ...valid, message: 'x'.repeat(5001) }), env);
		expect(res.status).toBe(400);
	});

	it('returns 400 for malformed JSON', async () => {
		const res = await worker.fetch(post('{not json'), env);
		expect(res.status).toBe(400);
	});

	it('sends an escaped email and returns 200', async () => {
		const fetchSpy = mockUpstreams();
		const res = await worker.fetch(post(valid), env);

		expect(res.status).toBe(200);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);

		const sent = JSON.parse(resendCall(fetchSpy)![1]!.body as string);
		expect(sent.reply_to).toBe('jane@example.com');
		expect(sent.subject).toBe('[Website] Hello Bcc: x@evil.test');
		expect(sent.html).toContain('Jane &lt;b&gt;Doe&lt;/b&gt;');
		expect(sent.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
		expect(sent.html).not.toContain('<script>');
	});

	it('does not leak Resend error details to the client', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		mockUpstreams({ resend: () => new Response('secret upstream detail', { status: 422 }) });
		const res = await worker.fetch(post(valid), env);

		expect(res.status).toBe(502);
		expect(await res.text()).not.toContain('secret upstream detail');
	});

	describe('turnstile', () => {
		it('sends the secret, token and visitor IP to siteverify', async () => {
			const fetchSpy = mockUpstreams();
			const req = post(valid);
			req.headers.set('CF-Connecting-IP', '203.0.113.7');
			await worker.fetch(req, env);

			const [url, init] = fetchSpy.mock.calls[0];
			expect(String(url)).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
			const form = init!.body as FormData;
			expect(form.get('secret')).toBe('turnstile-secret');
			expect(form.get('response')).toBe('good-token');
			expect(form.get('remoteip')).toBe('203.0.113.7');
		});

		it('rejects a missing token without calling Resend', async () => {
			const fetchSpy = mockUpstreams();
			const { 'cf-turnstile-response': _, ...noToken } = valid;
			const res = await worker.fetch(post(noToken), env);

			expect(res.status).toBe(403);
			expect(resendCall(fetchSpy)).toBeUndefined();
		});

		it('rejects a token Cloudflare says is invalid', async () => {
			const fetchSpy = mockUpstreams({ turnstile: { success: false, 'error-codes': ['invalid-input-response'] } });
			const res = await worker.fetch(post(valid), env);

			expect(res.status).toBe(403);
			expect(await res.text()).toBe('Verification failed');
			expect(resendCall(fetchSpy)).toBeUndefined();
		});

		it('rejects a valid token issued for another hostname', async () => {
			const fetchSpy = mockUpstreams({ turnstile: { success: true, hostname: 'evil.test' } });
			const res = await worker.fetch(post(valid), env);

			expect(res.status).toBe(403);
			expect(resendCall(fetchSpy)).toBeUndefined();
		});
	});
});
