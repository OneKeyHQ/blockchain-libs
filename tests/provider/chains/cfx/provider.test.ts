import BigNumber from 'bignumber.js';

import { Conflux } from '../../../../src/provider/chains/cfx';

jest.mock('../../../../src/provider/chains/cfx');
const { Provider } = jest.requireActual('../../../../src/provider/chains/cfx');
const mockedClassConflux = Conflux as jest.MockedClass<typeof Conflux>;
let provider: any;
let conflux: any;
let chainInfo: any;

beforeEach(() => {
  conflux = new mockedClassConflux('https://conflux.mock/rpc');
  chainInfo = {
    implOptions: { chainId: '1' },
  };
  provider = new Provider(chainInfo, () => Promise.resolve(conflux));
});

describe('verifyAddress', () => {
  test('verify testnet address', async () => {
    await expect(
      provider.verifyAddress(
        'cfxtest:aamt7ycdybdb5j307yw5t5ejx8d854ykjjhv7n8h6v',
      ),
    ).resolves.toStrictEqual({
      normalizedAddress: 'cfxtest:aamt7ycdybdb5j307yw5t5ejx8d854ykjjhv7n8h6v',
      displayAddress: 'cfxtest:aamt7ycdybdb5j307yw5t5ejx8d854ykjjhv7n8h6v',
      isValid: true,
    });
  });
  test('verify valid mainnet address', async () => {
    await expect(
      provider.verifyAddress('cfx:aaknd2naz3pwkgrxdjy5nxp2p352bpdg42bgmwnwjt'),
    ).resolves.toStrictEqual({
      normalizedAddress: 'cfx:aaknd2naz3pwkgrxdjy5nxp2p352bpdg42bgmwnwjt',
      displayAddress: 'cfx:aaknd2naz3pwkgrxdjy5nxp2p352bpdg42bgmwnwjt',
      isValid: true,
    });
  });
  test('verify invalid address empty string', async () => {
    await expect(provider.verifyAddress('')).resolves.toStrictEqual({
      isValid: false,
      displayAddress: undefined,
      normalizedAddress: undefined,
    });
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
    'cfxtest:aatvt6p0fp5skerxbkaneuc2khw3tsw90y11js9sgj',
  );
  expect(verifier.getPubkey).toHaveBeenCalledWith(false);
});

describe('buildUnsignedTx', () => {
  test('with placeholder tx', async () => {
    conflux.getFeePricePerUnit.mockReturnValueOnce(
      Promise.resolve({ normal: { price: new BigNumber(1) } }),
    );

    await expect(
      provider.buildUnsignedTx({ inputs: [], outputs: [], payload: {} }),
    ).resolves.toStrictEqual({
      inputs: [],
      outputs: [],
      nonce: undefined,
      feeLimit: new BigNumber(21000),
      feePricePerUnit: new BigNumber(1),
      payload: {},
    });

    expect(conflux.getFeePricePerUnit).toHaveBeenCalledTimes(1);
    expect(conflux.estimateGasLimit).not.toBeCalled();
    expect(conflux.getAddresses).not.toBeCalled();
    expect(conflux.isContract).not.toBeCalled();
  });

  test('with filled basic information', async () => {
    conflux.getFeePricePerUnit.mockReturnValueOnce(
      Promise.resolve({ normal: { price: new BigNumber(1) } }),
    );
    conflux.estimateGasLimit.mockResolvedValueOnce('0x5208');
    conflux.isContract.mockResolvedValueOnce(false);
    conflux.getAddresses.mockResolvedValueOnce([{ nonce: 11 }]);
    conflux.getEpochNumber.mockResolvedValueOnce(new BigNumber(110));
    conflux.estimateGasAndCollateral.mockResolvedValueOnce(['0x5208', '0x0']);

    await expect(
      provider.buildUnsignedTx({
        inputs: [
          {
            address: 'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp',
            value: new BigNumber(21),
          },
        ],
        outputs: [
          {
            address: 'cfxtest:aaknd2naz3pwkgrxdjy5nxp2p352bpdg42nr3cr2pf',
            value: new BigNumber(21),
          },
        ],
        payload: {},
      }),
    ).resolves.toStrictEqual({
      inputs: [
        {
          address: 'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp',
          value: new BigNumber(21),
        },
      ],
      outputs: [
        {
          address: 'cfxtest:aaknd2naz3pwkgrxdjy5nxp2p352bpdg42nr3cr2pf',
          value: new BigNumber(21),
        },
      ],
      nonce: 11,
      feeLimit: new BigNumber(21000),
      feePricePerUnit: new BigNumber(1),
      payload: {
        storageLimit: new BigNumber(0),
        epochHeight: new BigNumber(110),
      },
    });
    expect(conflux.getFeePricePerUnit).toHaveBeenCalledTimes(1);
    expect(conflux.estimateGasLimit).toHaveBeenCalledWith(
      'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp',
      'cfxtest:aaknd2naz3pwkgrxdjy5nxp2p352bpdg42nr3cr2pf',
      '0x15',
      undefined,
    );
    expect(conflux.getAddresses).toHaveBeenCalledWith([
      'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp',
    ]);
    expect(conflux.isContract).toHaveBeenCalledWith(
      'cfxtest:aaknd2naz3pwkgrxdjy5nxp2p352bpdg42nr3cr2pf',
    );
  });

  test('with contract', async () => {
    conflux.getFeePricePerUnit.mockReturnValueOnce(
      Promise.resolve({ normal: { price: new BigNumber(1) } }),
    );
    conflux.estimateGasLimit.mockResolvedValueOnce('0x30d40');
    conflux.isContract.mockResolvedValueOnce(true);
    conflux.getAddresses.mockResolvedValueOnce([{ nonce: 11 }]);
    conflux.getEpochNumber.mockResolvedValueOnce(new BigNumber(110));
    conflux.estimateGasAndCollateral.mockResolvedValueOnce(['0x30d40', '0x0']);

    await expect(
      provider.buildUnsignedTx({
        inputs: [
          {
            address: 'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp',
            value: new BigNumber(21),
          },
        ],
        outputs: [
          {
            address: 'cfxtest:acepe88unk7fvs18436178up33hb4zkuf62a9dk1gv',
            value: new BigNumber(21),
          },
        ],
        payload: { data: '0x0102030405' },
      }),
    ).resolves.toStrictEqual({
      inputs: [
        {
          address: 'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp',
          value: new BigNumber(21),
        },
      ],
      outputs: [
        {
          address: 'cfxtest:acepe88unk7fvs18436178up33hb4zkuf62a9dk1gv',
          value: new BigNumber(21),
        },
      ],
      nonce: 11,
      feeLimit: new BigNumber(240000),
      feePricePerUnit: new BigNumber(1),
      payload: {
        data: '0x0102030405',
        storageLimit: new BigNumber(0),
        epochHeight: new BigNumber(110),
      },
    });
    expect(conflux.getFeePricePerUnit).toHaveBeenCalledTimes(1);
    expect(conflux.estimateGasLimit).toHaveBeenCalledWith(
      'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp',
      'cfxtest:acepe88unk7fvs18436178up33hb4zkuf62a9dk1gv',
      '0x15',
      '0x0102030405',
    );
    expect(conflux.getAddresses).toHaveBeenCalledWith([
      'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp',
    ]);
    expect(conflux.isContract).toHaveBeenCalledWith(
      'cfxtest:acepe88unk7fvs18436178up33hb4zkuf62a9dk1gv',
    );
  });

  test('with ERC20', async () => {
    conflux.getFeePricePerUnit.mockReturnValueOnce(
      Promise.resolve({ normal: { price: new BigNumber(1) } }),
    );
    conflux.isContract.mockResolvedValueOnce(true);
    conflux.getAddresses.mockResolvedValueOnce([{ nonce: 11 }]);
    conflux.getEpochNumber.mockResolvedValueOnce(new BigNumber(110));
    conflux.estimateGasLimit.mockResolvedValueOnce('0x30d40');
    conflux.estimateGasAndCollateral.mockResolvedValueOnce(['0x30d40', '0x00']);

    await expect(
      provider.buildUnsignedTx({
        inputs: [
          {
            address: 'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp',
            value: new BigNumber(21),
            tokenAddress: 'cfxtest:acepe88unk7fvs18436178up33hb4zkuf62a9dk1gv',
          },
        ],
        outputs: [
          {
            address: 'cfxtest:aaknd2naz3pwkgrxdjy5nxp2p352bpdg42nr3cr2pf',
            value: new BigNumber(21),
            tokenAddress: 'cfxtest:acepe88unk7fvs18436178up33hb4zkuf62a9dk1gv',
          },
        ],
        payload: {},
      }),
    ).resolves.toStrictEqual({
      inputs: [
        {
          address: 'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp',
          value: new BigNumber(21),
          tokenAddress: 'cfxtest:acepe88unk7fvs18436178up33hb4zkuf62a9dk1gv',
        },
      ],
      outputs: [
        {
          address: 'cfxtest:aaknd2naz3pwkgrxdjy5nxp2p352bpdg42nr3cr2pf',
          value: new BigNumber(21),
          tokenAddress: 'cfxtest:acepe88unk7fvs18436178up33hb4zkuf62a9dk1gv',
        },
      ],
      nonce: 11,
      feeLimit: new BigNumber(240000),
      feePricePerUnit: new BigNumber(1),
      payload: {
        data: '0xa9059cbb00000000000000000000000012b1e160ae592499b31a29b5cd98667780b066d60000000000000000000000000000000000000000000000000000000000000015',
        storageLimit: new BigNumber(0),
        epochHeight: new BigNumber(110),
      },
    });
    expect(conflux.getFeePricePerUnit).toHaveBeenCalledTimes(1);
    expect(conflux.estimateGasLimit).toHaveBeenCalledWith(
      'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp',
      'cfxtest:acepe88unk7fvs18436178up33hb4zkuf62a9dk1gv',
      '0x00',
      '0xa9059cbb00000000000000000000000012b1e160ae592499b31a29b5cd98667780b066d60000000000000000000000000000000000000000000000000000000000000015',
    );
    expect(conflux.getAddresses).toHaveBeenCalledWith([
      'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp',
    ]);
    expect(conflux.isContract).not.toBeCalled();
  });
});

describe('signTransaction', () => {
  test('sign CFX Transfer Tx', async () => {
    const signer: any = { sign: jest.fn() };
    signer.sign.mockResolvedValueOnce([
      Buffer.from(
        '56ec975b033cfa511ab90acafa5cc1e37f0c90cb2a50c6463065e86f32571dae33865c56270d21ffb56dc87e5668a468f157f9d7a260f39947c96987591f6aef',
        'hex',
      ),
      0,
    ]);

    await expect(
      provider.signTransaction(
        {
          inputs: [
            {
              address: 'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp',
              value: new BigNumber(1000000),
            },
          ],
          outputs: [
            {
              address: 'cfxtest:aaknd2naz3pwkgrxdjy5nxp2p352bpdg42nr3cr2pf',
              value: new BigNumber(1000000),
            },
          ],
          nonce: 15,
          feeLimit: new BigNumber(21000),
          feePricePerUnit: new BigNumber(1),
          payload: {
            storageLimit: 0,
            epochHeight: 32453558,
          },
        },
        { 'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp': signer },
      ),
    ).resolves.toStrictEqual({
      txid: '0x04b9f5bd832eb00b057604c768d3dd5a4dab11b0bb5265e00ca4a305e6f7c293',
      rawTx:
        '0xf86ae60f018252089412b1e160ae592499b31a29b5cd98667780b066d6830f4240808401ef33b6018080a056ec975b033cfa511ab90acafa5cc1e37f0c90cb2a50c6463065e86f32571daea033865c56270d21ffb56dc87e5668a468f157f9d7a260f39947c96987591f6aef',
    });
  });

  test('sign CRC20 Transfer Tx', async () => {
    const signer: any = { sign: jest.fn() };
    signer.sign.mockResolvedValueOnce([
      Buffer.from(
        'e98ae277c67e3a1cd170b2194077a2341b170ab86d3e7dc998ea5a2a446277a45834df1afd82a7558050dbbf58a671e73ec3ece64f35dbeb8f3cca6dc139b608',
        'hex',
      ),
      1,
    ]);

    await expect(
      provider.signTransaction(
        {
          inputs: [
            {
              address: 'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp',
              value: new BigNumber(1000000),
              tokenAddress:
                'cfxtest:acepe88unk7fvs18436178up33hb4zkuf62a9dk1gv',
            },
          ],
          outputs: [
            {
              address: 'cfxtest:aaknd2naz3pwkgrxdjy5nxp2p352bpdg42nr3cr2pf',
              value: new BigNumber(1000000),
              tokenAddress:
                'cfxtest:acepe88unk7fvs18436178up33hb4zkuf62a9dk1gv',
            },
          ],
          nonce: 16,
          feeLimit: new BigNumber(55134),
          feePricePerUnit: new BigNumber(1),
          payload: {
            data: '0xa9059cbb00000000000000000000000012b1e160ae592499b31a29b5cd98667780b066d600000000000000000000000000000000000000000000000000000000000f4240',
            storageLimit: 128,
            epochHeight: 32454546,
          },
        },
        { 'cfxtest:aakrn3d7hezu0tcafpe92bbbsy1fw2u5za1xa2uvgp': signer },
      ),
    ).resolves.toStrictEqual({
      txid: '0x0a12175e70fd78db5dd647b45d863680e33a1bc1f25c2902e68d25dfc9c7f38f',
      rawTx:
        '0xf8aef869100182d75e9488c27bd05a7a58bafed6797efa0cce4e1d55302f8081808401ef379201b844a9059cbb00000000000000000000000012b1e160ae592499b31a29b5cd98667780b066d600000000000000000000000000000000000000000000000000000000000f424001a0e98ae277c67e3a1cd170b2194077a2341b170ab86d3e7dc998ea5a2a446277a4a05834df1afd82a7558050dbbf58a671e73ec3ece64f35dbeb8f3cca6dc139b608',
    });
  });
});
