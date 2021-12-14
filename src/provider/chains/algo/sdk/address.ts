/* Copyright (c) 2019 Algorand, llc */

import base32 from 'hi-base32';

import * as nacl from './naclWrappers';
import { Address } from './types';
import * as utils from './utils';

const ALGORAND_ADDRESS_BYTE_LENGTH = 36;
const ALGORAND_CHECKSUM_BYTE_LENGTH = 4;
const ALGORAND_ADDRESS_LENGTH = 58;
export const ALGORAND_ZERO_ADDRESS_STRING =
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ';

const MALFORMED_ADDRESS_ERROR_MSG = 'address seems to be malformed';
const CHECKSUM_ADDRESS_ERROR_MSG = 'wrong checksum for address';

/**
 * decodeAddress takes an Algorand address in string form and decodes it into a Uint8Array.
 * @param address - an Algorand address with checksum.
 * @returns the decoded form of the address's public key and checksum
 */
function decodeAddress(address: string): Address {
  if (address.length !== ALGORAND_ADDRESS_LENGTH)
    throw new Error(MALFORMED_ADDRESS_ERROR_MSG);

  // try to decode
  const decoded = base32.decode.asBytes(address.toString());
  // Sanity check
  if (decoded.length !== ALGORAND_ADDRESS_BYTE_LENGTH)
    throw new Error(MALFORMED_ADDRESS_ERROR_MSG);

  // Find publickey and checksum
  const pk = new Uint8Array(
    decoded.slice(
      0,
      ALGORAND_ADDRESS_BYTE_LENGTH - ALGORAND_CHECKSUM_BYTE_LENGTH,
    ),
  );
  const cs = new Uint8Array(
    decoded.slice(nacl.PUBLIC_KEY_LENGTH, ALGORAND_ADDRESS_BYTE_LENGTH),
  );

  // Compute checksum
  const checksum = nacl
    .genericHash(pk)
    .slice(
      nacl.HASH_BYTES_LENGTH - ALGORAND_CHECKSUM_BYTE_LENGTH,
      nacl.HASH_BYTES_LENGTH,
    );

  // Check if the checksum and the address are equal
  if (!utils.arrayEqual(checksum, cs))
    throw new Error(CHECKSUM_ADDRESS_ERROR_MSG);

  return { publicKey: pk, checksum: cs };
}

/**
 * isValidAddress checks if a string is a valid Algorand address.
 * @param address - an Algorand address with checksum.
 * @returns true if valid, false otherwise
 */
function isValidAddress(address: string) {
  // Try to decode
  try {
    decodeAddress(address);
  } catch (e) {
    return false;
  }
  return true;
}

/**
 * encodeAddress takes an Algorand address as a Uint8Array and encodes it into a string with checksum.
 * @param address - a raw Algorand address
 * @returns the address and checksum encoded as a string.
 */
function encodeAddress(address: Uint8Array) {
  // compute checksum
  const checksum = nacl
    .genericHash(address)
    .slice(
      nacl.PUBLIC_KEY_LENGTH - ALGORAND_CHECKSUM_BYTE_LENGTH,
      nacl.PUBLIC_KEY_LENGTH,
    );
  const addr = base32.encode(utils.concatArrays(address, checksum));

  return addr.toString().slice(0, ALGORAND_ADDRESS_LENGTH); // removing the extra '===='
}

export { encodeAddress, decodeAddress, isValidAddress };
