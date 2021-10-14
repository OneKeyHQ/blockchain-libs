import fetch, { Response } from 'cross-fetch';
import { mocked } from 'ts-jest/utils';

import { ResponseError } from '../../../src/basic/request/exceptions';
import { RestfulRequest } from '../../../src/basic/request/restful';

const mockFetch = mocked(fetch, true);

beforeEach(() => {
  mockFetch.mockReturnValueOnce(
    Promise.resolve(new Response(JSON.stringify({ pong: 'success' }))),
  );
});

test('GET method as expected', async () => {
  const response = await new RestfulRequest('https://mytest.com')
    .get('/ping')
    .then((i) => i.json());

  expect(response).toStrictEqual({ pong: 'success' });
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith('https://mytest.com/ping', {
    headers: { 'User-Agent': 'blockchain-libs' },
    signal: expect.anything(),
  });
});

test('GET method with params as expected', async () => {
  const response = await new RestfulRequest('https://mytest.com')
    .get('/ping', { value: 1221 })
    .then((i) => i.json());

  expect(response).toStrictEqual({ pong: 'success' });
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith('https://mytest.com/ping?value=1221', {
    headers: { 'User-Agent': 'blockchain-libs' },
    signal: expect.anything(),
  });
});

test('GET method but failed', async () => {
  mockFetch.mockReset();
  mockFetch.mockReturnValueOnce(
    Promise.resolve(new Response('{}', { status: 404 })),
  );

  const responsePromise = new RestfulRequest('https://mytest.com').get('/ping');
  await expect(responsePromise).rejects.toThrow(
    new ResponseError('Wrong response<404>'),
  );
});

test('POST method with data as expected', async () => {
  const response = await new RestfulRequest('https://mytest.com')
    .post('/ping', { a: 1, b: 2 })
    .then((i) => i.json());

  expect(response).toStrictEqual({ pong: 'success' });
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith('https://mytest.com/ping', {
    method: 'POST',
    headers: { 'User-Agent': 'blockchain-libs' },
    body: 'a=1&b=2',
    signal: expect.anything(),
  });
});

test('POST method with json as expected', async () => {
  const response = await new RestfulRequest('https://mytest.com')
    .post('/ping', { a: 1, b: 2 }, true)
    .then((i) => i.json());

  expect(response).toStrictEqual({ pong: 'success' });
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith('https://mytest.com/ping', {
    method: 'POST',
    headers: {
      'User-Agent': 'blockchain-libs',
      'Content-Type': 'application/json',
    },
    body: '{"a":1,"b":2}',
    signal: expect.anything(),
  });
});

test('POST method but failed', async () => {
  mockFetch.mockReset();
  mockFetch.mockReturnValueOnce(
    Promise.resolve(new Response('{}', { status: 404 })),
  );

  const responsePromise = new RestfulRequest('https://mytest.com').post(
    '/ping',
  );
  await expect(responsePromise).rejects.toThrow(
    new ResponseError('Wrong response<404>'),
  );
});

test('Assemble headers - GET', async () => {
  const response = await new RestfulRequest('https://mytest.com', {
    H1: '1',
    H2: '2',
  })
    .get('/ping', undefined, { H2: '2-2', H3: '3' })
    .then((i) => i.json());

  expect(response).toStrictEqual({ pong: 'success' });
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith('https://mytest.com/ping', {
    headers: { 'User-Agent': 'blockchain-libs', H1: '1', H2: '2-2', H3: '3' },
    signal: expect.anything(),
  });
});

test('Assemble headers - POST', async () => {
  const response = await new RestfulRequest('https://mytest.com', {
    H1: '1',
    H2: '2',
  })
    .post('/ping', undefined, false, { H2: '2-2', H3: '3' })
    .then((i) => i.json());

  expect(response).toStrictEqual({ pong: 'success' });
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith('https://mytest.com/ping', {
    headers: { 'User-Agent': 'blockchain-libs', H1: '1', H2: '2-2', H3: '3' },
    method: 'POST',
    body: '',
    signal: expect.anything(),
  });
});
