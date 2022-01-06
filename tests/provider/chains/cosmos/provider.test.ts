import BigNumber from 'bignumber.js';

import { NotImplementedError } from '../../../../src/basic/exceptions';
import { Provider } from '../../../../src/provider/chains/cosmos';
import { UnsignedTx } from '../../../../src/types/provider';

const chainInfo: any = {
  implOptions: {
    addressPrefix: 'cosmos',
    mainCoinDenom: 'uatom',
    chainId: 'cosmoshub-4',
  },
};
const tendermint: any = {
  getFeePricePerUnit: jest.fn(),
  getAddress: jest.fn(),
};
const provider = new Provider(chainInfo, () => Promise.resolve(tendermint));

test('pubkeyToAddress secp256k1', async () => {
  Object.assign(chainInfo, {
    curve: 'secp256k1',
  });

  const verifier: any = {
    getPubkey: jest
      .fn()
      .mockResolvedValueOnce(
        Buffer.from('AtQaCqFnshaZQp6rIkvAPyzThvCvXSDO+9AzbxVErqJP', 'base64'),
      ),
  };

  await expect(provider.pubkeyToAddress(verifier, undefined)).resolves.toBe(
    'cosmos1h806c7khnvmjlywdrkdgk2vrayy2mmvf9rxk2r',
  );
  expect(verifier.getPubkey).toHaveBeenCalledWith(true);

  delete chainInfo.curve;
});

test('pubkeyToAddress ed25519', async () => {
  Object.assign(chainInfo, {
    curve: 'ed25519',
  });

  const verifier: any = {
    getPubkey: jest
      .fn()
      .mockResolvedValueOnce(
        Buffer.from(
          '12ee6f581fe55673a1e9e1382a0829e32075a0aa4763c968bc526e1852e78c95',
          'hex',
        ),
      ),
  };

  await expect(provider.pubkeyToAddress(verifier, undefined)).resolves.toBe(
    'cosmos1pfq05em6sfkls66ut4m2257p7qwlk448h8mysz',
  );
  expect(verifier.getPubkey).toHaveBeenCalledWith(true);

  delete chainInfo.curve;
});

test('verifyAddress', async () => {
  await expect(
    provider.verifyAddress('cosmos1h806c7khnvmjlywdrkdgk2vrayy2mmvf9rxk2r'),
  ).resolves.toStrictEqual({
    displayAddress: 'cosmos1h806c7khnvmjlywdrkdgk2vrayy2mmvf9rxk2r',
    normalizedAddress: 'cosmos1h806c7khnvmjlywdrkdgk2vrayy2mmvf9rxk2r',
    isValid: true,
  });

  await expect(
    provider.verifyAddress('cosmos1pfq05em6sfkls66ut4m2257p7qwlk448h8mysz'),
  ).resolves.toStrictEqual({
    displayAddress: 'cosmos1pfq05em6sfkls66ut4m2257p7qwlk448h8mysz',
    normalizedAddress: 'cosmos1pfq05em6sfkls66ut4m2257p7qwlk448h8mysz',
    isValid: true,
  });

  await expect(
    provider.verifyAddress('osmo1mzqd0kynsjzsnf3d37m5uvs53kkxssf0nzee7v'),
  ).resolves.toStrictEqual({
    displayAddress: undefined,
    normalizedAddress: undefined,
    isValid: false,
  });

  const osmoProvider = new Provider(
    {
      implOptions: {
        addressPrefix: 'osmo',
      },
    } as never,
    () => Promise.resolve(tendermint),
  );
  await expect(
    osmoProvider.verifyAddress('osmo1mzqd0kynsjzsnf3d37m5uvs53kkxssf0nzee7v'),
  ).resolves.toStrictEqual({
    displayAddress: 'osmo1mzqd0kynsjzsnf3d37m5uvs53kkxssf0nzee7v',
    normalizedAddress: 'osmo1mzqd0kynsjzsnf3d37m5uvs53kkxssf0nzee7v',
    isValid: true,
  });
});

test('verifyTokenAddress', async () => {
  await expect(
    provider.verifyTokenAddress(
      'cosmos1pfq05em6sfkls66ut4m2257p7qwlk448h8mysz',
    ),
  ).resolves.toStrictEqual({
    displayAddress: 'cosmos1pfq05em6sfkls66ut4m2257p7qwlk448h8mysz',
    normalizedAddress: 'cosmos1pfq05em6sfkls66ut4m2257p7qwlk448h8mysz',
    isValid: true,
    encoding: 'CW20',
  });

  await expect(provider.verifyTokenAddress('uatom')).resolves.toStrictEqual({
    displayAddress: 'uatom',
    normalizedAddress: 'uatom',
    isValid: true,
    encoding: 'NativeToken',
  });
  await expect(
    provider.verifyTokenAddress('gamm/pool/216'),
  ).resolves.toStrictEqual({
    displayAddress: 'gamm/pool/216',
    normalizedAddress: 'gamm/pool/216',
    isValid: true,
    encoding: 'NativeToken',
  });
  await expect(provider.verifyTokenAddress('')).resolves.toStrictEqual({
    displayAddress: undefined,
    normalizedAddress: undefined,
    isValid: false,
    encoding: undefined,
  });

  const maxLengthAddress = Array(128).fill('.').join('');
  await expect(
    provider.verifyTokenAddress(maxLengthAddress),
  ).resolves.toStrictEqual({
    displayAddress: maxLengthAddress,
    normalizedAddress: maxLengthAddress,
    isValid: true,
    encoding: 'NativeToken',
  });

  await expect(
    provider.verifyTokenAddress(maxLengthAddress + '.'),
  ).resolves.toStrictEqual({
    displayAddress: undefined,
    normalizedAddress: undefined,
    isValid: false,
    encoding: undefined,
  });
});

test('buildUnsignedTx with placeholder tx', async () => {
  tendermint.getFeePricePerUnit.mockResolvedValueOnce({
    normal: {
      price: new BigNumber(10),
    },
  });

  await expect(
    provider.buildUnsignedTx({ inputs: [], outputs: [], payload: {} }),
  ).resolves.toStrictEqual({
    inputs: [],
    outputs: [],
    feeLimit: new BigNumber(80000),
    feePricePerUnit: new BigNumber(10),
    nonce: undefined,
    payload: {
      accountNumber: undefined,
    },
  });
  expect(tendermint.getFeePricePerUnit).toHaveBeenCalledTimes(1);
});

test('buildUnsignedTx - general transfer', async () => {
  tendermint.getAddress.mockResolvedValueOnce({
    nonce: 10,
    accountNumber: 12010,
  });

  await expect(
    provider.buildUnsignedTx({
      inputs: [
        {
          address: 'cosmos1pfq05em6sfkls66ut4m2257p7qwlk448h8mysz',
          value: new BigNumber(100),
        },
      ],
      outputs: [
        {
          address: 'cosmos1h806c7khnvmjlywdrkdgk2vrayy2mmvf9rxk2r',
          value: new BigNumber(100),
        },
      ],
      feeLimit: new BigNumber(80000),
      feePricePerUnit: new BigNumber(10),
      payload: {},
    }),
  ).resolves.toStrictEqual({
    inputs: [
      {
        address: 'cosmos1pfq05em6sfkls66ut4m2257p7qwlk448h8mysz',
        value: new BigNumber(100),
      },
    ],
    outputs: [
      {
        address: 'cosmos1h806c7khnvmjlywdrkdgk2vrayy2mmvf9rxk2r',
        value: new BigNumber(100),
      },
    ],
    feeLimit: new BigNumber(80000),
    feePricePerUnit: new BigNumber(10),
    nonce: 10,
    payload: {
      accountNumber: 12010,
    },
  });

  expect(tendermint.getAddress).toHaveBeenCalledWith(
    'cosmos1pfq05em6sfkls66ut4m2257p7qwlk448h8mysz',
  );
  expect(tendermint.getFeePricePerUnit).not.toHaveBeenCalled();
});

test('signTransaction - general transfer', async () => {
  const signer: any = {
    getPubkey: jest
      .fn()
      .mockResolvedValueOnce(
        Buffer.from('A/P0TJ6A4s7cGikJYxo63qiGbuMhh/dNCRI4c1mw/zai', 'base64'),
      ),
    sign: jest
      .fn()
      .mockResolvedValueOnce([
        Buffer.from(
          'mXTttxnDgcRJ8HrbhTuafCDe0bFRQNLbYcZMtPrOMW8WF/9x05UQzhaST/RSYhcPZbmg38ApB2z8G6aOfdORIA==',
          'base64',
        ),
        0,
      ]),
  };
  const unsignedTx: UnsignedTx = {
    inputs: [
      {
        address: 'cosmos155svs6sgxe55rnvs6ghprtqu0mh69kehrn0dqr',
        value: new BigNumber('975231'),
        tokenAddress: 'uatom',
      },
    ],
    outputs: [
      {
        address: 'cosmos1lgltxxqfn0q327lldhm58y6xgz6wglrnte62qw',
        value: new BigNumber('975231'),
        tokenAddress: 'uatom',
      },
    ],
    feePricePerUnit: new BigNumber(375),
    feeLimit: new BigNumber(80000),
    nonce: 48697,
    payload: {
      accountNumber: 16241,
    },
  };

  await expect(
    provider.signTransaction(unsignedTx, {
      cosmos155svs6sgxe55rnvs6ghprtqu0mh69kehrn0dqr: signer,
    }),
  ).resolves.toStrictEqual({
    txid: 'CBBFCD936AE1CA9E54F72D51A30A0F5AA310CDB81933F730B67E64209BCE389B',
    rawTx:
      'CpIBCo8BChwvY29zbW9zLmJhbmsudjFiZXRhMS5Nc2dTZW5kEm8KLWNvc21vczE1NXN2czZzZ3hlNTVybnZzNmdocHJ0cXUwbWg2OWtlaHJuMGRxchItY29zbW9zMWxnbHR4eHFmbjBxMzI3bGxkaG01OHk2eGd6NndnbHJudGU2MnF3Gg8KBXVhdG9tEgY5NzUyMzESaQpSCkYKHy9jb3Ntb3MuY3J5cHRvLnNlY3AyNTZrMS5QdWJLZXkSIwohA/P0TJ6A4s7cGikJYxo63qiGbuMhh/dNCRI4c1mw/zaiEgQKAggBGLn8AhITCg0KBXVhdG9tEgQzMDAwEIDxBBpAmXTttxnDgcRJ8HrbhTuafCDe0bFRQNLbYcZMtPrOMW8WF/9x05UQzhaST/RSYhcPZbmg38ApB2z8G6aOfdORIA==',
  });
});

test('signTransaction - cw20 transfer', async () => {
  const signer: any = {
    getPubkey: jest
      .fn()
      .mockResolvedValueOnce(
        Buffer.from('A1e/4eNB0Bxp/lZUMJlWy+pRaCL7qKYBdDoBKniW7o3C', 'base64'),
      ),
    sign: jest
      .fn()
      .mockResolvedValueOnce([
        Buffer.from(
          'MkfANhZfd27J3ZiBpwNEBKxoo5ZlNxmV9/NSzXdoWvRtOuJ/0Zwe7h5MPAQONa/OR89y4d0RmzGFG5T1/asSQA==',
          'base64',
        ),
        0,
      ]),
  };
  const unsignedTx: UnsignedTx = {
    type: 'cw20_transfer',
    inputs: [
      {
        address: 'terra1aeatjrx7265vpc4mpp4vf96ghrdemnnjyppa9e',
        value: new BigNumber('12'),
        tokenAddress: 'terra12897djskt9rge8dtmm86w654g7kzckkd698608',
      },
    ],
    outputs: [
      {
        address: 'terra175hqcw6herfg00rsy7sj8zc3jqqz7wkeap8n6n',
        value: new BigNumber('12'),
        tokenAddress: 'terra12897djskt9rge8dtmm86w654g7kzckkd698608',
      },
    ],
    feePricePerUnit: new BigNumber(150),
    feeLimit: new BigNumber(322714),
    nonce: 2,
    payload: {
      accountNumber: 3313024,
    },
  };

  const chainInfo: any = {
    implOptions: {
      addressPrefix: 'terra',
      mainCoinDenom: 'uluna',
      chainId: 'columbus-5',
    },
  };
  const terraProvider = new Provider(chainInfo, () =>
    Promise.reject(NotImplementedError),
  );

  await expect(
    terraProvider.signTransaction(unsignedTx, {
      terra1aeatjrx7265vpc4mpp4vf96ghrdemnnjyppa9e: signer,
    }),
  ).resolves.toStrictEqual({
    txid: '7F334334BA97E591570932D92B417A238D3CD798152323C77E2D531316944292',
    rawTx:
      'CuMBCuABCiYvdGVycmEud2FzbS52MWJldGExLk1zZ0V4ZWN1dGVDb250cmFjdBK1AQosdGVycmExYWVhdGpyeDcyNjV2cGM0bXBwNHZmOTZnaHJkZW1ubmp5cHBhOWUSLHRlcnJhMTI4OTdkanNrdDlyZ2U4ZHRtbTg2dzY1NGc3a3pja2tkNjk4NjA4Gld7InRyYW5zZmVyIjp7ImFtb3VudCI6IjEyIiwicmVjaXBpZW50IjoidGVycmExNzVocWN3NmhlcmZnMDByc3k3c2o4emMzanFxejd3a2VhcDhuNm4ifX0SZwpQCkYKHy9jb3Ntb3MuY3J5cHRvLnNlY3AyNTZrMS5QdWJLZXkSIwohA1e/4eNB0Bxp/lZUMJlWy+pRaCL7qKYBdDoBKniW7o3CEgQKAggBGAISEwoNCgV1bHVuYRIENDg0MRCa2RMaQDJHwDYWX3duyd2YgacDRASsaKOWZTcZlffzUs13aFr0bTrif9GcHu4eTDwEDjWvzkfPcuHdEZsxhRuU9f2rEkA=',
  });
});
