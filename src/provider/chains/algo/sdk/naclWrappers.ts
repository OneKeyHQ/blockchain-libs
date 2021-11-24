/* Copyright (c) 2019 Algorand, llc */

import * as crypto from 'crypto';

import nacl from 'tweetnacl';

export function genericHash(arr: crypto.BinaryLike): Uint8Array {
  return new Uint8Array(crypto.createHash('sha512-256').update(arr).digest());
}

// constants
export const PUBLIC_KEY_LENGTH = nacl.sign.publicKeyLength;
export const HASH_BYTES_LENGTH = 32;
