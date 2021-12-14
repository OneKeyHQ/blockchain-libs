import BigNumber from 'bignumber.js';
import { Response } from 'cross-fetch';
import { mocked } from 'ts-jest/utils';

import { ResponseError } from '../../../../src/basic/request/exceptions';
import { RestfulRequest } from '../../../../src/basic/request/restful';
import { Algod } from '../../../../src/provider/chains/algo';
import { TransactionStatus } from '../../../../src/types/provider';

jest.mock('../../../../src/basic/request/restful');

const mockRestfulClass = mocked(RestfulRequest, true);

const algod = new Algod('https://myalgo.com/api', {
  url: 'https://myalgo.com/indexer',
});
const [restful, indexer] = mockRestfulClass.mock.instances as Array<any>;

test('getInfo', async () => {
  restful.get.mockReturnValueOnce(
    Promise.resolve(
      new Response(
        JSON.stringify({
          'catchup-time': 0,
          'last-round': 17618995,
          'time-since-last-round': 4111396793,
        }),
      ),
    ),
  );

  await expect(algod.getInfo()).resolves.toStrictEqual({
    bestBlockNumber: 17618995,
    isReady: true,
  });
  expect(restful.get).toHaveBeenCalledWith('/v2/status');
});

test('getInfo but not ready', async () => {
  restful.get.mockReturnValueOnce(
    Promise.resolve(
      new Response(
        JSON.stringify({
          'catchup-time': 0,
          'last-round': 17618995,
          'time-since-last-round': 60 * 1e9,
        }),
      ),
    ),
  );

  await expect(algod.getInfo()).resolves.toStrictEqual({
    bestBlockNumber: 17618995,
    isReady: false,
  });
  expect(restful.get).toHaveBeenCalledWith('/v2/status');
});

test('getAddresses', async () => {
  restful.get
    .mockReturnValueOnce(
      Promise.resolve(
        new Response(
          JSON.stringify({
            amount: 3708275815,
          }),
        ),
      ),
    )
    .mockReturnValueOnce(Promise.reject(Error))
    .mockReturnValueOnce(
      Promise.resolve(
        new Response(
          JSON.stringify({
            amount: 0,
            assets: [
              {
                amount: 100000000000,
                'asset-id': 2254146,
                creator:
                  '2QGB6FMYJ6XHVBXAQKCNXZTSLAF4YXJRHSVELAXEE4HLPQAIKSJXUBW654',
                'is-frozen': false,
              },
            ],
          }),
        ),
      ),
    )
    .mockReturnValueOnce(Promise.resolve(new Response(JSON.stringify({}))));

  await expect(
    algod.getAddresses([
      'C7RYOGEWDT7HZM3HKPSMU7QGWTRWR3EPOQTJ2OHXGYLARD3X62DNWELS34',
      '2QGB6FMYJ6XHVBXAQKCNXZTSLAF4YXJRHSVELAXEE4HLPQAIKSJXUBW654',
      '6KRBCIZBFF2BJHGOROIJ2UUXUU6D5QV7F4XZPV2IHJF2QCKMU7S4ECYHUA',
      'GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A',
    ]),
  ).resolves.toStrictEqual([
    { balance: new BigNumber(3708275815), existing: true },
    undefined,
    { balance: new BigNumber(0), existing: true },
    { balance: new BigNumber(0), existing: false },
  ]);

  expect(restful.get.mock.calls).toEqual([
    ['/v2/accounts/C7RYOGEWDT7HZM3HKPSMU7QGWTRWR3EPOQTJ2OHXGYLARD3X62DNWELS34'],
    ['/v2/accounts/2QGB6FMYJ6XHVBXAQKCNXZTSLAF4YXJRHSVELAXEE4HLPQAIKSJXUBW654'],
    ['/v2/accounts/6KRBCIZBFF2BJHGOROIJ2UUXUU6D5QV7F4XZPV2IHJF2QCKMU7S4ECYHUA'],
    ['/v2/accounts/GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A'],
  ]);
});

test('getBalances', async () => {
  restful.get
    .mockReturnValueOnce(
      Promise.resolve(
        new Response(
          JSON.stringify({
            amount: 3708275815,
          }),
        ),
      ),
    )
    .mockReturnValueOnce(Promise.reject(Error))
    .mockReturnValueOnce(
      Promise.resolve(
        new Response(
          JSON.stringify({
            amount: 0,
            assets: [
              {
                amount: 100000000000,
                'asset-id': 2254146,
                creator:
                  '2QGB6FMYJ6XHVBXAQKCNXZTSLAF4YXJRHSVELAXEE4HLPQAIKSJXUBW654',
                'is-frozen': false,
              },
              {
                amount: 300000000000,
                'asset-id': 2254149,
                creator:
                  '2QGB6FMYJ6XHVBXAQKCNXZTSLAF4YXJRHSVELAXEE4HLPQAIKSJXUBW654',
                'is-frozen': false,
              },
            ],
          }),
        ),
      ),
    )
    .mockReturnValueOnce(
      Promise.resolve(
        new Response(
          JSON.stringify({
            amount: 0,
            assets: [
              {
                amount: 100000000000,
                'asset-id': 2254146,
                creator:
                  '2QGB6FMYJ6XHVBXAQKCNXZTSLAF4YXJRHSVELAXEE4HLPQAIKSJXUBW654',
                'is-frozen': false,
              },
            ],
          }),
        ),
      ),
    );

  await expect(
    algod.getBalances([
      {
        address: 'C7RYOGEWDT7HZM3HKPSMU7QGWTRWR3EPOQTJ2OHXGYLARD3X62DNWELS34',
        coin: {},
      },
      {
        address: '2QGB6FMYJ6XHVBXAQKCNXZTSLAF4YXJRHSVELAXEE4HLPQAIKSJXUBW654',
        coin: { tokenAddress: '2254149' },
      },
      {
        address: '6KRBCIZBFF2BJHGOROIJ2UUXUU6D5QV7F4XZPV2IHJF2QCKMU7S4ECYHUA',
        coin: { tokenAddress: '2254149' },
      },
      {
        address: 'GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A',
        coin: { tokenAddress: '2254149' },
      },
    ]),
  ).resolves.toStrictEqual([
    new BigNumber(3708275815),
    undefined,
    new BigNumber(300000000000),
    new BigNumber(0),
  ]);

  expect(restful.get.mock.calls).toEqual([
    ['/v2/accounts/C7RYOGEWDT7HZM3HKPSMU7QGWTRWR3EPOQTJ2OHXGYLARD3X62DNWELS34'],
    ['/v2/accounts/2QGB6FMYJ6XHVBXAQKCNXZTSLAF4YXJRHSVELAXEE4HLPQAIKSJXUBW654'],
    ['/v2/accounts/6KRBCIZBFF2BJHGOROIJ2UUXUU6D5QV7F4XZPV2IHJF2QCKMU7S4ECYHUA'],
    ['/v2/accounts/GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A'],
  ]);
});

test('getFeePricePerUnit', async () => {
  await expect(algod.getFeePricePerUnit()).resolves.toStrictEqual({
    normal: { price: new BigNumber(1), waitingBlock: 10 },
  });
});

test('getTransactionStatuses', async () => {
  restful.get
    .mockReturnValueOnce(
      Promise.resolve(
        new Response(
          JSON.stringify(
            {
              txn: {
                sig: 'txid1',
              },
            }, // pending
          ),
        ),
      ),
    )
    .mockReturnValueOnce(
      Promise.resolve(
        new Response(
          JSON.stringify({
            'confirmed-round': 17619962,
            txn: {
              sig: 'txid2',
            }, // recently confirmed
          }),
        ),
      ),
    )
    .mockReturnValueOnce(
      Promise.resolve(
        new Response(
          JSON.stringify({
            'pool-error': 'Invalid Tx', // unexpected error
            txn: {
              sig: 'txid3',
            },
          }),
        ),
      ),
    )
    .mockReturnValueOnce(
      Promise.reject(new ResponseError('', new Response('', { status: 400 }))),
    ) // txid4, something wrong on pending api, return undefined directly
    .mockReturnValueOnce(
      Promise.reject(new ResponseError('', new Response('', { status: 404 }))),
    ) // txid5, 404 not found on pending api, try indexer
    .mockReturnValueOnce(
      Promise.reject(new ResponseError('', new Response('', { status: 404 }))),
    ) // txid6, 404 not found on pending api, try indexer
    .mockReturnValueOnce(
      Promise.reject(new ResponseError('', new Response('', { status: 404 }))),
    ); // txid7, 404 not found on pending api, try indexer

  indexer.get
    .mockReturnValueOnce(
      Promise.resolve(
        new Response(
          JSON.stringify({
            transaction: {
              'confirmed-round': 17619962, // txid5, confirmed on indexer
            },
          }),
        ),
      ),
    )
    .mockReturnValueOnce(
      Promise.reject(new ResponseError('', new Response('', { status: 404 }))),
    ) // txid6, 404 not found on indexer
    .mockReturnValueOnce(
      Promise.reject(new ResponseError('', new Response('', { status: 400 }))),
    ); // txid7, something wrong on indexer, return undefined directly

  await expect(
    algod.getTransactionStatuses([
      'txid1',
      'txid2',
      'txid3',
      'txid4',
      'txid5',
      'txid6',
      'txid7',
    ]),
  ).resolves.toStrictEqual([
    TransactionStatus.PENDING,
    TransactionStatus.CONFIRM_AND_SUCCESS,
    TransactionStatus.INVALID,
    undefined,
    TransactionStatus.CONFIRM_AND_SUCCESS,
    TransactionStatus.NOT_FOUND,
    undefined,
  ]);

  expect(restful.get.mock.calls).toEqual([
    ['/v2/transactions/pending/txid1'],
    ['/v2/transactions/pending/txid2'],
    ['/v2/transactions/pending/txid3'],
    ['/v2/transactions/pending/txid4'],
    ['/v2/transactions/pending/txid5'],
    ['/v2/transactions/pending/txid6'],
    ['/v2/transactions/pending/txid7'],
  ]);
  expect(indexer.get.mock.calls).toEqual([
    ['/v2/transactions/txid5'],
    ['/v2/transactions/txid6'],
    ['/v2/transactions/txid7'],
  ]);
});

test('broadcastTransaction', async () => {
  restful.post
    .mockReturnValueOnce(
      Promise.resolve({
        txid: 'FXCX7KGHFIHI3TCFQGS5WG4WWCMGGK6XD5HR6IA6TSQFR62DGLEA',
      }),
    )
    .mockReturnValueOnce(
      Promise.resolve({
        txid: '',
      }),
    )
    .mockReturnValueOnce(Promise.reject(new Error('Mock Error')));

  await expect(algod.broadcastTransaction('AA==')).resolves.toBe(true);
  await expect(algod.broadcastTransaction('AQ==')).resolves.toBe(false);
  await expect(algod.broadcastTransaction('Ag==')).rejects.toThrow(
    'Mock Error',
  );

  expect(restful.post.mock.calls).toEqual([
    [
      '/v2/transactions',
      '00',
      false,
      { 'Content-Type': 'application/x-binary' },
    ],
    [
      '/v2/transactions',
      '01',
      false,
      { 'Content-Type': 'application/x-binary' },
    ],
    [
      '/v2/transactions',
      '02',
      false,
      { 'Content-Type': 'application/x-binary' },
    ],
  ]);
});

test('getSuggestedParams', async () => {
  restful.get.mockReturnValueOnce(
    Promise.resolve(
      new Response(
        JSON.stringify({
          'consensus-version':
            'https://github.com/algorandfoundation/specs/tree/bc36005dbd776e6d1eaf0c560619bb183215645c',
          fee: 0,
          'genesis-hash': 'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=',
          'genesis-id': 'mainnet-v1.0',
          'last-round': 17619962,
          'min-fee': 1000,
        }),
      ),
    ),
  );

  await expect(algod.getSuggestedParams()).resolves.toStrictEqual({
    flatFee: false,
    fee: 0,
    firstRound: 17619962,
    lastRound: 17619962 + 1000,
    genesisID: 'mainnet-v1.0',
    genesisHash: 'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=',
  });

  expect(restful.get).toHaveBeenCalledWith('/v2/transactions/params');
});
