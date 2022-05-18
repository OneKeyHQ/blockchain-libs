import { Provider as BCHProvider } from '../../../../src/provider/chains/bch';
import { Provider as BTCProvider } from '../../../../src/provider/chains/btc';
import AddressEncodings from '../../../../src/provider/chains/btc/sdk/addressEncodings';

import fixture from './fixture.json';

const getProvider = (chainCode: string) => {
  const chainInfo: any = { code: chainCode };
  const blockbook: any = {};

  if (chainCode === 'bch') {
    return new BCHProvider(chainInfo, () => Promise.resolve(blockbook));
  }
  return new BTCProvider(chainInfo, () => Promise.resolve(blockbook));
};

describe('pubkeyToAddress', () => {
  const verifier: any = {
    getPubkey: () => Buffer.from(fixture.pubkeyToAddress.pubkey, 'hex'),
  };

  for (const [chainCode, config] of Object.entries(
    fixture.pubkeyToAddress.chains,
  )) {
    for (const [encoding, correctAddress] of Object.entries(config)) {
      test(`${chainCode}:${encoding}`, async () => {
        await expect(
          getProvider(chainCode).pubkeyToAddress(
            verifier,
            encoding as AddressEncodings,
          ),
        ).resolves.toBe(correctAddress);
      });
    }
  }
});

describe('verifyAddress', () => {
  for (const [chainCode, config] of Object.entries(
    fixture.pubkeyToAddress.chains,
  )) {
    for (const [encoding, correctAddress] of Object.entries(config)) {
      test(`${chainCode}:${encoding}`, async () => {
        await expect(
          getProvider(chainCode).verifyAddress(correctAddress),
        ).resolves.toStrictEqual({
          isValid: true,
          displayAddress: correctAddress,
          normalizedAddress: correctAddress,
          encoding,
        });
      });
    }
  }
});

describe('signMessage', () => {
  const message = fixture.signMessage.message;
  for (const [chainCode, config] of Object.entries(
    fixture.signMessage.chains,
  )) {
    const [sigHex, recovery] = config.signed;
    const messageHash = Buffer.from(config.messageHash, 'hex');

    for (const [address, correctSig] of Object.entries(config.cases)) {
      test(`${chainCode}:${address}`, async () => {
        const signer: any = {
          sign: jest
            .fn()
            .mockResolvedValue([
              Buffer.from(sigHex as string, 'hex'),
              recovery,
            ]),
        };

        await expect(
          getProvider(chainCode).signMessage({ message }, signer, address),
        ).resolves.toBe(correctSig);

        expect(signer.sign).toHaveBeenCalledWith(messageHash);
      });
    }
  }
});

describe('verifyMessage', () => {
  const message = fixture.signMessage.message;
  for (const [chainCode, config] of Object.entries(
    fixture.signMessage.chains,
  )) {
    for (const [address, correctSig] of Object.entries(config.cases)) {
      test(`${chainCode}:${address}`, async () => {
        await expect(
          getProvider(chainCode).verifyMessage(
            address,
            { message },
            correctSig,
          ),
        ).resolves.toBe(true);
      });
    }
  }
});
