import BigNumber from 'bignumber.js';

import { Provider } from '../../../../src/provider/chains/btc';
import AddressEncodings from '../../../../src/provider/chains/btc/sdk/addressEncodings';
import { UnsignedTx } from '../../../../src/types/provider';

const chainInfo: any = {
  code: 'btc',
};
const blockbook: any = {
  getRawTransaction: jest.fn(),
  getFeePricePerUnit: jest.fn(),
};
const provider = new Provider(chainInfo, () => Promise.resolve(blockbook));

test('pubkeyToAddress', async () => {
  const verifier: any = {
    getPubkey: jest
      .fn()
      .mockResolvedValue(
        Buffer.from(
          '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
          'hex',
        ),
      ),
  };

  await expect(
    provider.pubkeyToAddress(verifier, AddressEncodings.P2PKH),
  ).resolves.toBe('1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH');
  await expect(
    provider.pubkeyToAddress(verifier, AddressEncodings.P2WPKH),
  ).resolves.toBe('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');
  await expect(
    provider.pubkeyToAddress(verifier, AddressEncodings.P2SH_P2WPKH),
  ).resolves.toBe('3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN');

  await expect(
    provider.pubkeyToAddress(verifier, 'invalid' as AddressEncodings),
  ).rejects.toThrow('Invalid encoding: invalid');
});

test('verifyAddress', async () => {
  await expect(
    provider.verifyAddress('1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH'),
  ).resolves.toStrictEqual({
    displayAddress: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
    normalizedAddress: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
    encoding: 'P2PKH',
    isValid: true,
  });

  await expect(
    provider.verifyAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'),
  ).resolves.toStrictEqual({
    displayAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    normalizedAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    encoding: 'P2WPKH',
    isValid: true,
  });

  await expect(
    provider.verifyAddress('3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN'),
  ).resolves.toStrictEqual({
    displayAddress: '3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN',
    normalizedAddress: '3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN',
    encoding: 'P2SH_P2WPKH',
    isValid: true,
  });

  await expect(
    provider.verifyAddress('moEpB3BcDGzcrxif7ViauHrBQm7Nx1gEqB'),
  ).resolves.toStrictEqual({
    isValid: false,
  });
});

test('buildUnsignedTx with placeholder tx', async () => {
  blockbook.getFeePricePerUnit.mockResolvedValueOnce({
    normal: { price: new BigNumber('3.12') },
  });

  await expect(
    provider.buildUnsignedTx({ inputs: [], outputs: [], payload: {} }),
  ).resolves.toStrictEqual({
    inputs: [],
    outputs: [],
    payload: {},
    feeLimit: new BigNumber(79),
    feePricePerUnit: new BigNumber('3.12'),
  });
});

test('buildUnsignedTx with general tx', async () => {
  const unsignedTx: UnsignedTx = {
    inputs: [
      {
        address: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
        value: new BigNumber('1000'),
      },
      {
        address: '3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN',
        value: new BigNumber('2000'),
      },
    ],
    outputs: [
      {
        address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
        value: new BigNumber('1500'),
      },
      {
        address: '3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN',
        value: new BigNumber('1163'),
      },
    ],
    payload: { opReturn: 'Hello OneKey' },
    feePricePerUnit: new BigNumber('3.12'),
  };
  await expect(provider.buildUnsignedTx(unsignedTx)).resolves.toStrictEqual({
    ...unsignedTx,
    feeLimit: new BigNumber(337),
  });
});

test('signTransaction', async () => {
  blockbook.getRawTransaction.mockResolvedValue(
    Buffer.from(
      '01000000011111111111111111111111111111111111111111111111111111111111111111000000006a4730440220052e91d9305fca71d79b6f7cf6b3c5caf828b776a5275efa78b816a279ac32c802202da9bbf2f64985e9d0148c37392d06834d709ddb6276f1f700135dcafbe30ae401210279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ffffffff03e8030000000000001976a914751e76e8199196d454941c45d1b3a323f1433bd688acd007000000000000160014751e76e8199196d454941c45d1b3a323f1433bd6b80b00000000000017a914bcfeb728b584253d5f3f70bcb780e9ef218a68f48700000000',
      'hex',
    ),
  );

  const signer: any = {
    getPubkey: jest
      .fn()
      .mockResolvedValue(
        Buffer.from(
          '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
          'hex',
        ),
      ),

    sign: jest
      .fn()
      .mockResolvedValueOnce([
        Buffer.from(
          '5e7571e769e2d3f647b3b6d7f4f6cbe4e3d80203da49dfc4ab7ac8709efaccd97c2b181b6b1ca5b389976ffecdf3b643a0efced481b523bf4e6df4b6a84dd5f0',
          'hex',
        ),
      ])
      .mockResolvedValueOnce([
        Buffer.from(
          'c5a68792013767a7e1cac5a72ead7e6c660985a7d636de4625c5ab41a1f8a1072cee32691ad0f3371199c1832a457acfd5320fca0e55adeddda78fdc5bdead53',
          'hex',
        ),
      ])
      .mockResolvedValueOnce([
        Buffer.from(
          '8af3a9a48f75f50619aa0da74ca084b30e86fb0ce4c6c36e93b1ba6bb2044fe610d4d0480703f776ec5a26cee1c55a4589a16b8bf199ad158a04af87b3b3e246',
          'hex',
        ),
      ]),
  };

  await expect(
    provider.signTransaction(
      {
        inputs: [
          {
            address: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
            value: new BigNumber('1000'),
            utxo: {
              txid: '6214f604bdeef5eea2eb115be192a4bac42bcdb58a4b5a455c9d16e7cd53996b',
              vout: 0,
              value: new BigNumber('1000'),
            },
          },
          {
            address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
            value: new BigNumber('2000'),
            utxo: {
              txid: '6214f604bdeef5eea2eb115be192a4bac42bcdb58a4b5a455c9d16e7cd53996b',
              vout: 1,
              value: new BigNumber('2000'),
            },
          },
          {
            address: '3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN',
            value: new BigNumber('3000'),
            utxo: {
              txid: '6214f604bdeef5eea2eb115be192a4bac42bcdb58a4b5a455c9d16e7cd53996b',
              vout: 2,
              value: new BigNumber('3000'),
            },
          },
        ],
        outputs: [
          {
            address: '3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN',
            value: new BigNumber('2000'),
          },
          {
            address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
            value: new BigNumber('1500'),
          },
          {
            address: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
            value: new BigNumber('1500'),
          },
        ],
        payload: {
          opReturn: 'Hello OneKey',
        },
      },
      {
        '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH': signer,
        '3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN': signer,
        bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4: signer,
      },
    ),
  ).resolves.toStrictEqual({
    txid: 'ae7be60f91587b1c49edbf5b3cfd5f2022d8ccf8ccf03243c5c5ec8ad856befd',
    rawTx:
      '020000000001036b9953cde7169d5c455a4b8ab5cd2bc4baa492e15b11eba2eef5eebd04f61462000000006a47304402205e7571e769e2d3f647b3b6d7f4f6cbe4e3d80203da49dfc4ab7ac8709efaccd902207c2b181b6b1ca5b389976ffecdf3b643a0efced481b523bf4e6df4b6a84dd5f001210279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ffffffff6b9953cde7169d5c455a4b8ab5cd2bc4baa492e15b11eba2eef5eebd04f614620100000000ffffffff6b9953cde7169d5c455a4b8ab5cd2bc4baa492e15b11eba2eef5eebd04f614620200000017160014751e76e8199196d454941c45d1b3a323f1433bd6ffffffff04d00700000000000017a914bcfeb728b584253d5f3f70bcb780e9ef218a68f487dc05000000000000160014751e76e8199196d454941c45d1b3a323f1433bd6dc050000000000001976a914751e76e8199196d454941c45d1b3a323f1433bd688ac00000000000000000e6a0c48656c6c6f204f6e654b65790002483045022100c5a68792013767a7e1cac5a72ead7e6c660985a7d636de4625c5ab41a1f8a10702202cee32691ad0f3371199c1832a457acfd5320fca0e55adeddda78fdc5bdead5301210279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798024830450221008af3a9a48f75f50619aa0da74ca084b30e86fb0ce4c6c36e93b1ba6bb2044fe6022010d4d0480703f776ec5a26cee1c55a4589a16b8bf199ad158a04af87b3b3e24601210279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f8179800000000',
  });

  expect(blockbook.getRawTransaction).toHaveBeenCalledWith(
    '6214f604bdeef5eea2eb115be192a4bac42bcdb58a4b5a455c9d16e7cd53996b',
  );

  expect(signer.sign.mock.calls).toEqual([
    [
      Buffer.from(
        '94336c19d639674079614ed07da17e5f370fbba57d851fd89b89afe45b1cbc78',
        'hex',
      ),
    ],
    [
      Buffer.from(
        'f6d452fbcf6908d4262e3d2358ac1619fa8e88931030662bb6e286fdfcd9c2a8',
        'hex',
      ),
    ],
    [
      Buffer.from(
        'f1887d4c11bdc72d741ee8190411d32759431aef8e0688167136039227d01e7f',
        'hex',
      ),
    ],
  ]);
});

test('signMessage', async () => {
  const signer: any = {
    sign: jest
      .fn()
      .mockResolvedValue([
        Buffer.from(
          'c7a88c886a5415d60084512f0975c0e4323de0301a56606c6c1c0d71fe90d95b1616c93d2e1e596e5c0f01602248276bdbb6859d534bd894b958f208aa4d9bd7',
          'hex',
        ),
        0,
      ]),
  };

  const message = 'Hello OneKey';

  await expect(
    provider.signMessage(
      { message },
      signer,
      '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
    ),
  ).resolves.toBe(
    'H8eojIhqVBXWAIRRLwl1wOQyPeAwGlZgbGwcDXH+kNlbFhbJPS4eWW5cDwFgIkgna9u2hZ1TS9iUuVjyCKpNm9c=',
  );
  await expect(
    provider.signMessage(
      { message },
      signer,
      '3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN',
    ),
  ).resolves.toBe(
    'I8eojIhqVBXWAIRRLwl1wOQyPeAwGlZgbGwcDXH+kNlbFhbJPS4eWW5cDwFgIkgna9u2hZ1TS9iUuVjyCKpNm9c=',
  );
  await expect(
    provider.signMessage(
      { message },
      signer,
      'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    ),
  ).resolves.toBe(
    'J8eojIhqVBXWAIRRLwl1wOQyPeAwGlZgbGwcDXH+kNlbFhbJPS4eWW5cDwFgIkgna9u2hZ1TS9iUuVjyCKpNm9c=',
  );
});

test('verifyMessage', async () => {
  const message = 'Hello OneKey';
  await expect(
    provider.verifyMessage(
      '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
      { message },
      'H8eojIhqVBXWAIRRLwl1wOQyPeAwGlZgbGwcDXH+kNlbFhbJPS4eWW5cDwFgIkgna9u2hZ1TS9iUuVjyCKpNm9c=',
    ),
  ).resolves.toBe(true);
  await expect(
    provider.verifyMessage(
      '3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN',
      { message },
      'I8eojIhqVBXWAIRRLwl1wOQyPeAwGlZgbGwcDXH+kNlbFhbJPS4eWW5cDwFgIkgna9u2hZ1TS9iUuVjyCKpNm9c=',
    ),
  ).resolves.toBe(true);
  await expect(
    provider.verifyMessage(
      'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
      { message },
      'J8eojIhqVBXWAIRRLwl1wOQyPeAwGlZgbGwcDXH+kNlbFhbJPS4eWW5cDwFgIkgna9u2hZ1TS9iUuVjyCKpNm9c=',
    ),
  ).resolves.toBe(true);
});
