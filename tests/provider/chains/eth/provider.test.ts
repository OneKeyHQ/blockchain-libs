import BigNumber from 'bignumber.js';

import { Provider } from '../../../../src/provider/chains/eth';

let provider: Provider;
let geth: any;
let chainInfo: any;

beforeEach(() => {
  geth = {
    getFeePricePerUnit: jest.fn(),
    getAddresses: jest.fn(),
    estimateGasLimit: jest.fn(),
    isContract: jest.fn(),
  };
  chainInfo = {
    implOptions: { chainId: '1' },
  };
  provider = new Provider(chainInfo, () => Promise.resolve(geth));
});

test('verifyAddress', async () => {
  await expect(
    provider.verifyAddress('0x2e5124c037871deb014490c37a4844f7019f38bd'),
  ).resolves.toStrictEqual({
    normalizedAddress: '0x2e5124c037871deb014490c37a4844f7019f38bd',
    displayAddress: '0x2E5124C037871DeB014490C37a4844F7019f38bD',
    isValid: true,
  });

  await expect(
    provider.verifyAddress('0x2E5124C037871DeB014490C37a4844F7019f38bD'),
  ).resolves.toStrictEqual({
    normalizedAddress: '0x2e5124c037871deb014490c37a4844f7019f38bd',
    displayAddress: '0x2E5124C037871DeB014490C37a4844F7019f38bD',
    isValid: true,
  });

  await expect(
    provider.verifyAddress('0x2E5124C037871DeB014490C37a4844F7019f38bd'), // modify the last char from 'D' to 'd', invalid checksum address
  ).resolves.toStrictEqual({
    isValid: false,
    displayAddress: undefined,
    normalizedAddress: undefined,
  });

  await expect(provider.verifyAddress('')).resolves.toStrictEqual({
    isValid: false,
    displayAddress: undefined,
    normalizedAddress: undefined,
  });

  await expect(provider.verifyAddress('0x')).resolves.toStrictEqual({
    isValid: false,
    displayAddress: undefined,
    normalizedAddress: undefined,
  });

  await expect(
    provider.verifyAddress('0x0x2e5124c037871deb014490c37a4844f7019f38b'), // delete the last char
  ).resolves.toStrictEqual({
    isValid: false,
    displayAddress: undefined,
    normalizedAddress: undefined,
  });
});

test('pubkeyToAddress', async () => {
  const verifier: any = {
    getPubkey: jest.fn(),
  };
  verifier.getPubkey.mockResolvedValueOnce(
    Buffer.from(
      '0400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      'hex',
    ),
  );

  await expect(provider.pubkeyToAddress(verifier, undefined)).resolves.toBe(
    '0x3f17f1962b36e491b30a40b2405849e597ba5fb5',
  );
  expect(verifier.getPubkey).toHaveBeenCalledWith(false);
});

test('buildUnsignedTx with placeholder tx', async () => {
  geth.getFeePricePerUnit.mockReturnValueOnce(
    Promise.resolve({ normal: { price: new BigNumber(30000000000) } }),
  );

  await expect(
    provider.buildUnsignedTx({ inputs: [], outputs: [], payload: {} }),
  ).resolves.toStrictEqual({
    inputs: [],
    outputs: [],
    nonce: undefined,
    feeLimit: new BigNumber(21000),
    feePricePerUnit: new BigNumber(30000000000),
    payload: {},
  });

  expect(geth.getFeePricePerUnit).toHaveBeenCalledTimes(1);
  expect(geth.estimateGasLimit).not.toBeCalled();
  expect(geth.getAddresses).not.toBeCalled();
  expect(geth.isContract).not.toBeCalled();
});

test('buildUnsignedTx after filling in basic information', async () => {
  geth.getFeePricePerUnit.mockReturnValueOnce(
    Promise.resolve({ normal: { price: new BigNumber(30000000000) } }),
  );
  geth.estimateGasLimit.mockResolvedValueOnce('0x5208');
  geth.isContract.mockResolvedValueOnce(false);
  geth.getAddresses.mockResolvedValueOnce([{ nonce: 11 }]);

  await expect(
    provider.buildUnsignedTx({
      inputs: [
        {
          address: '0x71df3bb810127271d400f7be99cc1f4504ab4c1a',
          value: new BigNumber(21),
        },
      ],
      outputs: [
        {
          address: '0xa305fab8bda7e1638235b054889b3217441dd645',
          value: new BigNumber(21),
        },
      ],
      payload: {},
    }),
  ).resolves.toStrictEqual({
    inputs: [
      {
        address: '0x71df3bb810127271d400f7be99cc1f4504ab4c1a',
        value: new BigNumber(21),
      },
    ],
    outputs: [
      {
        address: '0xa305fab8bda7e1638235b054889b3217441dd645',
        value: new BigNumber(21),
      },
    ],
    nonce: 11,
    feeLimit: new BigNumber(21000),
    feePricePerUnit: new BigNumber(30000000000),
    payload: {},
  });
  expect(geth.getFeePricePerUnit).toHaveBeenCalledTimes(1);
  expect(geth.estimateGasLimit).toHaveBeenCalledWith(
    '0x71df3bb810127271d400f7be99cc1f4504ab4c1a',
    '0xa305fab8bda7e1638235b054889b3217441dd645',
    '0x15',
    undefined,
  );
  expect(geth.getAddresses).toHaveBeenCalledWith([
    '0x71df3bb810127271d400f7be99cc1f4504ab4c1a',
  ]);
  expect(geth.isContract).toHaveBeenCalledWith(
    '0xa305fab8bda7e1638235b054889b3217441dd645',
  );
});

test('buildUnsignedTx with contract', async () => {
  geth.getFeePricePerUnit.mockReturnValueOnce(
    Promise.resolve({ normal: { price: new BigNumber(30000000000) } }),
  );
  geth.estimateGasLimit.mockResolvedValueOnce('0x30d40');
  geth.isContract.mockResolvedValueOnce(true);
  geth.getAddresses.mockResolvedValueOnce([{ nonce: 11 }]);

  await expect(
    provider.buildUnsignedTx({
      inputs: [
        {
          address: '0x71df3bb810127271d400f7be99cc1f4504ab4c1a',
          value: new BigNumber(21),
        },
      ],
      outputs: [
        {
          address: '0xa305fab8bda7e1638235b054889b3217441dd645',
          value: new BigNumber(21),
        },
      ],
      payload: { data: '0x0102030405' },
    }),
  ).resolves.toStrictEqual({
    inputs: [
      {
        address: '0x71df3bb810127271d400f7be99cc1f4504ab4c1a',
        value: new BigNumber(21),
      },
    ],
    outputs: [
      {
        address: '0xa305fab8bda7e1638235b054889b3217441dd645',
        value: new BigNumber(21),
      },
    ],
    nonce: 11,
    feeLimit: new BigNumber(240000),
    feePricePerUnit: new BigNumber(30000000000),
    payload: {
      data: '0x0102030405',
    },
  });
  expect(geth.getFeePricePerUnit).toHaveBeenCalledTimes(1);
  expect(geth.estimateGasLimit).toHaveBeenCalledWith(
    '0x71df3bb810127271d400f7be99cc1f4504ab4c1a',
    '0xa305fab8bda7e1638235b054889b3217441dd645',
    '0x15',
    '0x0102030405',
  );
  expect(geth.getAddresses).toHaveBeenCalledWith([
    '0x71df3bb810127271d400f7be99cc1f4504ab4c1a',
  ]);
  expect(geth.isContract).toHaveBeenCalledWith(
    '0xa305fab8bda7e1638235b054889b3217441dd645',
  );
});

test('buildUnsignedTx with ERC20', async () => {
  geth.getFeePricePerUnit.mockReturnValueOnce(
    Promise.resolve({ normal: { price: new BigNumber(30000000000) } }),
  );
  geth.estimateGasLimit.mockResolvedValueOnce('0x30d40');
  geth.isContract.mockResolvedValueOnce(true);
  geth.getAddresses.mockResolvedValueOnce([{ nonce: 11 }]);

  await expect(
    provider.buildUnsignedTx({
      inputs: [
        {
          address: '0x71df3bb810127271d400f7be99cc1f4504ab4c1a',
          value: new BigNumber(21),
          tokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        },
      ],
      outputs: [
        {
          address: '0xa305fab8bda7e1638235b054889b3217441dd645',
          value: new BigNumber(21),
          tokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        },
      ],
      payload: { data: '0x0102030405' },
    }),
  ).resolves.toStrictEqual({
    inputs: [
      {
        address: '0x71df3bb810127271d400f7be99cc1f4504ab4c1a',
        value: new BigNumber(21),
        tokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      },
    ],
    outputs: [
      {
        address: '0xa305fab8bda7e1638235b054889b3217441dd645',
        value: new BigNumber(21),
        tokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      },
    ],
    nonce: 11,
    feeLimit: new BigNumber(240000),
    feePricePerUnit: new BigNumber(30000000000),
    payload: {
      data: '0xa9059cbb000000000000000000000000a305fab8bda7e1638235b054889b3217441dd6450000000000000000000000000000000000000000000000000000000000000015',
    },
  });
  expect(geth.getFeePricePerUnit).toHaveBeenCalledTimes(1);
  expect(geth.estimateGasLimit).toHaveBeenCalledWith(
    '0x71df3bb810127271d400f7be99cc1f4504ab4c1a',
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    '0x00',
    '0xa9059cbb000000000000000000000000a305fab8bda7e1638235b054889b3217441dd6450000000000000000000000000000000000000000000000000000000000000015',
  );
  expect(geth.getAddresses).toHaveBeenCalledWith([
    '0x71df3bb810127271d400f7be99cc1f4504ab4c1a',
  ]);
  expect(geth.isContract).not.toBeCalled();
});

test('signTransaction', async () => {
  const signer: any = { sign: jest.fn() };
  signer.sign.mockResolvedValueOnce([
    Buffer.from(
      '18c8df4036ef8e80434b789d84e14bbbc4db461bfcc14ffdf4faf4784cd8bf4f557d08ae22b87620bbadfb75e27a33ce4fb03aabd95c30925b4483315ab4493f',
      'hex',
    ),
    0,
  ]);

  await expect(
    provider.signTransaction(
      {
        inputs: [
          {
            address: '0x71df3bb810127271d400f7be99cc1f4504ab4c1a',
            value: new BigNumber('14995659910000000000'),
          },
        ],
        outputs: [
          {
            address: '0xa305fab8bda7e1638235b054889b3217441dd645',
            value: new BigNumber('14995659910000000000'),
          },
        ],
        nonce: 0,
        feeLimit: new BigNumber('21000'),
        feePricePerUnit: new BigNumber('107670000000'),
        payload: {},
      },
      { '0x71df3bb810127271d400f7be99cc1f4504ab4c1a': signer },
    ),
  ).resolves.toStrictEqual({
    txid: '0xd27c78c026978846312d70cb56f8e2863b5480a37159dab9e22fb8cdd5127469',
    rawTx:
      '0xf86c80851911a1d18082520894a305fab8bda7e1638235b054889b3217441dd64588d01b493cdc1dbc008025a018c8df4036ef8e80434b789d84e14bbbc4db461bfcc14ffdf4faf4784cd8bf4fa0557d08ae22b87620bbadfb75e27a33ce4fb03aabd95c30925b4483315ab4493f',
  });
});

test('signTransaction with token', async () => {
  const signer: any = { sign: jest.fn() };
  signer.sign.mockResolvedValueOnce([
    Buffer.from(
      'ff00510948d652626624d8f518309a66f7ec2149da47735f378e90c267c579f822afc54c308fcddd4a19b313ecf03be9ee328e670e9109f141902dd89e43aaf7',
      'hex',
    ),
    1,
  ]);

  await expect(
    provider.signTransaction(
      {
        inputs: [
          {
            address: '0x9ce42ba2d6bb04f1e464520b044012187782f869',
            value: new BigNumber('13170924111'),
            tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          },
        ],
        outputs: [
          {
            address: '0xa305fab8bda7e1638235b054889b3217441dd645',
            value: new BigNumber('13170924111'),
            tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          },
        ],
        nonce: 0,
        feeLimit: new BigNumber('57393'),
        feePricePerUnit: new BigNumber('100000000000'),
        payload: {
          data: '0xa9059cbb000000000000000000000000a305fab8bda7e1638235b054889b3217441dd64500000000000000000000000000000000000000000000000000000003110c5a4f',
        },
      },
      { '0x9ce42ba2d6bb04f1e464520b044012187782f869': signer },
    ),
  ).resolves.toStrictEqual({
    txid: '0xaee8c4369180309b99abc48b736fbda7a70c1de014f902cb2fc2e3441a72e4fa',
    rawTx:
      '0xf8a98085174876e80082e03194a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4880b844a9059cbb000000000000000000000000a305fab8bda7e1638235b054889b3217441dd64500000000000000000000000000000000000000000000000000000003110c5a4f26a0ff00510948d652626624d8f518309a66f7ec2149da47735f378e90c267c579f8a022afc54c308fcddd4a19b313ecf03be9ee328e670e9109f141902dd89e43aaf7',
  });
});

test('signTransaction EIP1559', async () => {
  const signer: any = { sign: jest.fn() };
  signer.sign.mockResolvedValueOnce([
    Buffer.from(
      '77076614d925b9bc70d3c1c0d04a98962c605b94812b0703af640bbdaa9529e25cedb3f7dd6580f280e8f078c6b51ebfb966d2c48085e36b34da8778fbfc0121',
      'hex',
    ),
    1,
  ]);

  await expect(
    provider.signTransaction(
      {
        inputs: [
          {
            address: '0x1ad91ee08f21be3de0ba2ba6918e714da6b45836',
            value: new BigNumber('0x01809587ac41aa00'),
          },
        ],
        outputs: [
          {
            address: '0xd60dd882028ecd3be2bd2bdc9d116ca28ff1033b',
            value: new BigNumber('0x01809587ac41aa00'),
          },
        ],
        nonce: 2727821,
        feeLimit: new BigNumber('0x0186a0'),
        feePricePerUnit: undefined,
        payload: {
          EIP1559Enabled: true,
          maxPriorityFeePerGas: '0x3b9aca00',
          maxFeePerGas: '0x159e792961',
        },
      },
      { '0x1ad91ee08f21be3de0ba2ba6918e714da6b45836': signer },
    ),
  ).resolves.toStrictEqual({
    txid: '0xd4ae4596acdc5a2e0df5d845fd64dbfe45146cbb441b488ea500161fe3f92e36',
    rawTx:
      '0x02f8770183299f8d843b9aca0085159e792961830186a094d60dd882028ecd3be2bd2bdc9d116ca28ff1033b8801809587ac41aa0080c001a077076614d925b9bc70d3c1c0d04a98962c605b94812b0703af640bbdaa9529e2a05cedb3f7dd6580f280e8f078c6b51ebfb966d2c48085e36b34da8778fbfc0121',
  });
});
