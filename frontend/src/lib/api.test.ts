import MockAdapter from 'axios-mock-adapter';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import api, { SessionExpiredError } from './api';

const mock = new MockAdapter(api);

beforeEach(() => mock.reset());
afterEach(() => mock.reset());

describe('401 interceptor', () => {
  it('passes non-401 errors through unchanged', async () => {
    mock.onGet('/products').reply(500);
    await expect(api.get('/products')).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it('does not attempt refresh for auth endpoints', async () => {
    mock.onPost('/auth/login').reply(401);
    await expect(api.post('/auth/login')).rejects.toMatchObject({
      response: { status: 401 },
    });
  });

  it('retries original request after successful refresh', async () => {
    mock.onGet('/products').replyOnce(401);
    mock.onPost('/auth/refresh').reply(200);
    mock.onGet('/products').reply(200, { items: [] });

    const res = await api.get('/products');
    expect(res.data).toEqual({ items: [] });
  });

  it('rejects with SessionExpiredError when refresh fails', async () => {
    mock.onGet('/products').reply(401);
    mock.onPost('/auth/refresh').reply(401);

    await expect(api.get('/products')).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it('queues concurrent 401s and issues only one refresh', async () => {
    mock.onGet('/a').replyOnce(401).onGet('/a').reply(200, 'a');
    mock.onGet('/b').replyOnce(401).onGet('/b').reply(200, 'b');
    mock.onPost('/auth/refresh').replyOnce(200); // fails if called twice

    const [a, b] = await Promise.all([api.get('/a'), api.get('/b')]);
    expect(a.data).toBe('a');
    expect(b.data).toBe('b');
  });
});
