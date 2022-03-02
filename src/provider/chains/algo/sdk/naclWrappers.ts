/* Copyright (c) 2019 Algorand, llc */

import sha512 from 'js-sha512';
import nacl from 'tweetnacl';

export function genericHash(arr: sha512.Message) {
  return sha512.sha512_256.array(arr);
}

// constants
export const PUBLIC_KEY_LENGTH = nacl.sign.publicKeyLength;
export const HASH_BYTES_LENGTH = 32;
