import BigNumber from 'bignumber.js';
import { Response } from 'cross-fetch';
import { mocked } from 'ts-jest/utils';

import { JsonPRCResponseError } from '../../../../src/basic/request/exceptions';
import { JsonRPCRequest } from '../../../../src/basic/request/json-rpc';
import { NearCli } from '../../../../src/provider/chains/near';
import { TransactionStatus } from '../../../../src/types/provider';

jest.mock('../../../../src/basic/request/json-rpc');

const mockRPCClass = mocked(JsonRPCRequest, true);

const cli = new NearCli('https://mynearlic.com/api');
const chainInfo: any = {};
cli.setChainInfo(chainInfo);
const [rpc] = mockRPCClass.mock.instances as Array<any>;

test('getInfo', async () => {
  rpc.call.mockReturnValueOnce(
    Promise.resolve({
      sync_info: {
        latest_block_height: 78966488,
        latest_block_hash: 'F63MW6tFagqizkP9XgUPLkTGtQMCpRDerJpmLwyZCrh6',
      },
    }),
  );

  await expect(cli.getInfo()).resolves.toStrictEqual({
    bestBlockNumber: 78966488,
    isReady: true,
  });
});

test('getAddress', async () => {
  rpc.call
    .mockReturnValueOnce(
      Promise.resolve({
        amount: '499998290994432367286875000',
        locked: '0',
        code_hash: '11111111111111111111111111111111',
        storage_usage: 751,
        storage_paid_at: 0,
        block_height: 79314717,
        block_hash: 'GjVWDHMfDk6yMHvbTtdKg1n6TdkLAXnDNfYVeeZKHFH9',
      }),
    )
    .mockReturnValueOnce({
      keys: [
        {
          public_key: 'ed25519:8DdvriBEdywYH77kyQRZpRq5jdgzFkUwet1Ue6iXdzuF',
          access_key: {
            nonce: 4,
            permission: 'FullAccess',
          },
        },
        {
          public_key: 'ed25519:8sba9wGaFN4VSxRBMTyXbztESjLkkN2YpB5pXcLvs3BQ',
          access_key: {
            nonce: 1,
            permission: 'FullAccess',
          },
        },
        {
          public_key: 'ed25519:B39d6Gbe3DvZgssApagMytWtE94WDVUV12tw6cLZCXoG',
          access_key: {
            nonce: 0,
            permission: {
              FunctionCall: {
                allowance: '250000000000000000000000',
                receiver_id: 'fluxprotocol-phase-point-two',
                method_names: [],
              },
            },
          },
        },
        {
          public_key: 'ed25519:EtwZ7RW3GQef9XbAnQz8GHxKWtvMn2UaHvNs9rNxJEYB',
          access_key: {
            nonce: 2,
            permission: 'FullAccess',
          },
        },
        {
          public_key: 'ed25519:FJLXJcu3C6WygAJspp5qg37qMPxvQG1b4k7DKPCoyih3',
          access_key: {
            nonce: 0,
            permission: {
              FunctionCall: {
                allowance: '250000000000000000000000',
                receiver_id: 'fluxprotocol-phase-point-two',
                method_names: [],
              },
            },
          },
        },
        {
          public_key: 'ed25519:GoHWX2nYRrSJc7wMW47hdQXZ5Ya63vUEgvyh8qhFYReB',
          access_key: {
            nonce: 6,
            permission: {
              FunctionCall: {
                allowance: '9969862497833902390000',
                receiver_id: 'fluxprotocol-phase-point-two',
                method_names: [],
              },
            },
          },
        },
      ],
      block_height: 79314730,
      block_hash: '3Jx1Bp3mZCrhmAJgVtgqiQPg3BUcWqt46mR3LBBBhsh8',
    });

  await expect(cli.getAddress('awesome.testnet')).resolves.toStrictEqual({
    existing: true,
    balance: new BigNumber('499998290994432367286875000'),
    nonce: 5,
  });
});

test('getAddress but not existing', async () => {
  rpc.call.mockReturnValueOnce(
    Promise.reject(
      new JsonPRCResponseError(
        '',
        new Response(
          JSON.stringify({
            cause: {
              name: 'UNKNOWN_ACCOUNT',
            },
          }),
        ),
      ),
    ),
  );

  await expect(cli.getAddress('awesome.testnet')).resolves.toStrictEqual({
    existing: false,
    balance: new BigNumber(0),
  });
});

test('getAccessKeys', async () => {
  rpc.call.mockReturnValueOnce({
    keys: [
      {
        public_key: 'ed25519:8DdvriBEdywYH77kyQRZpRq5jdgzFkUwet1Ue6iXdzuF',
        access_key: {
          nonce: 4,
          permission: 'FullAccess',
        },
      },
      {
        public_key: 'ed25519:8sba9wGaFN4VSxRBMTyXbztESjLkkN2YpB5pXcLvs3BQ',
        access_key: {
          nonce: 1,
          permission: 'FullAccess',
        },
      },
      {
        public_key: 'ed25519:B39d6Gbe3DvZgssApagMytWtE94WDVUV12tw6cLZCXoG',
        access_key: {
          nonce: 0,
          permission: {
            FunctionCall: {
              allowance: '250000000000000000000000',
              receiver_id: 'fluxprotocol-phase-point-two',
              method_names: [],
            },
          },
        },
      },
      {
        public_key: 'ed25519:EtwZ7RW3GQef9XbAnQz8GHxKWtvMn2UaHvNs9rNxJEYB',
        access_key: {
          nonce: 2,
          permission: 'FullAccess',
        },
      },
      {
        public_key: 'ed25519:FJLXJcu3C6WygAJspp5qg37qMPxvQG1b4k7DKPCoyih3',
        access_key: {
          nonce: 0,
          permission: {
            FunctionCall: {
              allowance: '250000000000000000000000',
              receiver_id: 'fluxprotocol-phase-point-two',
              method_names: [],
            },
          },
        },
      },
      {
        public_key: 'ed25519:GoHWX2nYRrSJc7wMW47hdQXZ5Ya63vUEgvyh8qhFYReB',
        access_key: {
          nonce: 6,
          permission: {
            FunctionCall: {
              allowance: '9969862497833902390000',
              receiver_id: 'fluxprotocol-phase-point-two',
              method_names: [],
            },
          },
        },
      },
    ],
    block_height: 79314730,
    block_hash: '3Jx1Bp3mZCrhmAJgVtgqiQPg3BUcWqt46mR3LBBBhsh8',
  });

  await expect(cli.getAccessKeys('awesome.testnet')).resolves.toStrictEqual([
    {
      functionCall: undefined,
      nonce: 5,
      pubkey: 'ed25519:8DdvriBEdywYH77kyQRZpRq5jdgzFkUwet1Ue6iXdzuF',
      pubkeyHex:
        '6b3e8890e20926ebedc89062bf5420956654387ba983d13d91881f572fd2d7ba',
      type: 'FullAccess',
    },
    {
      functionCall: undefined,
      nonce: 2,
      pubkey: 'ed25519:8sba9wGaFN4VSxRBMTyXbztESjLkkN2YpB5pXcLvs3BQ',
      pubkeyHex:
        '74f7f06f1f354f60775f6a306c36e716651c0ff54555a7894a57cf2771838463',
      type: 'FullAccess',
    },
    {
      functionCall: {
        allowance: '250000000000000000000000',
        methodNames: [],
        receiverId: 'fluxprotocol-phase-point-two',
      },
      nonce: 1,
      pubkey: 'ed25519:B39d6Gbe3DvZgssApagMytWtE94WDVUV12tw6cLZCXoG',
      pubkeyHex:
        '9521c7b478ab5c99259e5a973a5400150e06e3f93e576a53b999eac61cd7088b',
      type: 'FunctionCall',
    },
    {
      functionCall: undefined,
      nonce: 3,
      pubkey: 'ed25519:EtwZ7RW3GQef9XbAnQz8GHxKWtvMn2UaHvNs9rNxJEYB',
      pubkeyHex:
        'ce763c3c4ef4b0f6f1ee86689a01060b3d1f7df92bc3389b6d6b699fa649215c',
      type: 'FullAccess',
    },
    {
      functionCall: {
        allowance: '250000000000000000000000',
        methodNames: [],
        receiverId: 'fluxprotocol-phase-point-two',
      },
      nonce: 1,
      pubkey: 'ed25519:FJLXJcu3C6WygAJspp5qg37qMPxvQG1b4k7DKPCoyih3',
      pubkeyHex:
        'd474909ab19de92d1a93983f4af8aaeaba1f3b4212476c35b9a85164d04555d6',
      type: 'FunctionCall',
    },
    {
      functionCall: {
        allowance: '9969862497833902390000',
        methodNames: [],
        receiverId: 'fluxprotocol-phase-point-two',
      },
      nonce: 7,
      pubkey: 'ed25519:GoHWX2nYRrSJc7wMW47hdQXZ5Ya63vUEgvyh8qhFYReB',
      pubkeyHex:
        'eabab014b7b25960ccd44a66b66ac3227330b31bff1b95b656d7a919cb9a1004',
      type: 'FunctionCall',
    },
  ]);
});

test('getFeePricePerUnit', async () => {
  rpc.call.mockReturnValueOnce(
    Promise.resolve({
      gas_price: '100000000',
    }),
  );

  await expect(cli.getFeePricePerUnit()).resolves.toStrictEqual({
    normal: { price: new BigNumber('100000000') },
  });
});

test('getTransactionStatus', async () => {
  rpc.call.mockReturnValueOnce(
    Promise.resolve({
      status: {
        SuccessValue: '',
      },
    }),
  );

  await expect(cli.getTransactionStatus('fakeId')).resolves.toBe(
    TransactionStatus.CONFIRM_AND_SUCCESS,
  );
});

test('getTransactionStatus for failed tx', async () => {
  rpc.call.mockReturnValueOnce(
    Promise.resolve({
      status: {},
    }),
  );

  await expect(cli.getTransactionStatus('fakeId')).resolves.toBe(
    TransactionStatus.CONFIRM_BUT_FAILED,
  );
});

test('getTransactionStatus but not found', async () => {
  rpc.call.mockReturnValueOnce(
    Promise.reject(
      new JsonPRCResponseError(
        '',
        new Response(
          JSON.stringify({
            cause: {
              name: 'UNKNOWN_TRANSACTION',
            },
          }),
        ),
      ),
    ),
  );

  await expect(cli.getTransactionStatus('fakeId')).resolves.toBe(
    TransactionStatus.NOT_FOUND,
  );
});

test('broadcastTransaction', async () => {
  rpc.call.mockReturnValueOnce(
    Promise.resolve({
      status: {
        SuccessValue: '',
      },
    }),
  );

  await expect(cli.broadcastTransaction('fakeTx')).resolves.toBe(true);
});

test('broadcastTransaction but failed', async () => {
  rpc.call.mockReturnValueOnce(
    Promise.resolve({
      status: {},
    }),
  );

  await expect(cli.broadcastTransaction('fakeTx')).resolves.toBe(false);
});
