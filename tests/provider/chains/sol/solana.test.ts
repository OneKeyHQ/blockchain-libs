import BigNumber from 'bignumber.js';

import { JsonRPCRequest } from '../../../../src/basic/request/json-rpc';
import { Solana } from '../../../../src/provider/chains/sol';
import { TransactionStatus } from '../../../../src/types/provider';

jest.mock('../../../../src/basic/request/json-rpc');

const mockRPCClass = JsonRPCRequest as jest.MockedClass<typeof JsonRPCRequest>;
const GET_BALANCE_OPTIONS = { encoding: 'jsonParsed', commitment: 'processed' };

let solana: Solana;
let mockedRPC: any;

beforeEach(() => {
  mockRPCClass.mockClear();
  solana = new Solana('https://solana.mock/rpc');
  expect(mockRPCClass).toHaveBeenCalledTimes(1);
  mockedRPC = mockRPCClass.mock.instances[0];
});

test('getInfo', async () => {
  mockedRPC.batchCall.mockReturnValueOnce(
    Promise.resolve([{ absoluteSlot: 130000 }, 'ok']),
  );
  await expect(solana.getInfo()).resolves.toStrictEqual({
    bestBlockNumber: 130000,
    isReady: true,
  });

  expect(mockedRPC.batchCall).toHaveBeenCalledTimes(1);
  expect(mockedRPC.batchCall).toHaveBeenCalledWith([
    ['getEpochInfo', []],
    ['getHealth', []],
  ]);
});

test('getAddresses', async () => {
  mockedRPC.batchCall.mockReturnValueOnce(
    Promise.resolve([{ value: { lamports: 110 } }, undefined, { value: null }]),
  );

  await expect(
    solana.getAddresses(['fake_address1', 'fake_address2', 'fake_address3']),
  ).resolves.toStrictEqual([
    {
      balance: new BigNumber(110),
      existing: true,
    },
    undefined,
    {
      balance: new BigNumber(0),
      existing: false,
    },
  ]);

  expect(mockedRPC.batchCall).toHaveBeenCalledWith([
    ['getAccountInfo', ['fake_address1', { encoding: 'jsonParsed' }]],
    ['getAccountInfo', ['fake_address2', { encoding: 'jsonParsed' }]],
    ['getAccountInfo', ['fake_address3', { encoding: 'jsonParsed' }]],
  ]);
});

test('getBalances', async () => {
  mockedRPC.batchCall.mockReturnValueOnce(
    Promise.resolve([
      { value: { lamports: 110 } },
      {
        value: [
          {
            account: {
              data: {
                parsed: {
                  info: {
                    owner: 'fake_system_account_address',
                    tokenAmount: { amount: 114 },
                  },
                },
              },
            },
          },
        ],
      },
      { value: null },
      undefined,
      undefined,
      { value: [] },
    ]),
  );

  await expect(
    solana.getBalances([
      {
        address: 'fake_system_account_address',
        coin: {},
      },
      {
        address: 'fake_system_account_address',
        coin: {
          tokenAddress: 'fake_token_mint_address',
        },
      },
      {
        address: 'fake_system_account_address_with_no_balance',
        coin: {},
      },
      {
        address: 'fake_system_account_address',
        coin: {},
      },
      {
        address: 'fake_system_account_address',
        coin: {
          tokenAddress: 'fake_token_mint_address',
        },
      },
      {
        address: 'fake_system_account_address_with_no_balance',
        coin: {
          tokenAddress: 'fake_token_mint_address',
        },
      },
    ]),
  ).resolves.toStrictEqual([
    new BigNumber(110),
    new BigNumber(114),
    new BigNumber(0),
    undefined,
    undefined,
    new BigNumber(0),
  ]);

  expect(mockedRPC.batchCall).toHaveBeenCalledWith([
    ['getAccountInfo', ['fake_system_account_address', GET_BALANCE_OPTIONS]],
    [
      'getTokenAccountsByOwner',
      [
        'fake_system_account_address',
        { mint: 'fake_token_mint_address' },
        GET_BALANCE_OPTIONS,
      ],
    ],
    [
      'getAccountInfo',
      ['fake_system_account_address_with_no_balance', GET_BALANCE_OPTIONS],
    ],
    ['getAccountInfo', ['fake_system_account_address', GET_BALANCE_OPTIONS]],
    [
      'getTokenAccountsByOwner',
      [
        'fake_system_account_address',
        { mint: 'fake_token_mint_address' },
        GET_BALANCE_OPTIONS,
      ],
    ],
    [
      'getTokenAccountsByOwner',
      [
        'fake_system_account_address_with_no_balance',
        { mint: 'fake_token_mint_address' },
        GET_BALANCE_OPTIONS,
      ],
    ],
  ]);
});

test('getTransactionStatuses', async () => {
  mockedRPC.batchCall.mockReturnValueOnce(
    Promise.resolve([
      { meta: { err: null } },
      { meta: { err: 'some error occurred' } },
      undefined,
      null,
    ]),
  );

  await expect(
    solana.getTransactionStatuses([
      'fake_txid_confirm_and_success',
      'fake_txid_confirm_but_failed',
      'fake_txid_undefined',
      'fake_txid_not_found',
    ]),
  ).resolves.toStrictEqual([
    TransactionStatus.CONFIRM_AND_SUCCESS,
    TransactionStatus.CONFIRM_BUT_FAILED,
    undefined,
    TransactionStatus.NOT_FOUND,
  ]);

  expect(mockedRPC.batchCall).toHaveBeenCalledWith([
    ['getTransaction', ['fake_txid_confirm_and_success', 'jsonParsed']],
    ['getTransaction', ['fake_txid_confirm_but_failed', 'jsonParsed']],
    ['getTransaction', ['fake_txid_undefined', 'jsonParsed']],
    ['getTransaction', ['fake_txid_not_found', 'jsonParsed']],
  ]);
});

test('getTokenInfos', async () => {
  mockedRPC.batchCall.mockReturnValueOnce(
    Promise.resolve([
      { value: { data: { parsed: { type: 'mint', info: { decimals: 9 } } } } },
      undefined,
      { value: null },
      { value: { data: { parsed: { type: 'other' } } } },
    ]),
  );

  await expect(
    solana.getTokenInfos([
      'fake_mint_address',
      'fake_mint_address_not_exist',
      'fake_mint_address_invalid',
      'fake_mint_address_invalid2',
    ]),
  ).resolves.toStrictEqual([
    { name: 'fake', symbol: 'FAKE', decimals: 9 },
    undefined,
    undefined,
    undefined,
  ]);

  expect(mockedRPC.batchCall).toHaveBeenCalledWith([
    ['getAccountInfo', ['fake_mint_address', { encoding: 'jsonParsed' }]],
    [
      'getAccountInfo',
      ['fake_mint_address_not_exist', { encoding: 'jsonParsed' }],
    ],
    [
      'getAccountInfo',
      ['fake_mint_address_invalid', { encoding: 'jsonParsed' }],
    ],
    [
      'getAccountInfo',
      ['fake_mint_address_invalid2', { encoding: 'jsonParsed' }],
    ],
  ]);
});

test('getFeePricePerUnit', async () => {
  mockedRPC.call.mockReturnValueOnce(
    Promise.resolve({
      value: { feeCalculator: { lamportsPerSignature: 5000 } },
      blockhash: 120,
    }),
  );

  await expect(solana.getFeePricePerUnit()).resolves.toStrictEqual({
    normal: { price: new BigNumber(5000) },
  });

  expect(mockedRPC.call).toHaveBeenCalledWith('getFees');
});

test('broadcastTransaction', async () => {
  mockedRPC.call.mockReturnValueOnce(
    Promise.resolve(
      '2id3YC2jK9G5Wo2phDx4gJVAew8DcY5NAojnVuao8rkxwPYPe8cSwE5GzhEgJA2y8fVjDEo6iR6ykBvDxrTQrtpb',
    ),
  );

  await expect(solana.broadcastTransaction('fake_raw_tx')).resolves.toBe(
    '2id3YC2jK9G5Wo2phDx4gJVAew8DcY5NAojnVuao8rkxwPYPe8cSwE5GzhEgJA2y8fVjDEo6iR6ykBvDxrTQrtpb',
  );

  expect(mockedRPC.call).toHaveBeenCalledWith('sendTransaction', [
    'fake_raw_tx',
    { encoding: 'base64' },
  ]);
});
