import BigNumber from 'bignumber.js';

import { PriceController } from '../../src/price';
import { CoinInfo } from '../../src/types/chain';

const providerController: any = {
  getClient: jest.fn(),
};
const storage: any = {
  get: jest.fn(),
  set: jest.fn(),
};
const priceController = new PriceController(providerController, storage);
const channel1: any = {
  pricing: jest.fn(),
};
const channel2: any = {
  pricing: jest.fn(),
};
const channel3: any = {
  pricing: jest.fn(),
};

const coin = (info: Partial<CoinInfo>) => info as CoinInfo;

beforeEach(() => {
  priceController.initChannels = jest
    .fn()
    .mockReturnValue([channel1, channel2, channel3]);
});

test('initialize channels only once', () => {
  expect(priceController.channels).toStrictEqual([
    channel1,
    channel2,
    channel3,
  ]);
  priceController.channels;
  priceController.channels; // call three times
  expect(priceController.initChannels).toHaveBeenCalledTimes(1);
});

test('get price with the same coin and unit', async () => {
  await expect(
    priceController.getPriceNoCache(coin({ code: 'btc' }), 'btc'),
  ).resolves.toStrictEqual(new BigNumber(1));
  await expect(
    priceController.getPriceNoCache(coin({ code: 'eth' }), 'eth'),
  ).resolves.toStrictEqual(new BigNumber(1));
  await expect(
    priceController.getPriceNoCache(coin({ code: 'eth_uni' }), 'eth_uni'),
  ).resolves.toStrictEqual(new BigNumber(1));
  expect(storage.get).not.toBeCalled();
});

test('get price of btc', async () => {
  storage.get.mockResolvedValue(['80000', undefined]);
  await expect(
    priceController.getPriceNoCache(coin({ code: 'btc' }), 'usd'),
  ).resolves.toStrictEqual(new BigNumber('80000'));
  expect(storage.get).toHaveBeenCalledWith(['PRICE-BTC-USD', 'PRICE-USD-BTC']);
  expect(storage.set).not.toHaveBeenCalled();
  expect(providerController.getClient).not.toHaveBeenCalled();
});

test('get price of btc - 2', async () => {
  storage.get.mockResolvedValue([undefined, '0.0000125']);
  await expect(
    priceController.getPriceNoCache(coin({ code: 'btc' }), 'usd'),
  ).resolves.toStrictEqual(new BigNumber('80000'));
  expect(storage.get).toHaveBeenCalledWith(['PRICE-BTC-USD', 'PRICE-USD-BTC']);
  expect(storage.set).not.toHaveBeenCalled();
  expect(providerController.getClient).not.toHaveBeenCalled();
});

test('get price of eth directly', async () => {
  // eth-usd => 8000
  // eth-btc-usd => 8100
  // use eth-usd directly
  storage.get.mockResolvedValue([
    '8000',
    undefined,
    '0.10125',
    '9.876543209876543',
    '80000',
    undefined,
  ]);
  await expect(
    priceController.getPriceNoCache(
      coin({ code: 'eth', chainCode: 'eth' }),
      'usd',
    ),
  ).resolves.toStrictEqual(new BigNumber('8000'));
  expect(storage.get).toHaveBeenCalledWith([
    'PRICE-ETH-USD',
    'PRICE-USD-ETH',
    'PRICE-ETH-BTC',
    'PRICE-BTC-ETH',
    'PRICE-BTC-USD',
    'PRICE-USD-BTC',
  ]);
  expect(storage.set).not.toHaveBeenCalled();
  expect(providerController.getClient).not.toHaveBeenCalled();
});

test('get price of eth through btc', async () => {
  storage.get.mockResolvedValue([
    undefined,
    undefined,
    '0.10125',
    '9.876543209876543',
    '80000',
    undefined,
  ]);
  await expect(
    priceController.getPriceNoCache(
      coin({ code: 'eth', chainCode: 'eth' }),
      'usd',
    ),
  ).resolves.toStrictEqual(new BigNumber('8100'));
  expect(storage.get).toHaveBeenCalledWith([
    'PRICE-ETH-USD',
    'PRICE-USD-ETH',
    'PRICE-ETH-BTC',
    'PRICE-BTC-ETH',
    'PRICE-BTC-USD',
    'PRICE-USD-BTC',
  ]);
  expect(storage.set).not.toHaveBeenCalled();
  expect(providerController.getClient).not.toHaveBeenCalled();
});

test('get price of eth-uni directly', async () => {
  storage.get.mockResolvedValue([
    '80',
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
  ]);
  await expect(
    priceController.getPriceNoCache(
      coin({ code: 'eth_uni', chainCode: 'eth' }),
      'usd',
    ),
  ).resolves.toStrictEqual(new BigNumber('80'));
  expect(storage.get).toHaveBeenCalledWith([
    'PRICE-ETH_UNI-USD',
    'PRICE-USD-ETH_UNI',
    'PRICE-ETH_UNI-BTC',
    'PRICE-BTC-ETH_UNI',
    'PRICE-BTC-USD',
    'PRICE-USD-BTC',
    'PRICE-ETH_UNI-ETH',
    'PRICE-ETH-ETH_UNI',
    'PRICE-ETH-USD',
    'PRICE-USD-ETH',
    'PRICE-ETH-BTC',
    'PRICE-BTC-ETH',
  ]);
  expect(storage.set).not.toHaveBeenCalled();
  expect(providerController.getClient).not.toHaveBeenCalled();
});

test('get price of eth-uni through eth and btc', async () => {
  storage.get.mockResolvedValue([
    undefined,
    undefined,
    undefined,
    undefined,
    '80000',
    undefined,
    '0.01',
    undefined,
    undefined,
    undefined,
    undefined,
    '10',
  ]);
  await expect(
    priceController.getPriceNoCache(
      coin({ code: 'eth_uni', chainCode: 'eth' }),
      'usd',
    ),
  ).resolves.toStrictEqual(new BigNumber('80'));
  expect(storage.get).toHaveBeenCalledWith([
    'PRICE-ETH_UNI-USD',
    'PRICE-USD-ETH_UNI',
    'PRICE-ETH_UNI-BTC',
    'PRICE-BTC-ETH_UNI',
    'PRICE-BTC-USD',
    'PRICE-USD-BTC',
    'PRICE-ETH_UNI-ETH',
    'PRICE-ETH-ETH_UNI',
    'PRICE-ETH-USD',
    'PRICE-USD-ETH',
    'PRICE-ETH-BTC',
    'PRICE-BTC-ETH',
  ]);
  expect(storage.set).not.toHaveBeenCalled();
  expect(providerController.getClient).not.toHaveBeenCalled();
});

test('get price with cache', async () => {
  jest.useFakeTimers();
  storage.get.mockResolvedValue(['80000', undefined]);

  jest.setSystemTime(new Date(1600000000000));
  await expect(
    priceController.getPrice(coin({ code: 'btc' }), 'usd'),
  ).resolves.toStrictEqual(new BigNumber('80000'));
  expect(storage.get).toHaveBeenCalledWith(['PRICE-BTC-USD', 'PRICE-USD-BTC']);

  jest.clearAllMocks();
  jest.setSystemTime(new Date(1600000300000));
  await expect(
    priceController.getPrice(coin({ code: 'btc' }), 'usd'),
  ).resolves.toStrictEqual(new BigNumber('80000'));
  expect(storage.get).not.toBeCalled();

  jest.clearAllMocks();
  jest.setSystemTime(new Date(1600000300000 + 1));
  await expect(
    priceController.getPrice(coin({ code: 'btc' }), 'usd'),
  ).resolves.toStrictEqual(new BigNumber('80000'));
  expect(storage.get).toHaveBeenCalledWith(['PRICE-BTC-USD', 'PRICE-USD-BTC']);
});

test('pricing', async () => {
  storage.set
    .mockResolvedValueOnce('success')
    .mockResolvedValueOnce('success')
    .mockRejectedValue('error');

  channel1.pricing.mockResolvedValue([
    {
      coin: 'btc',
      unit: 'usd',
      value: new BigNumber('80000'),
    },
    {
      coin: 'eth',
      unit: 'usd',
      value: new BigNumber('8000'),
    },
  ]);
  channel2.pricing.mockResolvedValue([
    {
      coin: 'eth',
      unit: 'usd',
      value: new BigNumber('8100'),
    },
    {
      coin: 'eth_uni',
      unit: 'eth',
      value: new BigNumber('0.01'),
    },
  ]);
  channel3.pricing.mockRejectedValue(new Error('Network Error'));

  const coins = [
    coin({ code: 'btc' }),
    coin({ code: 'eth' }),
    coin({ code: 'eth_uni' }),
    coin({ code: 'eth_aave' }),
  ];
  await priceController.pricing(coins);
  expect(storage.set.mock.calls).toEqual([
    ['PRICE-BTC-USD', '80000'],
    ['PRICE-ETH-USD', '8050'],
    ['PRICE-ETH_UNI-ETH', '0.01'],
  ]);
});
