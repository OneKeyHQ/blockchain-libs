import { BaseCurve, CurveForKD } from './curves';
import { hmacSHA512 } from './hash';

type ExtendedKey = {
  key: Buffer;
  chainCode: Buffer;
};

function serNum(p: bigint, bits: 32 | 256): Buffer {
  if (p < 0n || p >= 1n << BigInt(bits)) {
    throw Error('Overflowed.');
  }

  const size = bits / 8;
  return Buffer.from(p.toString(16).padStart(size * 2, '0'), 'hex');
}

function ser32(index: number): Buffer {
  if (!Number.isInteger(index)) {
    throw Error('Invalid index.');
  }

  return serNum(BigInt(index), 32);
}

function ser256(p: bigint): Buffer {
  return serNum(p, 256);
}

function parse256(seq: Buffer): bigint {
  if (seq.length != 32) {
    throw Error('Invalid sequence');
  }
  return BigInt('0x' + seq.toString('hex'));
}

function isHardenedIndex(index: number): boolean {
  if (!Number.isInteger(index) || index < 0 || index >= 2 ** 32) {
    throw Error('Invalid index.');
  }
  return index >= 2 ** 31;
}

function N(curve: BaseCurve, privateKey: Buffer): Buffer {
  const msgHash: Buffer = Buffer.from('Hello OneKey');
  const publicKey: Buffer = curve.publicFromPrivate(privateKey);

  if (!curve.verify(publicKey, msgHash, curve.sign(privateKey, msgHash))) {
    throw Error('Failed to generate public key from private.');
  }

  return publicKey;
}

interface Bip32KeyDeriver {
  generateMasterKeyFromSeed(seed: Buffer): ExtendedKey;
  N(extPriv: ExtendedKey): ExtendedKey;
  CKDPriv(parent: ExtendedKey, index: number): ExtendedKey;
  CKDPub(parent: ExtendedKey, index: number): ExtendedKey;
}

class BaseBip32KeyDeriver implements Bip32KeyDeriver {
  /* NOTE: The retrying in key generation (in both master key generation
   * and CKD functions) doesn't follow BIP-0032 but SLIP-0010. */

  constructor(private key: Buffer, private curve: CurveForKD) {}

  generateMasterKeyFromSeed(seed: Buffer): ExtendedKey {
    const I: Buffer = hmacSHA512(this.key, seed);
    const IL: Buffer = I.slice(0, 32);
    const chainCode: Buffer = I.slice(32, 64);

    const parsedIL: bigint = parse256(IL);
    if (parsedIL < this.curve.groupOrder && parsedIL != 0n) {
      return { key: IL, chainCode: chainCode };
    }
    return this.generateMasterKeyFromSeed(I);
  }

  N(extPriv: ExtendedKey): ExtendedKey {
    return {
      key: N(this.curve as BaseCurve, extPriv.key),
      chainCode: extPriv.chainCode,
    };
  }

  CKDPriv(parent: ExtendedKey, index: number): ExtendedKey {
    const data: Buffer = Buffer.alloc(37);

    data.fill(ser32(index), 33, 37);
    if (isHardenedIndex(index)) {
      data.fill(parent.key, 1, 33);
    } else {
      data.fill(this.curve.publicFromPrivate(parent.key), 0, 33);
    }

    for (;;) {
      const I: Buffer = hmacSHA512(parent.chainCode, data);
      const IR: Buffer = I.slice(32, 64);

      const parsedIL: bigint = parse256(I.slice(0, 32));
      const childKey: bigint =
        (parsedIL + parse256(parent.key)) % this.curve.groupOrder;
      if (parsedIL < this.curve.groupOrder && childKey != 0n) {
        return { key: ser256(childKey), chainCode: IR };
      }

      data[0] = 1;
      data.fill(IR, 1, 33);
    }
  }

  CKDPub(parent: ExtendedKey, index: number): ExtendedKey {
    if (isHardenedIndex(index)) {
      throw Error(`Can't derive public key for index ${index}.`);
    }

    const data: Buffer = Buffer.alloc(37);
    data.fill(parent.key, 0, 33);
    data.fill(ser32(index), 33, 37);

    for (;;) {
      const I: Buffer = hmacSHA512(parent.chainCode, data);
      const IL: Buffer = I.slice(0, 32);
      const IR: Buffer = I.slice(32, 64);

      const childKey: Buffer | null = this.curve.getChildPublicKey(
        IL,
        parent.key,
      );
      if (childKey !== null) {
        return { key: childKey, chainCode: IR };
      }

      data[0] = 1;
      data.fill(IR, 1, 33);
    }
  }
}

class ED25519Bip32KeyDeriver implements Bip32KeyDeriver {
  constructor(private key: Buffer, private curve: BaseCurve) {}

  generateMasterKeyFromSeed(seed: Buffer): ExtendedKey {
    const I: Buffer = hmacSHA512(this.key, seed);
    return { key: I.slice(0, 32), chainCode: I.slice(32, 64) };
  }

  N(extPriv: ExtendedKey): ExtendedKey {
    return { key: N(this.curve, extPriv.key), chainCode: extPriv.chainCode };
  }

  CKDPriv(parent: ExtendedKey, index: number): ExtendedKey {
    if (!isHardenedIndex(index)) {
      throw Error('Only hardened CKDPriv is supported for ed25519.');
    }
    const data: Buffer = Buffer.alloc(37);
    data.fill(parent.key, 1, 33);
    data.fill(ser32(index), 33, 37);

    const I: Buffer = hmacSHA512(parent.chainCode, data);
    return { key: I.slice(0, 32), chainCode: I.slice(32, 64) };
  }

  CKDPub(parent: ExtendedKey, index: number): ExtendedKey {
    throw Error('CKDPub is not supported for ed25519.');
  }
}

export {
  ser256,
  parse256,
  ExtendedKey,
  Bip32KeyDeriver,
  BaseBip32KeyDeriver,
  ED25519Bip32KeyDeriver,
};
