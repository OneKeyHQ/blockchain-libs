/**
 * PublicKey representation that has type and bytes of the key.
 */
import { baseDecode, baseEncode } from 'borsh';

import { Assignable } from './enums';

export interface Signature {
  signature: Uint8Array;
  publicKey: PublicKey;
}

/** All supported key types */
export enum KeyType {
  ED25519 = 0,
}

function key_type_to_str(keyType: KeyType): string {
  switch (keyType) {
    case KeyType.ED25519:
      return 'ed25519';
    default:
      throw new Error(`Unknown key type ${keyType}`);
  }
}

function str_to_key_type(keyType: string): KeyType {
  switch (keyType.toLowerCase()) {
    case 'ed25519':
      return KeyType.ED25519;
    default:
      throw new Error(`Unknown key type ${keyType}`);
  }
}

export class PublicKey extends Assignable {
  keyType!: KeyType;
  data!: Uint8Array;

  static from(value: string | PublicKey | Uint8Array): PublicKey {
    if (typeof value === 'string') {
      return PublicKey.fromString(value);
    } else if (value instanceof Uint8Array) {
      return new PublicKey({
        keyType: KeyType.ED25519,
        data: value,
      });
    }
    return value;
  }

  static fromString(encodedKey: string): PublicKey {
    const parts = encodedKey.split(':');
    if (parts.length === 1) {
      return new PublicKey({
        keyType: KeyType.ED25519,
        data: baseDecode(parts[0]),
      });
    } else if (parts.length === 2) {
      return new PublicKey({
        keyType: str_to_key_type(parts[0]),
        data: baseDecode(parts[1]),
      });
    } else {
      throw new Error(
        'Invalid encoded key format, must be <curve>:<encoded key>',
      );
    }
  }

  toString(): string {
    return `${key_type_to_str(this.keyType)}:${baseEncode(this.data)}`;
  }
}
