import elliptic from 'elliptic';

import { parse256 } from '../bip32';

import { BaseCurve, CurveForKD } from './base';

type ELPoint = elliptic.curve.base.BasePoint;

class EllipticECWrapper implements CurveForKD {
  groupOrder: bigint;
  constructor(private curve: elliptic.ec) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.groupOrder = BigInt(curve.n!.toString());
  }

  publicFromPrivate(privateKey: Buffer): Buffer {
    return Buffer.from(
      this.curve.keyFromPrivate(privateKey).getPublic().encodeCompressed(),
    );
  }

  verify(publicKey: Buffer, digest: Buffer, signature: Buffer): boolean {
    if (signature.length != 65) {
      return false;
    }
    return this.curve.keyFromPublic(publicKey).verify(digest, {
      r: signature.slice(0, 32),
      s: signature.slice(32, 64),
      recoveryParam: parseInt(signature[64].toString()),
    });
  }

  sign(privateKey: Buffer, digest: Buffer): Buffer {
    const signature: elliptic.ec.Signature = this.curve
      .keyFromPrivate(privateKey)
      .sign(digest);
    return Buffer.concat([
      signature.r.toBuffer('be', 32),
      signature.s.toBuffer('be', 32),
      Buffer.from([signature.recoveryParam]),
    ]);
  }

  getChildPublicKey(IL: Buffer, parentPublicKey: Buffer): Buffer | null {
    if (parse256(IL) >= this.groupOrder) {
      return null;
    }
    const p: ELPoint = this.curve.keyFromPrivate(IL).getPublic();
    const q: ELPoint = this.curve.keyFromPublic(parentPublicKey).getPublic();
    const r: ELPoint = p.add(q);
    if (r.isInfinity()) {
      return null;
    }
    return Buffer.from(r.encodeCompressed());
  }
}

class EllipticEDDSAWrapper implements BaseCurve {
  constructor(private curve: elliptic.eddsa) {}

  publicFromPrivate(privateKey: Buffer): Buffer {
    return Buffer.from(this.curve.keyFromSecret(privateKey).getPublic());
  }

  verify(publicKey: Buffer, digest: Buffer, signature: Buffer): boolean {
    return this.curve
      .keyFromPublic(publicKey.toString('hex'))
      .verify(digest, signature.toString('hex'));
  }

  sign(privateKey: Buffer, digest: Buffer): Buffer {
    return Buffer.from(
      this.curve.keyFromSecret(privateKey).sign(digest).toBytes(),
    );
  }
}

const secp256k1: CurveForKD = new EllipticECWrapper(
  new elliptic.ec('secp256k1'),
);
const nistp256: CurveForKD = new EllipticECWrapper(new elliptic.ec('p256'));
const ed25519: BaseCurve = new EllipticEDDSAWrapper(
  new elliptic.eddsa('ed25519'),
);

export { secp256k1, nistp256, ed25519 };
