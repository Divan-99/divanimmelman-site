import { afterEach, describe, it, expect, vi } from 'vitest';
import worker from '../src/index';

const env = { RESEND_API_KEY: 'test-key' };
const ORIGIN = 'https://divanimmelman.com';

const valid = {
	name: 'Jane <b>Doe</b>',
	email: 'jane@example.com',
	subject: 'Hello\r\nBcc: x@evil.test',
	message: '<script>alert(1)</script>\nSecond line',
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

function mockResend(response = new Response('{"id":"1"}', { status: 200 })) {
	return vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);
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
		const fetchSpy = mockResend();
		const res = await worker.fetch(post(valid), env);

		expect(res.status).toBe(200);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);

		const sent = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
		expect(sent.reply_to).toBe('jane@example.com');
		expect(sent.subject).toBe('[Website] Hello Bcc: x@evil.test');
		expect(sent.html).toContain('Jane &lt;b&gt;Doe&lt;/b&gt;');
		expect(sent.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
		expect(sent.html).not.toContain('<script>');
	});

	it('does not leak Resend error details to the client', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		mockResend(new Response('secret upstream detail', { status: 422 }));
		const res = await worker.fetch(post(valid), env);

		expect(res.status).toBe(502);
		expect(await res.text()).not.toContain('secret upstream detail');
	});
});
