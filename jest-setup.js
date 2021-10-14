const fakeFetch = jest.fn();

jest.mock('cross-fetch', () => ({
  __esModule: true,
  ...jest.requireActual('cross-fetch'),
  default: fakeFetch,
  fetch: fakeFetch,
}));
