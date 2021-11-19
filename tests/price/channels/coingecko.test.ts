import BigNumber from 'bignumber.js';
import { Response } from 'cross-fetch';

import { Coingecko } from '../../../src/price/channels/coingecko';

const cgk = new Coingecko();
const fakeApi = jest.fn();

beforeEach(() => {
  cgk.fetchApi = fakeApi;
});

test('fetch btc prices', async () => {
  fakeApi.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        rates: {
          btc: {
            name: 'Bitcoin',
            unit: 'BTC',
            value: 1.0,
            type: 'crypto',
          },
          eth: {
            name: 'Ether',
            unit: 'ETH',
            value: 14.149,
            type: 'crypto',
          },
          usd: {
            name: 'US Dollar',
            unit: '$',
            value: 61643.849,
            type: 'fiat',
          },
          aed: {
            name: 'United Arab Emirates Dirham',
            unit: 'DH',
            value: 226424.024,
            type: 'fiat',
          },
          ars: {
            name: 'Argentine Peso',
            unit: '$',
            value: 6150098.406,
            type: 'fiat',
          },
          aud: {
            name: 'Australian Dollar',
            unit: 'A$',
            value: 82519.539,
            type: 'fiat',
          },
          bdt: {
            name: 'Bangladeshi Taka',
            unit: '৳',
            value: 5269806.539,
            type: 'fiat',
          },
          bhd: {
            name: 'Bahraini Dinar',
            unit: 'BD',
            value: 23240.286,
            type: 'fiat',
          },
          bmd: {
            name: 'Bermudian Dollar',
            unit: '$',
            value: 61643.849,
            type: 'fiat',
          },
          brl: {
            name: 'Brazil Real',
            unit: 'R$',
            value: 350143.231,
            type: 'fiat',
          },
          cad: {
            name: 'Canadian Dollar',
            unit: 'CA$',
            value: 76386.469,
            type: 'fiat',
          },
          chf: {
            name: 'Swiss Franc',
            unit: 'Fr.',
            value: 56076.238,
            type: 'fiat',
          },
          clp: {
            name: 'Chilean Peso',
            unit: 'CLP$',
            value: 50064052.658,
            type: 'fiat',
          },
          cny: {
            name: 'Chinese Yuan',
            unit: '¥',
            value: 394434.337,
            type: 'fiat',
          },
          czk: {
            name: 'Czech Koruna',
            unit: 'Kč',
            value: 1358698.259,
            type: 'fiat',
          },
          dkk: {
            name: 'Danish Krone',
            unit: 'kr.',
            value: 394960.467,
            type: 'fiat',
          },
          eur: {
            name: 'Euro',
            unit: '€',
            value: 53089.286,
            type: 'fiat',
          },
          gbp: {
            name: 'British Pound Sterling',
            unit: '£',
            value: 45111.092,
            type: 'fiat',
          },
          hkd: {
            name: 'Hong Kong Dollar',
            unit: 'HK$',
            value: 479706.891,
            type: 'fiat',
          },
          huf: {
            name: 'Hungarian Forint',
            unit: 'Ft',
            value: 19134992.754,
            type: 'fiat',
          },
          idr: {
            name: 'Indonesian Rupiah',
            unit: 'Rp',
            value: 878933422.173,
            type: 'fiat',
          },
          ils: {
            name: 'Israeli New Shekel',
            unit: '₪',
            value: 191427.578,
            type: 'fiat',
          },
          inr: {
            name: 'Indian Rupee',
            unit: '₹',
            value: 4607477.091,
            type: 'fiat',
          },
          jpy: {
            name: 'Japanese Yen',
            unit: '¥',
            value: 7006871.481,
            type: 'fiat',
          },
          krw: {
            name: 'South Korean Won',
            unit: '₩',
            value: 72417178.375,
            type: 'fiat',
          },
          kwd: {
            name: 'Kuwaiti Dinar',
            unit: 'KD',
            value: 18596.593,
            type: 'fiat',
          },
          lkr: {
            name: 'Sri Lankan Rupee',
            unit: 'Rs',
            value: 12448933.251,
            type: 'fiat',
          },
          mmk: {
            name: 'Burmese Kyat',
            unit: 'K',
            value: 111104556.55,
            type: 'fiat',
          },
          mxn: {
            name: 'Mexican Peso',
            unit: 'MX$',
            value: 1286493.523,
            type: 'fiat',
          },
          myr: {
            name: 'Malaysian Ringgit',
            unit: 'RM',
            value: 255760.333,
            type: 'fiat',
          },
          ngn: {
            name: 'Nigerian Naira',
            unit: '₦',
            value: 25447814.096,
            type: 'fiat',
          },
          nok: {
            name: 'Norwegian Krone',
            unit: 'kr',
            value: 518085.736,
            type: 'fiat',
          },
          nzd: {
            name: 'New Zealand Dollar',
            unit: 'NZ$',
            value: 85989.225,
            type: 'fiat',
          },
          php: {
            name: 'Philippine Peso',
            unit: '₱',
            value: 3109962.985,
            type: 'fiat',
          },
          pkr: {
            name: 'Pakistani Rupee',
            unit: '₨',
            value: 10575396.161,
            type: 'fiat',
          },
          pln: {
            name: 'Polish Zloty',
            unit: 'zł',
            value: 245092.864,
            type: 'fiat',
          },
          rub: {
            name: 'Russian Ruble',
            unit: '₽',
            value: 4408552.388,
            type: 'fiat',
          },
          sar: {
            name: 'Saudi Riyal',
            unit: 'SR',
            value: 231225.526,
            type: 'fiat',
          },
          sek: {
            name: 'Swedish Krona',
            unit: 'kr',
            value: 525763.477,
            type: 'fiat',
          },
          sgd: {
            name: 'Singapore Dollar',
            unit: 'S$',
            value: 83053.991,
            type: 'fiat',
          },
          thb: {
            name: 'Thai Baht',
            unit: '฿',
            value: 2051507.323,
            type: 'fiat',
          },
          try: {
            name: 'Turkish Lira',
            unit: '₺',
            value: 588151.8,
            type: 'fiat',
          },
          twd: {
            name: 'New Taiwan Dollar',
            unit: 'NT$',
            value: 1716670.259,
            type: 'fiat',
          },
          uah: {
            name: 'Ukrainian hryvnia',
            unit: '₴',
            value: 1617951.024,
            type: 'fiat',
          },
          vef: {
            name: 'Venezuelan bolívar fuerte',
            unit: 'Bs.F',
            value: 6172.398,
            type: 'fiat',
          },
          vnd: {
            name: 'Vietnamese đồng',
            unit: '₫',
            value: 1397825329.508,
            type: 'fiat',
          },
          zar: {
            name: 'South African Rand',
            unit: 'R',
            value: 950377.411,
            type: 'fiat',
          },
          xdr: {
            name: 'IMF Special Drawing Rights',
            unit: 'XDR',
            value: 43835.311,
            type: 'fiat',
          },
        },
      }),
    ),
  );
  await expect(cgk.fetchBTCPrices()).resolves.toStrictEqual([
    { coin: 'btc', unit: 'usd', value: new BigNumber('61643.849') },
    { coin: 'btc', unit: 'aud', value: new BigNumber('82519.539') },
    { coin: 'btc', unit: 'cny', value: new BigNumber('394434.337') },
    { coin: 'btc', unit: 'eur', value: new BigNumber('53089.286') },
    { coin: 'btc', unit: 'gbp', value: new BigNumber('45111.092') },
    { coin: 'btc', unit: 'hkd', value: new BigNumber('479706.891') },
    { coin: 'btc', unit: 'inr', value: new BigNumber('4607477.091') },
    { coin: 'btc', unit: 'jpy', value: new BigNumber('7006871.481') },
    { coin: 'btc', unit: 'krw', value: new BigNumber('72417178.375') },
    { coin: 'btc', unit: 'myr', value: new BigNumber('255760.333') },
  ]);
});

test('fetch cgk-ids prices', async () => {
  fakeApi.mockResolvedValueOnce(
    new Response(
      JSON.stringify([
        {
          id: 'ethereum',
          current_price: 0.07116,
        },
        {
          id: 'binancecoin',
          current_price: 0.00940522,
        },
      ]),
    ),
  );

  await expect(
    cgk.fetchCGKIdsPrices({
      ethereum: 'eth',
      binancecoin: 'bsc',
    }),
  ).resolves.toStrictEqual([
    { coin: 'eth', unit: 'btc', value: new BigNumber('0.07116') },
    { coin: 'bsc', unit: 'btc', value: new BigNumber('0.00940522') },
  ]);
});

test('fetch erc20 prices', async () => {
  fakeApi.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': {
          btc: 0.00041058,
        },
        '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': {
          btc: 0.0006,
        },
      }),
    ),
  );
  const coins: any = [
    {
      code: 'eth_uni',
      tokenAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    },
    {
      code: 'eth_aave',
      tokenAddress: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    },
  ];
  await expect(cgk.fetchERC20Prices(coins)).resolves.toStrictEqual([
    { coin: 'eth_uni', unit: 'btc', value: new BigNumber('0.00041058') },
    { coin: 'eth_aave', unit: 'btc', value: new BigNumber('0.0006') },
  ]);
});
