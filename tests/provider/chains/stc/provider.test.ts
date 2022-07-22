
import { StcClient } from '../../../../src/provider/chains/stc';

jest.mock('../../../../src/provider/chains/stc');
const { Provider } = jest.requireActual('../../../../src/provider/chains/stc');
const mockedClassStcClient = StcClient as jest.MockedClass<typeof StcClient>;
let provider: any;
let stcClient: any;
let chainInfo: any;

beforeEach(() => {
  stcClient = new mockedClassStcClient('https://stcClient.mock/rpc');
  chainInfo = {
    implOptions: { chainId: '251' },
  };
  provider = new Provider(chainInfo, () => Promise.resolve(stcClient));
});

describe('verifyAddress', () => {
  test('verify hex encoding address with 0x prefix', async () => {
    await expect(
      provider.verifyAddress('0xb61a35af603018441b06177a8820ff2a'),
    ).resolves.toStrictEqual({
      normalizedAddress: '0xb61a35af603018441b06177a8820ff2a',
      displayAddress: '0xb61a35af603018441b06177a8820ff2a',
      isValid: true,
      encoding: 'hex',
    });
  });
  test('verify hex encoding address without 0x prefix', async () => {
    await expect(
      provider.verifyAddress('b61a35af603018441b06177a8820ff2a'),
    ).resolves.toStrictEqual({
      normalizedAddress: 'b61a35af603018441b06177a8820ff2a',
      displayAddress: 'b61a35af603018441b06177a8820ff2a',
      isValid: true,
      encoding: 'hex',
    });
  });
  test('verify hex encoding address with shorter length', async () => {
    await expect(
      provider.verifyAddress('0xb61a35af603018441b06177a8820ff2'),
    ).resolves.toStrictEqual({
      normalizedAddress: undefined,
      displayAddress: undefined,
      isValid: false,
      encoding: undefined,
    });
  });
  test('verify hex encoding address with longer length', async () => {
    await expect(
      provider.verifyAddress('0xb61a35af603018441b06177a8820ff2ab'),
    ).resolves.toStrictEqual({
      normalizedAddress: undefined,
      displayAddress: undefined,
      isValid: false,
      encoding: undefined,
    });
  });
  test('verify bech32 receiptIdentifier encoded with auth key', async () => {
    await expect(
      provider.verifyAddress(
        'stc1pr9xnd0n9492jq8k8j9nt3r9p3cf88k6a7wtl9cyal2773ap3x6lpjnfkhej6j4fqrmreze4c3jscug7yx2e',
      ),
    ).resolves.toStrictEqual({
      normalizedAddress: '0x194d36be65a955201ec79166b88ca18e',
      displayAddress:
        'stc1pr9xnd0n9492jq8k8j9nt3r9p3cf88k6a7wtl9cyal2773ap3x6lpjnfkhej6j4fqrmreze4c3jscug7yx2e',
      isValid: true,
      encoding: 'bech32',
    });
  });
  test('verify bech32 receiptIdentifier encoded without auth key', async () => {
    await expect(
      provider.verifyAddress('stc1pr9xnd0n9492jq8k8j9nt3r9p3crvw030'),
    ).resolves.toStrictEqual({
      normalizedAddress: '0x194d36be65a955201ec79166b88ca18e',
      displayAddress: 'stc1pr9xnd0n9492jq8k8j9nt3r9p3crvw030',
      isValid: true,
      encoding: 'bech32',
    });
  });
  test('verify bech32 receiptIdentifier with invalid length', async () => {
    await expect(
      provider.verifyAddress('stc1pr9xnd0n9492jq8k8j9nt3r9p3crvw03'),
    ).resolves.toStrictEqual({
      normalizedAddress: undefined,
      displayAddress: undefined,
      isValid: false,
      encoding: undefined,
    });
  });
});

describe('pubkeyToAddress', () => {
  const verifier: any = {
    getPubkey: jest.fn(),
  };
  beforeEach(() => {
    verifier.getPubkey.mockReturnValueOnce(
      Buffer.from(
        '63f3260100a7d409728984bfd3d8eac9a7a6dffb98db65fecc01d6df184f292a',
        'hex',
      ),
    );
  });
  test('pubkey to address with encoding hex', async () => {
    await expect(provider.pubkeyToAddress(verifier, 'hex')).resolves.toBe(
      '0x194d36be65a955201ec79166b88ca18e',
    );
    expect(verifier.getPubkey).toHaveBeenCalledTimes(1);
  });
  test('verify pubkey to address with encoding bech32', async () => {
    await expect(provider.pubkeyToAddress(verifier, 'bech32')).resolves.toBe(
      'stc1pr9xnd0n9492jq8k8j9nt3r9p3cf88k6a7wtl9cyal2773ap3x6lpjnfkhej6j4fqrmreze4c3jscug7yx2e',
    );
    expect(verifier.getPubkey).toHaveBeenCalledTimes(1);
  });
});

// describe('buildUnsignedTx', () => {
//   test('with empty unsigned tx', async () => {
//     stcClient.getFeePricePerUnit.mockReturnValueOnce(
//       Promise.resolve({ normal: { price: new BigNumber(1) } }),
//     );
//     await expect(
//       provider.buildUnsignedTx({
//         inputs: [{ publicKey: '' }],
//         outputs: [],
//         payload: {},
//       }),
//     ).resolves.toStrictEqual({
//       inputs: [{ publicKey: '' }],
//       outputs: [],
//       nonce: undefined,
//       feeLimit: undefined,
//       feePricePerUnit: new BigNumber(1),
//       payload: {},
//     });
//     expect(stcClient.getFeePricePerUnit).toHaveBeenCalledTimes(1);
//   });
// });

// describe('signTransaction', () => {
//   const senderPublicKey =
//     '0xc375de51172059011d519df58151cca6f9f4b573756fe912bd5155ca9050571e';
//   test('sign STC transfer tx with hex to_address', async () => {
//     const signer: any = { sign: jest.fn(), getPrvkey: jest.fn() };
//     signer.sign.mockReturnValueOnce([
//       Buffer.from(
//         'a703e9ff3375a5710adc4ffad7dd343abd933ae147e9c1a17cf682db2d86f3355d6704a0e9545a20572b42a01551f850d6cf01426f0406bc6c37cb5c66388e0e',
//         'hex',
//       ),
//       0,
//     ]);
//     signer.getPrvkey.mockReturnValueOnce(
//       Buffer.from(
//         '11988279d8761e655c2f2ffdcddf36c33b5eeba2be57d20b084e078e681d5172',
//         'hex',
//       ),
//     );
//     await expect(
//       provider.signTransaction(
//         await provider.buildUnsignedTx({
//           inputs: [
//             {
//               address: '0x32ce24343393a1ebc102c66e0f6ac3aa',
//               value: new BigNumber(1024),
//               publicKey: senderPublicKey,
//             },
//           ],
//           outputs: [
//             {
//               address: '0x194d36be65a955201ec79166b88ca18e',
//               value: new BigNumber(1024),
//             },
//           ],
//           nonce: 18,
//           feeLimit: new BigNumber(10000000),
//           feePricePerUnit: new BigNumber(1),
//           payload: {
//             expirationTime: 1621325706,
//           },
//         }),
//         { '0x32ce24343393a1ebc102c66e0f6ac3aa': signer },
//       ),
//     ).resolves.toStrictEqual({
//       rawTx:
//         '0x32ce24343393a1ebc102c66e0f6ac3aa120000000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f76320107000000000000000000000000000000010353544303535443000210194d36be65a955201ec79166b88ca18e1000040000000000000000000000000000809698000000000001000000000000000d3078313a3a5354433a3a5354438a77a36000000000fb000040a703e9ff3375a5710adc4ffad7dd343abd933ae147e9c1a17cf682db2d86f3355d6704a0e9545a20572b42a01551f850d6cf01426f0406bc6c37cb5c66388e0e',
//       txid: '0xa34f34dedb132433ea85444671dbb32b033b558db6a7683f181d9c50916a120e',
//     });
//   });

//   test('sign STC transfer tx with receiptIdentifier"', async () => {
//     const signer: any = { sign: jest.fn(), getPrvkey: jest.fn() };
//     signer.sign.mockReturnValueOnce([
//       Buffer.from(
//         'a703e9ff3375a5710adc4ffad7dd343abd933ae147e9c1a17cf682db2d86f3355d6704a0e9545a20572b42a01551f850d6cf01426f0406bc6c37cb5c66388e0e',
//         'hex',
//       ),
//       0,
//     ]);
//     signer.getPrvkey.mockReturnValueOnce(
//       Buffer.from(
//         '11988279d8761e655c2f2ffdcddf36c33b5eeba2be57d20b084e078e681d5172',
//         'hex',
//       ),
//     );
//     await expect(
//       provider.signTransaction(
//         await provider.buildUnsignedTx({
//           inputs: [
//             {
//               address: '0x32ce24343393a1ebc102c66e0f6ac3aa',
//               value: new BigNumber(1024),
//               publicKey: senderPublicKey,
//             },
//           ],
//           outputs: [
//             {
//               address:
//                 'stc1pr9xnd0n9492jq8k8j9nt3r9p3cf88k6a7wtl9cyal2773ap3x6lpjnfkhej6j4fqrmreze4c3jscug7yx2e',
//               value: new BigNumber(1024),
//             },
//           ],
//           nonce: 18,
//           feeLimit: new BigNumber(10000000),
//           feePricePerUnit: new BigNumber(1),
//           payload: {
//             expirationTime: 1621325706,
//           },
//         }),
//         { '0x32ce24343393a1ebc102c66e0f6ac3aa': signer },
//       ),
//     ).resolves.toStrictEqual({
//       rawTx:
//         '0x32ce24343393a1ebc102c66e0f6ac3aa120000000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f76320107000000000000000000000000000000010353544303535443000210194d36be65a955201ec79166b88ca18e1000040000000000000000000000000000809698000000000001000000000000000d3078313a3a5354433a3a5354438a77a36000000000fb000040a703e9ff3375a5710adc4ffad7dd343abd933ae147e9c1a17cf682db2d86f3355d6704a0e9545a20572b42a01551f850d6cf01426f0406bc6c37cb5c66388e0e',
//       txid: '0xa34f34dedb132433ea85444671dbb32b033b558db6a7683f181d9c50916a120e',
//     });
//   });
// });
