import {
  BaseBip32KeyDeriver,
  Bip32KeyDeriver,
  ED25519Bip32KeyDeriver,
  ExtendedKey,
} from './bip32';
import {
  mnemonicToRevealableSeed,
  RevealableSeed,
  revealEntropy,
} from './bip39';
import { BaseCurve, ed25519, nistp256, secp256k1 } from './curves';
import * as encryptor from './encryptors/aes256';

type CurveName = 'secp256k1' | 'nistp256' | 'ed25519';

const curves: Map<CurveName, BaseCurve> = new Map([
  ['secp256k1', secp256k1],
  ['nistp256', nistp256],
  ['ed25519', ed25519],
]);
const derivers: Map<CurveName, Bip32KeyDeriver> = new Map([
  [
    'secp256k1',
    new BaseBip32KeyDeriver(
      Buffer.from('Bitcoin seed'),
      secp256k1,
    ) as Bip32KeyDeriver,
  ],
  [
    'nistp256',
    new BaseBip32KeyDeriver(
      Buffer.from('Nist256p1 seed'),
      nistp256,
    ) as Bip32KeyDeriver,
  ],
  [
    'ed25519',
    new ED25519Bip32KeyDeriver(
      Buffer.from('ed25519 seed'),
      ed25519,
    ) as Bip32KeyDeriver,
  ],
]);

function getCurveByName(curveName: CurveName): BaseCurve {
  const curve: BaseCurve | undefined = curves.get(curveName);
  if (curve === undefined) {
    throw Error(`Curve ${curveName} is not supported.`);
  }
  return curve;
}

function getDeriverByCurveName(curveName: CurveName): Bip32KeyDeriver {
  const deriver: Bip32KeyDeriver | undefined = derivers.get(curveName);
  if (deriver === undefined) {
    throw Error(`Key derivation is not supported for curve ${curveName}.`);
  }
  return deriver;
}

function verify(
  curveName: CurveName,
  publicKey: Buffer,
  digest: Buffer,
  signature: Buffer,
): boolean {
  return getCurveByName(curveName).verify(publicKey, digest, signature);
}

function sign(
  curveName: CurveName,
  encryptedPrivateKey: Buffer,
  digest: Buffer,
  password: string,
): Buffer {
  return getCurveByName(curveName).sign(
    encryptor.decrypt(password, encryptedPrivateKey),
    digest,
  );
}

function publicFromPrivate(
  curveName: CurveName,
  encryptedPrivateKey: Buffer,
  password: string,
): Buffer {
  return getCurveByName(curveName).publicFromPrivate(
    encryptor.decrypt(password, encryptedPrivateKey),
  );
}

function generateMasterKeyFromSeed(
  curveName: CurveName,
  encryptedSeed: Buffer,
  password: string,
): ExtendedKey {
  const deriver: Bip32KeyDeriver = getDeriverByCurveName(curveName);
  const seed: Buffer = encryptor.decrypt(password, encryptedSeed);
  const masterKey: ExtendedKey = deriver.generateMasterKeyFromSeed(seed);
  return {
    key: encryptor.encrypt(password, masterKey.key),
    chainCode: masterKey.chainCode,
  };
}

function N(
  curveName: CurveName,
  encryptedExtPriv: ExtendedKey,
  password: string,
): ExtendedKey {
  const deriver: Bip32KeyDeriver = getDeriverByCurveName(curveName);
  const extPriv: ExtendedKey = {
    key: encryptor.decrypt(password, encryptedExtPriv.key),
    chainCode: encryptedExtPriv.chainCode,
  };
  return deriver.N(extPriv);
}

function CKDPriv(
  curveName: CurveName,
  encryptedParent: ExtendedKey,
  index: number,
  password: string,
): ExtendedKey {
  const deriver: Bip32KeyDeriver = getDeriverByCurveName(curveName);
  const parent: ExtendedKey = {
    key: encryptor.decrypt(password, encryptedParent.key),
    chainCode: encryptedParent.chainCode,
  };
  const child: ExtendedKey = deriver.CKDPriv(parent, index);
  return {
    key: encryptor.encrypt(password, child.key),
    chainCode: child.chainCode,
  };
}

function CKDPub(
  curveName: CurveName,
  parent: ExtendedKey,
  index: number,
): ExtendedKey {
  return getDeriverByCurveName(curveName).CKDPub(parent, index);
}

function revealableSeedFromMnemonic(
  mnemonic: string,
  password: string,
  passphrase?: string,
): RevealableSeed {
  const rs: RevealableSeed = mnemonicToRevealableSeed(mnemonic, passphrase);
  return {
    entropyWithLangPrefixed: encryptor.encrypt(
      password,
      rs.entropyWithLangPrefixed,
    ),
    seed: encryptor.encrypt(password, rs.seed),
  };
}

function mnemonicFromEntropy(
  encryptedEntropy: Buffer,
  password: string,
): string {
  return revealEntropy(encryptor.decrypt(password, encryptedEntropy));
}

export {
  CurveName,
  ExtendedKey,
  publicFromPrivate,
  verify,
  sign,
  generateMasterKeyFromSeed,
  N,
  CKDPriv,
  CKDPub,
  RevealableSeed,
  revealableSeedFromMnemonic,
  mnemonicFromEntropy,
};
