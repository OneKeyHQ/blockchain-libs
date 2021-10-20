import BigNumber from 'bignumber.js';
import { mocked } from 'ts-jest/utils';

import { JsonRPCRequest } from '../../../../src/basic/request/json-rpc';
import { Geth } from '../../../../src/provider/chains/eth';
import { TransactionStatus } from '../../../../src/types/provider';

jest.mock('../../../../src/basic/request/json-rpc');
const mockRPCClass = mocked(JsonRPCRequest, true);

let geth: Geth;
let rpc: any;

beforeEach(() => {
  geth = new Geth('https://myeth.com/rpc');
  rpc = mockRPCClass.mock.instances[0];
});

test('getInfo', async () => {
  rpc.call.mockReturnValueOnce(Promise.resolve({ number: '0x1fbd0' }));
  await expect(geth.getInfo()).resolves.toStrictEqual({
    bestBlockNumber: 130000,
    isReady: true,
  });

  expect(rpc.call).toHaveBeenCalledTimes(1);
  expect(rpc.call).toHaveBeenCalledWith('eth_getBlockByNumber', [
    Geth.__LAST_BLOCK__,
    false,
  ]);
});

test('getAddresses', async () => {
  rpc.batchCall.mockReturnValueOnce(
    Promise.resolve(['0x3e9', '0xa', '0x', '0x1', '0x0', '0x0']),
  );

  await expect(
    geth.getAddresses(['fake_address1', 'fake_address2', 'fake_address3']),
  ).resolves.toStrictEqual([
    {
      balance: new BigNumber('0x3e9'),
      nonce: 0xa,
      existing: true,
    },
    undefined,
    {
      balance: new BigNumber(0),
      nonce: 0,
      existing: false,
    },
  ]);

  expect(rpc.batchCall).toHaveBeenCalledWith(
    [
      ['eth_getBalance', ['fake_address1', Geth.__LAST_BLOCK__]],
      ['eth_getTransactionCount', ['fake_address1', Geth.__LAST_BLOCK__]],
      ['eth_getBalance', ['fake_address2', Geth.__LAST_BLOCK__]],
      ['eth_getTransactionCount', ['fake_address2', Geth.__LAST_BLOCK__]],
      ['eth_getBalance', ['fake_address3', Geth.__LAST_BLOCK__]],
      ['eth_getTransactionCount', ['fake_address3', Geth.__LAST_BLOCK__]],
    ],
    undefined,
    undefined,
    true,
  );
});

test('getBalances', async () => {
  rpc.batchCall.mockReturnValueOnce(
    Promise.resolve([
      '0xa',
      '0x00000000000000000000000000000000000000000000000145bbf9af1e414ec7',
      '0x',
      undefined,
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ]),
  );

  await expect(
    geth.getBalances([
      {
        address: '0x1000000000000000000000000000000000000001',
        coin: {},
      },
      {
        address: '0x1000000000000000000000000000000000000001',
        coin: { tokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1' },
      },
      {
        address: '0x1000000000000000000000000000000000000001',
        coin: { tokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2' },
      },
      {
        address: '0x1000000000000000000000000000000000000001',
        coin: { tokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3' },
      },
      {
        address: '0x1000000000000000000000000000000000000001',
        coin: { tokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee4' },
      },
    ]),
  ).resolves.toStrictEqual([
    new BigNumber('0xa'),
    new BigNumber('0x145bbf9af1e414ec7'),
    undefined,
    undefined,
    new BigNumber(0),
  ]);

  expect(rpc.batchCall).toHaveBeenCalledWith(
    [
      [
        'eth_getBalance',
        ['0x1000000000000000000000000000000000000001', Geth.__LAST_BLOCK__],
      ],
      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1',
            data: '0x70a082310000000000000000000000001000000000000000000000000000000000000001',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],
      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2',
            data: '0x70a082310000000000000000000000001000000000000000000000000000000000000001',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],
      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3',
            data: '0x70a082310000000000000000000000001000000000000000000000000000000000000001',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],
      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee4',
            data: '0x70a082310000000000000000000000001000000000000000000000000000000000000001',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],
    ],
    undefined,
    undefined,
    true,
  );
});

test('getTransactionStatuses', async () => {
  rpc.batchCall.mockReturnValueOnce(
    Promise.resolve([
      { hash: '0x01' },
      { hash: '0x01', status: '0x1' },

      { hash: '0x02' },
      { hash: '0x02', status: '0x0' },

      null,
      null,

      { hash: '0x04' },
      undefined,

      { hash: '0x05' },
      null,
    ]),
  );

  await expect(
    geth.getTransactionStatuses(['0x01', '0x02', '0x03', '0x04', '0x05']),
  ).resolves.toStrictEqual([
    TransactionStatus.CONFIRM_AND_SUCCESS,
    TransactionStatus.CONFIRM_BUT_FAILED,
    TransactionStatus.NOT_FOUND,
    undefined,
    TransactionStatus.PENDING,
  ]);

  expect(rpc.batchCall).toHaveBeenCalledWith(
    [
      ['eth_getTransactionByHash', ['0x01']],
      ['eth_getTransactionReceipt', ['0x01']],
      ['eth_getTransactionByHash', ['0x02']],
      ['eth_getTransactionReceipt', ['0x02']],
      ['eth_getTransactionByHash', ['0x03']],
      ['eth_getTransactionReceipt', ['0x03']],
      ['eth_getTransactionByHash', ['0x04']],
      ['eth_getTransactionReceipt', ['0x04']],
      ['eth_getTransactionByHash', ['0x05']],
      ['eth_getTransactionReceipt', ['0x05']],
    ],
    undefined,
    undefined,
    true,
  );
});

test('getTokenInfos', async () => {
  rpc.batchCall.mockReturnValueOnce(
    Promise.resolve([
      '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000025441000000000000000000000000000000000000000000000000000000000000',
      '0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000006546f6b656e410000000000000000000000000000000000000000000000000000',
      '0x12',

      '0x', // invalid
      '0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000006546f6b656e420000000000000000000000000000000000000000000000000000',
      '0x12',

      '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000025443000000000000000000000000000000000000000000000000000000000000',
      '0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000006546f6b656e430000000000000000000000000000000000000000000000000000',
      '0x', // invalid

      undefined, // invalid
      '0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000006546f6b656e440000000000000000000000000000000000000000000000000000',
      '0x12',

      '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000025445000000000000000000000000000000000000000000000000000000000000',
      '0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000006546f6b656e450000000000000000000000000000000000000000000000000000',
      '0x8',
    ]),
  );

  await expect(
    geth.getTokenInfos([
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1',
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2',
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3',
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee4',
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee5',
    ]),
  ).resolves.toStrictEqual([
    { symbol: 'TA', name: 'TokenA', decimals: 18 },
    undefined,
    undefined,
    undefined,
    { symbol: 'TE', name: 'TokenE', decimals: 8 },
  ]);

  expect(rpc.batchCall).toHaveBeenCalledWith(
    [
      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1',
            data: '0x95d89b41',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],
      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1',
            data: '0x06fdde03',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],
      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1',
            data: '0x313ce567',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],

      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2',
            data: '0x95d89b41',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],
      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2',
            data: '0x06fdde03',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],
      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2',
            data: '0x313ce567',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],

      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3',
            data: '0x95d89b41',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],
      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3',
            data: '0x06fdde03',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],
      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3',
            data: '0x313ce567',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],

      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee4',
            data: '0x95d89b41',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],
      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee4',
            data: '0x06fdde03',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],
      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee4',
            data: '0x313ce567',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],

      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee5',
            data: '0x95d89b41',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],
      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee5',
            data: '0x06fdde03',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],
      [
        'eth_call',
        [
          {
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee5',
            data: '0x313ce567',
          },
          Geth.__LAST_BLOCK__,
        ],
      ],
    ],
    undefined,
    undefined,
    true,
  );
});

test('getFeePricePerUnit', async () => {
  rpc.call.mockReturnValueOnce(Promise.resolve('0x9502f9000'));

  await expect(geth.getFeePricePerUnit()).resolves.toStrictEqual({
    normal: { price: new BigNumber(50000000000), waitingBlock: 4 },
    others: [
      { price: new BigNumber(40000000000), waitingBlock: 40 },
      { price: new BigNumber(60000000000), waitingBlock: 1 },
    ],
  });

  expect(rpc.call).toHaveBeenCalledWith('eth_gasPrice', []);
});

test('broadcastTransaction', async () => {
  rpc.call.mockReturnValueOnce(
    Promise.resolve(
      '0x1111111111111111111111111111111111111111111111111111111111111111',
    ),
  );

  await expect(geth.broadcastTransaction('fake_raw_tx')).resolves.toBe(true);

  expect(rpc.call).toHaveBeenCalledWith('eth_sendRawTransaction', [
    'fake_raw_tx',
  ]);
});

test('estimateGasLimit', async () => {
  rpc.call.mockReturnValueOnce(Promise.resolve('0x30d40'));

  await expect(
    geth.estimateGasLimit('fake_address1', 'fake_address2', '0x01', '0x010203'),
  ).resolves.toBe('0x30d40');

  expect(rpc.call).toHaveBeenCalledWith('eth_estimateGas', [
    {
      from: 'fake_address1',
      to: 'fake_address2',
      value: '0x01',
      data: '0x010203',
    },
  ]);
});

test('isContract', async () => {
  rpc.call.mockReturnValueOnce(Promise.resolve('0x010203...04'));

  await expect(geth.isContract('fake_address')).resolves.toBe(true);
  expect(rpc.call).toHaveBeenCalledWith('eth_getCode', [
    'fake_address',
    Geth.__LAST_BLOCK__,
  ]);

  rpc.call.mockReturnValueOnce(Promise.resolve('0x'));
  await expect(geth.isContract('fake_address')).resolves.toBe(false);
});
