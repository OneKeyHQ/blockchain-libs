import BigNumber from 'bignumber.js';

import { Provider } from '../../../../src/provider/chains/near';
import { UnsignedTx } from '../../../../src/types/provider';

const chainInfo: any = {};
const cli: any = {
  getFeePricePerUnit: jest.fn(),
  getAddress: jest.fn(),
  getBestBlock: jest.fn(),
};
const provider = new Provider(chainInfo, () => Promise.resolve(cli));

test('pubkeyToAddress', async () => {
  const verifier: any = {
    getPubkey: jest
      .fn()
      .mockResolvedValue(
        Buffer.from(
          'e33c0f7d81d843c572275f287498e8d408654fdf0d1e065b84e2e6f157aab09b',
          'hex',
        ),
      ),
  };

  await expect(provider.pubkeyToAddress(verifier)).resolves.toStrictEqual(
    'e33c0f7d81d843c572275f287498e8d408654fdf0d1e065b84e2e6f157aab09b',
  );

  await expect(
    provider.pubkeyToAddress(verifier, 'ENCODED_PUBKEY'),
  ).resolves.toStrictEqual(
    'ed25519:GJ2famWaTaWgT5oYvi1dqA7cvtoKMzyje1Pcx1bL9Nsc',
  );
});

test('verifyAddress', async () => {
  await expect(
    provider.verifyAddress(
      'e33c0f7d81d843c572275f287498e8d408654fdf0d1e065b84e2e6f157aab09b',
    ),
  ).resolves.toStrictEqual({
    isValid: true,
    normalizedAddress:
      'e33c0f7d81d843c572275f287498e8d408654fdf0d1e065b84e2e6f157aab09b',
    displayAddress:
      'e33c0f7d81d843c572275f287498e8d408654fdf0d1e065b84e2e6f157aab09b',
    encoding: 'IMPLICIT_ACCOUNT',
  });

  await expect(
    provider.verifyAddress('awesome.testnet'),
  ).resolves.toStrictEqual({
    isValid: true,
    normalizedAddress: 'awesome.testnet',
    displayAddress: 'awesome.testnet',
    encoding: 'REGISTER_ACCOUNT',
  });

  await expect(
    provider.verifyAddress(
      'ed25519:GJ2famWaTaWgT5oYvi1dqA7cvtoKMzyje1Pcx1bL9Nsc',
    ),
  ).resolves.toStrictEqual({
    isValid: true,
    normalizedAddress: 'ed25519:GJ2famWaTaWgT5oYvi1dqA7cvtoKMzyje1Pcx1bL9Nsc',
    displayAddress: 'ed25519:GJ2famWaTaWgT5oYvi1dqA7cvtoKMzyje1Pcx1bL9Nsc',
    encoding: 'ENCODED_PUBKEY',
  });

  await expect(provider.verifyAddress('')).resolves.toStrictEqual({
    isValid: false,
  });
  await expect(provider.verifyAddress('!!')).resolves.toStrictEqual({
    isValid: false,
  });
  await expect(
    provider.verifyAddress(
      'secp256k1:GJ2famWaTaWgT5oYvi1dqA7cvtoKMzyje1Pcx1bL9Nsc',
    ),
  ).resolves.toStrictEqual({
    isValid: false,
  });
  await expect(
    provider.verifyAddress(
      'ed25519:GJ2famWaTaWgT5oYvi1dqA7cvtoKMzyje1Pcx1bL9N',
    ),
  ).resolves.toStrictEqual({
    isValid: false,
  });
});

test('buildUnsignedTx with placeholder tx', async () => {
  cli.getFeePricePerUnit.mockResolvedValueOnce({
    normal: {
      price: new BigNumber('100000000'),
    },
  });

  await expect(
    provider.buildUnsignedTx({
      inputs: [],
      outputs: [],
      payload: {},
    }),
  ).resolves.toStrictEqual({
    inputs: [],
    outputs: [],
    payload: {},
    nonce: undefined,
    feePricePerUnit: new BigNumber('100000000'),
  });

  expect(cli.getFeePricePerUnit).toHaveBeenCalledTimes(1);
  expect(cli.getAddress).not.toHaveBeenCalled();
  expect(cli.getBestBlock).not.toHaveBeenCalled();
});

test('buildUnsignedTx with general tx', async () => {
  cli.getAddress.mockResolvedValueOnce({
    nonce: 11,
  });
  cli.getBestBlock.mockResolvedValueOnce({
    blockHash: 'fakeBlockHash',
  });

  await expect(
    provider.buildUnsignedTx({
      inputs: [
        {
          address: 'awesome.testnet',
          value: new BigNumber('1'),
        },
      ],
      outputs: [],
      payload: {},
      feePricePerUnit: new BigNumber('100000000'),
    }),
  ).resolves.toStrictEqual({
    inputs: [
      {
        address: 'awesome.testnet',
        value: new BigNumber('1'),
      },
    ],
    outputs: [],
    payload: {
      blockHash: 'fakeBlockHash',
    },
    nonce: 11,
    feePricePerUnit: new BigNumber('100000000'),
  });

  expect(cli.getFeePricePerUnit).not.toHaveBeenCalled();
  expect(cli.getAddress).toHaveBeenCalledWith('awesome.testnet');
  expect(cli.getBestBlock).toHaveBeenCalledTimes(1);
});

test('signTransaction - near transfer', async () => {
  const unsignedTx: UnsignedTx = {
    inputs: [
      {
        address:
          'e33c0f7d81d843c572275f287498e8d408654fdf0d1e065b84e2e6f157aab09b',
        value: new BigNumber('1111'),
      },
    ],
    outputs: [
      {
        address: 'awesomewallet.testnet',
        value: new BigNumber('1111'),
      },
    ],
    nonce: 3,
    payload: {
      blockHash: '3d11mVE6Du9Qy2GGjhFQ6g6hPnK5rFCyHLyH5qn9TJup',
    },
  };
  const signer: any = {
    getPubkey: jest
      .fn()
      .mockResolvedValueOnce(
        Buffer.from(
          'e33c0f7d81d843c572275f287498e8d408654fdf0d1e065b84e2e6f157aab09b',
          'hex',
        ),
      ),
    sign: jest
      .fn()
      .mockResolvedValueOnce([
        Buffer.from(
          '73a47ba592cc0027d7e7a8a2222c6f6ebed102255b255717260165b04c10aa3b20f9cfa87def05fbead15b9150b33b54a41ba20afcbf81a5ac32380203691c02',
          'hex',
        ),
        0,
      ]),
  };
  await expect(
    provider.signTransaction(unsignedTx, {
      e33c0f7d81d843c572275f287498e8d408654fdf0d1e065b84e2e6f157aab09b: signer,
    }),
  ).resolves.toStrictEqual({
    txid: '5vmddrVuTcHsZhJSfBMDXsbMSic2Evis2XeurghUdA1M',
    rawTx:
      'QAAAAGUzM2MwZjdkODFkODQzYzU3MjI3NWYyODc0OThlOGQ0MDg2NTRmZGYwZDFlMDY1Yjg0ZTJlNmYxNTdhYWIwOWIA4zwPfYHYQ8VyJ18odJjo1AhlT98NHgZbhOLm8VeqsJsDAAAAAAAAABUAAABhd2Vzb21ld2FsbGV0LnRlc3RuZXQm8ExFSPU6PRiyJwowU96Q82oODfqRb2ccx+Eb12nLCwEAAAADVwQAAAAAAAAAAAAAAAAAAABzpHulkswAJ9fnqKIiLG9uvtECJVslVxcmAWWwTBCqOyD5z6h97wX76tFbkVCzO1SkG6IK/L+BpawyOAIDaRwC',
  });
});

test('signTransaction - token transfer', async () => {
  const unsignedTx: UnsignedTx = {
    inputs: [
      {
        address:
          'e33c0f7d81d843c572275f287498e8d408654fdf0d1e065b84e2e6f157aab09b',
        value: new BigNumber('1111'),
        tokenAddress: 'gold.thegame.testnet',
      },
    ],
    outputs: [
      {
        address: 'awesomewallet.testnet',
        value: new BigNumber('1111'),
        tokenAddress: 'gold.thegame.testnet',
      },
    ],
    nonce: 4,
    payload: {
      blockHash: '8g7GuCxk9BRzok6VtYb6Uq9wYf4RdB5JEFxwKWvwUjUY',
    },
  };
  const signer: any = {
    getPubkey: jest
      .fn()
      .mockResolvedValueOnce(
        Buffer.from(
          'e33c0f7d81d843c572275f287498e8d408654fdf0d1e065b84e2e6f157aab09b',
          'hex',
        ),
      ),
    sign: jest
      .fn()
      .mockResolvedValueOnce([
        Buffer.from(
          '7cb14b8c07ce45392765c305a9402ec645753c2261635ee99935d7823cd6b282a1fe8519370f8ac9d869b342ae6c65fdc44f6dc72b45103e47f137550d5dd209',
          'hex',
        ),
        0,
      ]),
  };
  await expect(
    provider.signTransaction(unsignedTx, {
      e33c0f7d81d843c572275f287498e8d408654fdf0d1e065b84e2e6f157aab09b: signer,
    }),
  ).resolves.toStrictEqual({
    txid: 'itaHjszkT96zPPKuuibMgE6oo6AnxeRoPQ4w4fygEXW',
    rawTx:
      'QAAAAGUzM2MwZjdkODFkODQzYzU3MjI3NWYyODc0OThlOGQ0MDg2NTRmZGYwZDFlMDY1Yjg0ZTJlNmYxNTdhYWIwOWIA4zwPfYHYQ8VyJ18odJjo1AhlT98NHgZbhOLm8VeqsJsEAAAAAAAAABQAAABnb2xkLnRoZWdhbWUudGVzdG5ldHIGjeIS3vvft9bAzCuyNVPF3RXeElYF53quHzI0ALodAQAAAAILAAAAZnRfdHJhbnNmZXI3AAAAeyJhbW91bnQiOiIxMTExIiwicmVjZWl2ZXJfaWQiOiJhd2Vzb21ld2FsbGV0LnRlc3RuZXQifQDgV+tIGwAAAQAAAAAAAAAAAAAAAAAAAAB8sUuMB85FOSdlwwWpQC7GRXU8ImFjXumZNdeCPNaygqH+hRk3D4rJ2GmzQq5sZf3ET23HK0UQPkfxN1UNXdIJ',
  });
});
