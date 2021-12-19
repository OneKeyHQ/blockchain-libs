import crypto from 'crypto';

export function sha256(data: Uint8Array): Uint8Array {
  return crypto.createHash('sha256').update(data).digest();
}

export function ripemd160(data: Uint8Array): Uint8Array {
  return crypto.createHash('ripemd160').update(data).digest();
}
