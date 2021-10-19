import {
  BaseBip32KeyDeriver,
  Bip32KeyDeriver,
  ED25519Bip32KeyDeriver,
  ExtendedKey,
} from './bip32';
import { BaseCurve, ed25519, nistp256, secp256k1 } from './curves';

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
  privateKey: Buffer,
  digest: Buffer,
): Buffer {
  return getCurveByName(curveName).sign(privateKey, digest);
}

function publicFromPrivate(curveName: CurveName, privateKey: Buffer): Buffer {
  return getCurveByName(curveName).publicFromPrivate(privateKey);
}

function generateMasterKeyFromSeed(
  curveName: CurveName,
  seed: Buffer,
): ExtendedKey {
  return getDeriverByCurveName(curveName).generateMasterKeyFromSeed(seed);
}

function N(curveName: CurveName, extPriv: ExtendedKey): ExtendedKey {
  return getDeriverByCurveName(curveName).N(extPriv);
}

function CKDPriv(
  curveName: CurveName,
  parent: ExtendedKey,
  index: number,
): ExtendedKey {
  return getDeriverByCurveName(curveName).CKDPriv(parent, index);
}

function CKDPub(
  curveName: CurveName,
  parent: ExtendedKey,
  index: number,
): ExtendedKey {
  return getDeriverByCurveName(curveName).CKDPub(parent, index);
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
};
