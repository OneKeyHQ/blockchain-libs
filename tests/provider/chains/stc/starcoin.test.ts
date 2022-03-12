import BigNumber from 'bignumber.js';

import { JsonRPCRequest } from '../../../../src/basic/request/json-rpc';
import { StcClient } from '../../../../src/provider/chains/stc';
import { TransactionStatus } from '../../../../src/types/provider';

jest.mock('../../../../src/basic/request/json-rpc');

const mockRPCClass = JsonRPCRequest as jest.MockedClass<typeof JsonRPCRequest>;

let stcClient: StcClient;
let mockedRPC: any;

beforeEach(() => {
  mockRPCClass.mockClear();
  stcClient = new StcClient('https://stcClient.mock/rpc');
  expect(mockRPCClass).toHaveBeenCalledTimes(1);
  mockedRPC = mockRPCClass.mock.instances[0];
});

test('getInfo', async () => {
  mockedRPC.call.mockReturnValueOnce(
    Promise.resolve({ head: { number: '1983723' }, chain_id: 251, other: {} }),
  );
  await expect(stcClient.getInfo()).resolves.toStrictEqual({
    bestBlockNumber: 1983723,
    isReady: true,
  });

  expect(mockedRPC.call).toHaveBeenCalledTimes(1);
  expect(mockedRPC.call).toHaveBeenCalledWith('chain.info', []);
});

test('getAddresses', async () => {
  mockedRPC.batchCall.mockReturnValueOnce(
    Promise.resolve([
      { json: { sequence_number: 110 } },
      114,
      { json: { token: { value: 1024 } } },
      null,
      null,
      null,
      { json: { sequence_number: 110 } },
      null,
      { json: { token: { value: 1024 } } },
    ]),
  );

  await expect(
    stcClient.getAddresses(['fake_address1', 'fake_address2', 'fake_address3']),
  ).resolves.toStrictEqual([
    {
      balance: new BigNumber(1024),
      nonce: 114,
      existing: true,
    },
    {
      balance: new BigNumber(0),
      nonce: 0,
      existing: false,
    },
    {
      balance: new BigNumber(1024),
      nonce: 110,
      existing: true,
    },
  ]);

  expect(mockedRPC.batchCall).toHaveBeenCalledWith([
    [
      'state.get_resource',
      ['fake_address1', '0x1::Account::Account', { decode: true }],
    ],
    ['txpool.next_sequence_number', ['fake_address1']],
    [
      'state.get_resource',
      [
        'fake_address1',
        '0x1::Account::Balance<0x1::STC::STC>',
        { decode: true },
      ],
    ],
    [
      'state.get_resource',
      ['fake_address2', '0x1::Account::Account', { decode: true }],
    ],
    ['txpool.next_sequence_number', ['fake_address2']],
    [
      'state.get_resource',
      [
        'fake_address2',
        '0x1::Account::Balance<0x1::STC::STC>',
        { decode: true },
      ],
    ],
    [
      'state.get_resource',
      ['fake_address3', '0x1::Account::Account', { decode: true }],
    ],
    ['txpool.next_sequence_number', ['fake_address3']],
    [
      'state.get_resource',
      [
        'fake_address3',
        '0x1::Account::Balance<0x1::STC::STC>',
        { decode: true },
      ],
    ],
  ]);
});

test('getBalances', async () => {
  mockedRPC.batchCall.mockReturnValueOnce(
    Promise.resolve([
      { json: { token: { value: 1024 } } },
      { json: { token: { value: 2048 } } },
      undefined,
    ]),
  );

  await expect(
    stcClient.getBalances([
      {
        address: 'fake_address1',
        coin: {},
      },
      {
        address: 'fake_address2',
        coin: {
          tokenAddress: 'fake_address::FAKE_MODULE::FAKE_NAME',
        },
      },
      {
        address: 'fake_address3',
        coin: {},
      },
    ]),
  ).resolves.toStrictEqual([
    new BigNumber(1024),
    new BigNumber(2048),
    undefined,
  ]);

  expect(mockedRPC.batchCall).toHaveBeenCalledWith([
    [
      'state.get_resource',
      [
        'fake_address1',
        '0x1::Account::Balance<0x1::STC::STC>',
        { decode: true },
      ],
    ],
    [
      'state.get_resource',
      [
        'fake_address2',
        '0x1::Account::Balance<fake_address::FAKE_MODULE::FAKE_NAME>',
        { decode: true },
      ],
    ],
    [
      'state.get_resource',
      [
        'fake_address3',
        '0x1::Account::Balance<0x1::STC::STC>',
        { decode: true },
      ],
    ],
  ]);
});

test('getTransactionStatuses', async () => {
  mockedRPC.batchCall.mockReturnValueOnce(
    Promise.resolve([
      null,
      { status: 'Executed' },
      null,
      { status: 'Failed' },
      {},
      null,
      undefined,
      undefined,
      null,
      null,
    ]),
  );

  await expect(
    stcClient.getTransactionStatuses([
      'fake_txid_confirm_and_success',
      'fake_txid_confirm_but_failed',
      'fake_txid_pending',
      'fake_txid_undefined',
      'fake_txid_not_found',
    ]),
  ).resolves.toStrictEqual([
    TransactionStatus.CONFIRM_AND_SUCCESS,
    TransactionStatus.CONFIRM_BUT_FAILED,
    TransactionStatus.PENDING,
    undefined,
    TransactionStatus.NOT_FOUND,
  ]);

  expect(mockedRPC.batchCall).toHaveBeenCalledWith([
    ['txpool.pending_txn', ['fake_txid_confirm_and_success']],
    ['chain.get_transaction_info', ['fake_txid_confirm_and_success']],
    ['txpool.pending_txn', ['fake_txid_confirm_but_failed']],
    ['chain.get_transaction_info', ['fake_txid_confirm_but_failed']],
    ['txpool.pending_txn', ['fake_txid_pending']],
    ['chain.get_transaction_info', ['fake_txid_pending']],
    ['txpool.pending_txn', ['fake_txid_undefined']],
    ['chain.get_transaction_info', ['fake_txid_undefined']],
    ['txpool.pending_txn', ['fake_txid_not_found']],
    ['chain.get_transaction_info', ['fake_txid_not_found']],
  ]);
});

test('getFeePricePerUnit', async () => {
  mockedRPC.call.mockReturnValueOnce(Promise.resolve('1'));

  await expect(stcClient.getFeePricePerUnit()).resolves.toStrictEqual({
    normal: { price: new BigNumber(1) },
  });

  expect(mockedRPC.call).toHaveBeenCalledWith('txpool.gas_price', []);
});
test('estimateGasLimit', async () => {
  // TODO: this rpc interface is not available in example
  mockedRPC.call.mockReturnValueOnce(
    Promise.resolve({ status: 'Executed', gas_used: '4096' }),
  );
  const params = {
    chain_id: 251,
    gas_unit_price: 1,
    sender: '0x49624992dd72da077ee19d0be210406a',
    sender_public_key:
      'c375de51172059011d519df58151cca6f9f4b573756fe912bd5155ca9050571e', // should be publicKey in hex string format
    sequence_number: 63,
    max_gas_amount: 10000000,
    script: {
      code: '0x1::TransferScripts::peer_to_peer_v2',
      type_args: ['0x1::STC::STC'],
      args: ['0x621500bf2b4aad17a690cb24f9a225c6', '19950u128'],
    },
  };
  await expect(stcClient.estimateGasLimit(params)).resolves.toStrictEqual(
    new BigNumber(4096),
  );

  expect(mockedRPC.call).toHaveBeenCalledWith('contract.dry_run', [params]);
});
test('broadcastTransaction', async () => {
  mockedRPC.call.mockReturnValueOnce(
    Promise.resolve(
      '0xaa20d062eabbc4543cf2bf477135f3a06bde0135e0de2bd2aac7bea2d5da2601',
    ),
  );

  await expect(stcClient.broadcastTransaction('fake_raw_tx')).resolves.toBe(
    '0xaa20d062eabbc4543cf2bf477135f3a06bde0135e0de2bd2aac7bea2d5da2601',
  );

  expect(mockedRPC.call).toHaveBeenCalledWith('txpool.submit_hex_transaction', [
    'fake_raw_tx',
  ]);
});
