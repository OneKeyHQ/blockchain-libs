import { ChainInfo } from '../../../../types/chain';

import { Bech32 } from './bech32';
import { ripemd160, sha256 } from './hash';

function rawEd25519PubkeyToRawAddress(pubkey: Uint8Array): Uint8Array {
  if (pubkey.length !== 32) {
    throw new Error(`Invalid Ed25519 pubkey length: ${pubkey.length}`);
  }

  return sha256(pubkey).slice(0, 20);
}

function rawSecp256k1PubkeyToRawAddress(pubkey: Uint8Array): Uint8Array {
  if (pubkey.length !== 33) {
    throw new Error(
      `Invalid Secp256k1 pubkey length (compressed): ${pubkey.length}`,
    );
  }

  return ripemd160(sha256(pubkey));
}

function pubkeyToAddress(
  curve: ChainInfo['curve'],
  prefix: string,
  pubkey: Uint8Array,
): string {
  const digest =
    curve === 'secp256k1'
      ? rawSecp256k1PubkeyToRawAddress(pubkey)
      : rawEd25519PubkeyToRawAddress(pubkey);
  return Bech32.encode(prefix, digest);
}

function isValidAddress(input: string, requiredPrefix: string): boolean {
  try {
    const { prefix, data } = Bech32.decode(input);
    if (prefix !== requiredPrefix) {
      return false;
    }
    return data.length === 20;
  } catch {
    return false;
  }
}
export { pubkeyToAddress, isValidAddress };
