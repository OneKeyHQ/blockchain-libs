import BigNumber from 'bignumber.js';

import { JsonPRCResponseError } from '../../../../src/basic/request/exceptions';
import { JsonRPCRequest } from '../../../../src/basic/request/json-rpc';
import { Conflux } from '../../../../src/provider/chains/cfx';
import { TransactionStatus } from '../../../../src/types/provider';

jest.mock('../../../../src/basic/request/json-rpc');

const mockRPCClass = JsonRPCRequest as jest.MockedClass<typeof JsonRPCRequest>;

let conflux: Conflux;
let mockedRPC: any;

beforeEach(() => {
  mockRPCClass.mockClear();
  conflux = new Conflux('https://conflux.mock/rpc');
  expect(mockRPCClass).toHaveBeenCalledTimes(1);
  mockedRPC = mockRPCClass.mock.instances[0];
});

test('getInfo', async () => {
  mockedRPC.call.mockReturnValueOnce(
    Promise.resolve({ epochNumber: '0x1fbd0' }),
  );
  await expect(conflux.getInfo()).resolves.toStrictEqual({
    bestBlockNumber: 130000,
    isReady: true,
  });

  expect(mockedRPC.call).toHaveBeenCalledTimes(1);
  expect(mockedRPC.call).toHaveBeenCalledWith('cfx_getBlockByEpochNumber', [
    Conflux.__EPOCH_TAG__,
    false,
  ]);
});

test('getAddresses', async () => {
  mockedRPC.batchCall.mockReturnValueOnce(
    Promise.resolve(['0x3e9', '0xa', '0x', '0x1', '0x0', '0x0']),
  );

  await expect(
    conflux.getAddresses(['fake_address1', 'fake_address2', 'fake_address3']),
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

  expect(mockedRPC.batchCall).toHaveBeenCalledWith(
    [
      ['cfx_getBalance', ['fake_address1', Conflux.__EPOCH_TAG__]],
      ['cfx_getTransactionCount', ['fake_address1', Conflux.__EPOCH_TAG__]],
      ['cfx_getBalance', ['fake_address2', Conflux.__EPOCH_TAG__]],
      ['cfx_getTransactionCount', ['fake_address2', Conflux.__EPOCH_TAG__]],
      ['cfx_getBalance', ['fake_address3', Conflux.__EPOCH_TAG__]],
      ['cfx_getTransactionCount', ['fake_address3', Conflux.__EPOCH_TAG__]],
    ],
    undefined,
    undefined,
    true,
  );
});

test('getBalances', async () => {
  mockedRPC.batchCall.mockReturnValueOnce(
    Promise.resolve([
      '0xa',
      '0x00000000000000000000000000000000000000000000000145bbf9af1e414ec7',
    ]),
  );

  await expect(
    conflux.getBalances([
      {
        address: 'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp',
        coin: {},
      },
      {
        address: 'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp',
        coin: {
          tokenAddress: 'cfxtest:acepe88unk7fvs18436178up33hb4zkuf62a9dk1gv',
        },
      },
    ]),
  ).resolves.toStrictEqual([
    new BigNumber('0xa'),
    new BigNumber('0x145bbf9af1e414ec7'),
  ]);

  expect(mockedRPC.batchCall).toHaveBeenCalledWith(
    [
      [
        'cfx_getBalance',
        [
          'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp',
          Conflux.__EPOCH_TAG__,
        ],
      ],
      [
        'cfx_call',
        [
          {
            to: 'cfxtest:acepe88unk7fvs18436178up33hb4zkuf62a9dk1gv',
            data: '0x70a0823100000000000000000000000012d5e47d392b0b3c402b09fc0421752e59621ba8',
          },
          Conflux.__EPOCH_TAG__,
        ],
      ],
    ],
    undefined,
    undefined,
    true,
  );
});

test('getTransactionStatuses', async () => {
  mockedRPC.batchCall.mockReturnValueOnce(
    Promise.resolve([
      { hash: '0x01' },
      { hash: '0x01', outcomeStatus: '0x0' },

      { hash: '0x02' },
      { hash: '0x02', outcomeStatus: '0x1' },

      null,
      null,

      { hash: '0x04' },
      undefined,

      { hash: '0x05' },
      null,
    ]),
  );

  await expect(
    conflux.getTransactionStatuses(['0x01', '0x02', '0x03', '0x04', '0x05']),
  ).resolves.toStrictEqual([
    TransactionStatus.CONFIRM_AND_SUCCESS,
    TransactionStatus.CONFIRM_BUT_FAILED,
    TransactionStatus.NOT_FOUND,
    undefined,
    TransactionStatus.PENDING,
  ]);

  expect(mockedRPC.batchCall).toHaveBeenCalledWith([
    ['cfx_getTransactionByHash', ['0x01']],
    ['cfx_getTransactionReceipt', ['0x01']],
    ['cfx_getTransactionByHash', ['0x02']],
    ['cfx_getTransactionReceipt', ['0x02']],
    ['cfx_getTransactionByHash', ['0x03']],
    ['cfx_getTransactionReceipt', ['0x03']],
    ['cfx_getTransactionByHash', ['0x04']],
    ['cfx_getTransactionReceipt', ['0x04']],
    ['cfx_getTransactionByHash', ['0x05']],
    ['cfx_getTransactionReceipt', ['0x05']],
  ]);
});

test('getTokenInfos', async () => {
  mockedRPC.batchCall.mockReturnValueOnce(
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
    conflux.getTokenInfos([
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

  expect(mockedRPC.batchCall).toHaveBeenCalledWith([
    [
      'cfx_call',
      [
        {
          to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1',
          data: '0x95d89b41',
        },
        Conflux.__EPOCH_TAG__,
      ],
    ],
    [
      'cfx_call',
      [
        {
          to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1',
          data: '0x06fdde03',
        },
        Conflux.__EPOCH_TAG__,
      ],
    ],
    [
      'cfx_call',
      [
        {
          to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1',
          data: '0x313ce567',
        },
        Conflux.__EPOCH_TAG__,
      ],
    ],

    [
      'cfx_call',
      [
        {
          to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2',
          data: '0x95d89b41',
        },
        Conflux.__EPOCH_TAG__,
      ],
    ],
    [
      'cfx_call',
      [
        {
          to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2',
          data: '0x06fdde03',
        },
        Conflux.__EPOCH_TAG__,
      ],
    ],
    [
      'cfx_call',
      [
        {
          to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2',
          data: '0x313ce567',
        },
        Conflux.__EPOCH_TAG__,
      ],
    ],

    [
      'cfx_call',
      [
        {
          to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3',
          data: '0x95d89b41',
        },
        Conflux.__EPOCH_TAG__,
      ],
    ],
    [
      'cfx_call',
      [
        {
          to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3',
          data: '0x06fdde03',
        },
        Conflux.__EPOCH_TAG__,
      ],
    ],
    [
      'cfx_call',
      [
        {
          to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3',
          data: '0x313ce567',
        },
        Conflux.__EPOCH_TAG__,
      ],
    ],

    [
      'cfx_call',
      [
        {
          to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee4',
          data: '0x95d89b41',
        },
        Conflux.__EPOCH_TAG__,
      ],
    ],
    [
      'cfx_call',
      [
        {
          to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee4',
          data: '0x06fdde03',
        },
        Conflux.__EPOCH_TAG__,
      ],
    ],
    [
      'cfx_call',
      [
        {
          to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee4',
          data: '0x313ce567',
        },
        Conflux.__EPOCH_TAG__,
      ],
    ],

    [
      'cfx_call',
      [
        {
          to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee5',
          data: '0x95d89b41',
        },
        Conflux.__EPOCH_TAG__,
      ],
    ],
    [
      'cfx_call',
      [
        {
          to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee5',
          data: '0x06fdde03',
        },
        Conflux.__EPOCH_TAG__,
      ],
    ],
    [
      'cfx_call',
      [
        {
          to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee5',
          data: '0x313ce567',
        },
        Conflux.__EPOCH_TAG__,
      ],
    ],
  ]);
});

test('getFeePricePerUnit', async () => {
  mockedRPC.call.mockReturnValueOnce(Promise.resolve('0x9502f9000'));

  await expect(conflux.getFeePricePerUnit()).resolves.toStrictEqual({
    normal: { price: new BigNumber(50000000000), waitingBlock: 2 },
    others: [
      { price: new BigNumber(40000000000), waitingBlock: 10 },
      { price: new BigNumber(60000000000), waitingBlock: 1 },
    ],
  });

  expect(mockedRPC.call).toHaveBeenCalledWith('cfx_gasPrice', []);
});

test('broadcastTransaction', async () => {
  mockedRPC.call.mockReturnValueOnce(
    Promise.resolve(
      '0x1111111111111111111111111111111111111111111111111111111111111111',
    ),
  );

  await expect(conflux.broadcastTransaction('fake_raw_tx')).resolves.toBe(true);

  expect(mockedRPC.call).toHaveBeenCalledWith('cfx_sendRawTransaction', [
    'fake_raw_tx',
  ]);
});

test('estimateGasLimit', async () => {
  mockedRPC.call.mockReturnValueOnce(
    Promise.resolve({ gasUsed: '0x30d40', storageCollateralized: '0x0' }),
  );

  await expect(
    conflux.estimateGasLimit(
      'fake_address1',
      'fake_address2',
      '0x01',
      '0x010203',
    ),
  ).resolves.toBe('0x30d40');

  expect(mockedRPC.call).toHaveBeenCalledWith('cfx_estimateGasAndCollateral', [
    {
      from: 'fake_address1',
      to: 'fake_address2',
      value: '0x01',
      data: '0x010203',
    },
  ]);
});

describe('isContract', () => {
  test('the input is a contract', async () => {
    mockedRPC.call.mockReturnValueOnce(Promise.resolve('0x010203...04'));
    await expect(conflux.isContract('fake_address')).resolves.toBe(true);
    expect(mockedRPC.call).toHaveBeenCalledWith('cfx_getCode', [
      'fake_address',
      Conflux.__EPOCH_TAG__,
    ]);
  });

  test('the input is not a contract', async () => {
    mockedRPC.call.mockImplementationOnce(() => {
      throw new JsonPRCResponseError('...does not exist...');
    });
    await expect(conflux.isContract('fake_address')).resolves.toBe(false);
  });

  test('unexpected error occur', async () => {
    mockedRPC.call.mockImplementationOnce(() => {
      throw new Error('any other error occurred');
    });
    await expect(conflux.isContract('fake_address')).rejects.toThrow();
  });
});
