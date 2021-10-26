import * as crypto from 'crypto';

import { IncorrectPassword } from '../../basic/exceptions';
import { sha256 } from '../hash';

const ALGORITHM = 'aes-256-cbc';
const PBKDF2_NUM_OF_ITERATIONS = 5000;
const PBKDF2_DIGEST_METHOD = 'sha256';
const PBKDF2_KEY_LENGTH = 32;
const PBKDF2_SALT_LENGTH = 32;
const AES256_IV_LENGTH = 16;
const ENCRYPTED_DATA_OFFSET = PBKDF2_SALT_LENGTH + AES256_IV_LENGTH;

function keyFromPasswordAndSalt(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    sha256(Buffer.from(password, 'utf8')),
    salt,
    PBKDF2_NUM_OF_ITERATIONS,
    PBKDF2_KEY_LENGTH,
    PBKDF2_DIGEST_METHOD,
  );
}

function encrypt(password: string, data: Buffer): Buffer {
  const salt: Buffer = crypto.randomBytes(PBKDF2_SALT_LENGTH);
  const key: Buffer = keyFromPasswordAndSalt(password, salt);
  const iv: Buffer = crypto.randomBytes(AES256_IV_LENGTH);
  const cipher: crypto.Cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const chunked: Buffer = cipher.update(data);
  const final: Buffer = cipher.final();

  return Buffer.concat([salt, iv, chunked, final]);
}

function decrypt(password: string, data: Buffer): Buffer {
  const salt: Buffer = data.slice(0, PBKDF2_SALT_LENGTH);
  const key: Buffer = keyFromPasswordAndSalt(password, salt);
  const iv: Buffer = data.slice(PBKDF2_SALT_LENGTH, ENCRYPTED_DATA_OFFSET);
  const decipher: crypto.Decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  try {
    const chunked: Buffer = decipher.update(data.slice(ENCRYPTED_DATA_OFFSET));
    const final: Buffer = decipher.final();
    return Buffer.concat([chunked, final]);
  } catch {
    throw new IncorrectPassword();
  }
}

export { encrypt, decrypt };
