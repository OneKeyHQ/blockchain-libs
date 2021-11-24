import BigNumber from 'bignumber.js';

import { Provider } from '../../../../src/provider/chains/algo';

const chainInfo: any = {};
const algod: any = {
  getSuggestedParams: jest.fn(),
};
const provider = new Provider(chainInfo, () => Promise.resolve(algod));

test('verifyAddress', async () => {
  await expect(
    provider.verifyAddress(
      'GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A',
    ),
  ).resolves.toEqual({
    isValid: true,
    normalizedAddress:
      'GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A',
    displayAddress:
      'GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A',
  });

  await expect(
    provider.verifyAddress(
      'gd64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A',
    ),
  ).resolves.toEqual({
    isValid: false,
  });

  await expect(
    provider.verifyAddress(
      'GGD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A',
    ),
  ).resolves.toEqual({
    isValid: false,
  });

  await expect(
    provider.verifyAddress(
      'GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5AB',
    ),
  ).resolves.toEqual({
    isValid: false,
  });

  await expect(
    provider.verifyAddress(
      'GD64YIY3WGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A',
    ),
  ).resolves.toEqual({
    isValid: false,
  });

  await expect(provider.verifyAddress('')).resolves.toEqual({
    isValid: false,
  });

  await expect(provider.verifyAddress('0x')).resolves.toEqual({
    isValid: false,
  });
});

test('verifyTokenAddress', async () => {
  await expect(provider.verifyTokenAddress('0')).resolves.toEqual({
    isValid: true,
    normalizedAddress: '0',
    displayAddress: '0',
  });
  await expect(
    provider.verifyTokenAddress('18446744073709551615'),
  ).resolves.toEqual({
    isValid: true,
    normalizedAddress: '18446744073709551615',
    displayAddress: '18446744073709551615',
  });
  await expect(
    provider.verifyTokenAddress('18446744073709551616'),
  ).resolves.toEqual({
    isValid: false,
  });
  await expect(provider.verifyTokenAddress('-1')).resolves.toEqual({
    isValid: false,
  });
  await expect(provider.verifyTokenAddress('')).resolves.toEqual({
    isValid: false,
  });
  await expect(provider.verifyTokenAddress('hello')).resolves.toEqual({
    isValid: false,
  });
});

test('pubkeyToAddress', async () => {
  const verifier: any = {
    getPubkey: jest
      .fn()
      .mockResolvedValueOnce(
        Buffer.from(
          'f2a21123212974149cce8b909d5297a53c3ec2bf2f2f97d7483a4ba8094ca7e5',
          'hex',
        ),
      ),
  };
  await expect(provider.pubkeyToAddress(verifier, undefined)).resolves.toBe(
    '6KRBCIZBFF2BJHGOROIJ2UUXUU6D5QV7F4XZPV2IHJF2QCKMU7S4ECYHUA',
  );
  expect(verifier.getPubkey).toHaveBeenCalledWith(false);
});

test('buildUnsignedTx with placeholder tx', async () => {
  await expect(
    provider.buildUnsignedTx({ inputs: [], outputs: [], payload: {} }),
  ).resolves.toStrictEqual({
    inputs: [],
    outputs: [],
    payload: {},
    feeLimit: new BigNumber(1000),
    feePricePerUnit: new BigNumber(1),
  });
});

test('buildUnsignedTx after filling in basic information', async () => {
  const fakeTimer = jest.useFakeTimers();
  fakeTimer.setSystemTime(1600000000000);

  const suggestedParams = {
    flatFee: false,
    fee: 0,
    firstRound: 14363848,
    lastRound: 14364848,
    genesisID: 'testnet-v1.0',
    genesisHash: 'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
  };

  algod.getSuggestedParams.mockResolvedValue(Promise.resolve(suggestedParams));

  const basicInfo = {
    inputs: [
      {
        address: '6KRBCIZBFF2BJHGOROIJ2UUXUU6D5QV7F4XZPV2IHJF2QCKMU7S4ECYHUA',
        value: new BigNumber(10000),
      },
    ],
    outputs: [
      {
        address: 'GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A',
        value: new BigNumber(10000),
      },
    ],
    payload: {},
  };
  const expectedFirst = {
    ...basicInfo,
    payload: {
      suggestedParams: suggestedParams,
      suggestedParamsExpiredAt: 1600000600000,
    },
    feeLimit: new BigNumber(1000),
    feePricePerUnit: new BigNumber(1),
  };

  await expect(provider.buildUnsignedTx(basicInfo)).resolves.toStrictEqual(
    expectedFirst,
  );
  expect(algod.getSuggestedParams).toHaveBeenCalledTimes(1);

  // use previous suggestedParams
  fakeTimer.setSystemTime(1600000600000 - 1);
  algod.getSuggestedParams.mockClear();
  await expect(provider.buildUnsignedTx(expectedFirst)).resolves.toStrictEqual(
    expectedFirst,
  );
  expect(algod.getSuggestedParams).not.toHaveBeenCalled();

  fakeTimer.setSystemTime(1600000600000);
  await expect(provider.buildUnsignedTx(expectedFirst)).resolves.toStrictEqual({
    ...expectedFirst,
    payload: {
      ...expectedFirst.payload,
      suggestedParamsExpiredAt: 1600001200000,
    },
  });
  expect(algod.getSuggestedParams).toHaveBeenCalledTimes(1);
});

test('signTransaction for payment', async () => {
  jest.useFakeTimers().setSystemTime(1600000000000);

  const signer: any = {
    sign: jest
      .fn()
      .mockResolvedValueOnce([
        Buffer.from(
          '590bd43db6bc49529468bff5fb390ed8d1212efca463d6b4c4997f9494ce923215777c255f6664f8eff223c13f2fe7dc1258d6c362b496b6e5361ba43ece300f',
          'hex',
        ),
        0,
      ]),
  };

  await expect(
    provider.signTransaction(
      {
        inputs: [
          {
            address:
              '6KRBCIZBFF2BJHGOROIJ2UUXUU6D5QV7F4XZPV2IHJF2QCKMU7S4ECYHUA',
            value: new BigNumber(10000),
          },
        ],
        outputs: [
          {
            address:
              'GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A',
            value: new BigNumber(10000),
          },
        ],
        payload: {
          suggestedParamsExpiredAt: 1600000000000 - 1,
          suggestedParams: {
            flatFee: false,
            fee: 0,
            firstRound: 14363848,
            lastRound: 14364848,
            genesisID: 'testnet-v1.0',
            genesisHash: 'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
          },
        },
      },
      {
        '6KRBCIZBFF2BJHGOROIJ2UUXUU6D5QV7F4XZPV2IHJF2QCKMU7S4ECYHUA': signer,
      },
    ),
  ).resolves.toStrictEqual({
    txid: 'FXCX7KGHFIHI3TCFQGS5WG4WWCMGGK6XD5HR6IA6TSQFR62DGLEA',
    rawTx:
      'gqNzaWfEQFkL1D22vElSlGi/9fs5DtjRIS78pGPWtMSZf5SUzpIyFXd8JV9mZPjv8iPBPy/n3BJY1sNitJa25TYbpD7OMA+jdHhuiaNhbXTNJxCjZmVlzQPoomZ2zgDbLMijZ2VurHRlc3RuZXQtdjEuMKJnaMQgSGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiKibHbOANswsKNyY3bEIDD9zCMbnYw2Ca9/e7Hl74+WOkiwchNSje+9iG2WrkiEo3NuZMQg8qIRIyEpdBSczouQnVKXpTw+wr8vL5fXSDpLqAlMp+WkdHlwZaNwYXk=',
  });

  await expect(() =>
    provider.signTransaction(
      {
        inputs: [
          {
            address:
              '6KRBCIZBFF2BJHGOROIJ2UUXUU6D5QV7F4XZPV2IHJF2QCKMU7S4ECYHUA',
            value: new BigNumber(10000),
          },
        ],
        outputs: [
          {
            address:
              'GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A',
            value: new BigNumber(10000),
          },
        ],
        payload: {
          suggestedParamsExpiredAt: 1600000000000,
          suggestedParams: {
            flatFee: false,
            fee: 0,
            firstRound: 14363848,
            lastRound: 14364848,
            genesisID: 'testnet-v1.0',
            genesisHash: 'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
          },
        },
      },
      {
        '6KRBCIZBFF2BJHGOROIJ2UUXUU6D5QV7F4XZPV2IHJF2QCKMU7S4ECYHUA': signer,
      },
    ),
  ).rejects.toThrow('Please refresh suggestedParams');
});

test('signTransaction for token transfer', async () => {
  jest.useFakeTimers().setSystemTime(1600000000000);

  const signer: any = {
    sign: jest
      .fn()
      .mockResolvedValueOnce([
        Buffer.from(
          '590bd43db6bc49529468bff5fb390ed8d1212efca463d6b4c4997f9494ce923215777c255f6664f8eff223c13f2fe7dc1258d6c362b496b6e5361ba43ece300f',
          'hex',
        ),
        0,
      ]),
  };

  await expect(
    provider.signTransaction(
      {
        inputs: [
          {
            address:
              '6KRBCIZBFF2BJHGOROIJ2UUXUU6D5QV7F4XZPV2IHJF2QCKMU7S4ECYHUA',
            value: new BigNumber(10000),
            tokenAddress: '123456',
          },
        ],
        outputs: [
          {
            address:
              'GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A',
            value: new BigNumber(10000),
            tokenAddress: '123456',
          },
        ],
        payload: {
          suggestedParamsExpiredAt: 1600000000000 - 1,
          suggestedParams: {
            flatFee: false,
            fee: 0,
            firstRound: 14363848,
            lastRound: 14364848,
            genesisID: 'testnet-v1.0',
            genesisHash: 'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
          },
        },
      },
      {
        '6KRBCIZBFF2BJHGOROIJ2UUXUU6D5QV7F4XZPV2IHJF2QCKMU7S4ECYHUA': signer,
      },
    ),
  ).resolves.toStrictEqual({
    txid: '3VIYABXNKDGXYFJ2SXKBVDQ3FXDGBRNYOWG5OGJ5O4BY7LAK5SFA',
    rawTx:
      'gqNzaWfEQFkL1D22vElSlGi/9fs5DtjRIS78pGPWtMSZf5SUzpIyFXd8JV9mZPjv8iPBPy/n3BJY1sNitJa25TYbpD7OMA+jdHhuiqRhYW10zScQpGFyY3bEIDD9zCMbnYw2Ca9/e7Hl74+WOkiwchNSje+9iG2WrkiEo2ZlZc0D6KJmds4A2yzIo2dlbqx0ZXN0bmV0LXYxLjCiZ2jEIEhjtRiks8hOyBDyLU8QgcsPcfBZp6wg3sYvf3DlCToiomx2zgDbMLCjc25kxCDyohEjISl0FJzOi5CdUpelPD7Cvy8vl9dIOkuoCUyn5aR0eXBlpWF4ZmVypHhhaWTOAAHiQA==',
  });
});
