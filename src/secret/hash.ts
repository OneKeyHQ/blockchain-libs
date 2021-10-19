import * as crypto from 'crypto';

function hmacSHA512(key: Buffer, data: Buffer): Buffer {
  return crypto.createHmac('sha512', key).update(data).digest();
}

export { hmacSHA512 };
