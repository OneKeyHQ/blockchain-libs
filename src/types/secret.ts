interface Verifier {
  getPubkey: (compressed?: boolean) => Promise<Buffer>;
  verify: (digest: Buffer, signature: Buffer) => Promise<Buffer>;
}

interface Signer {
  sign: (digest: Buffer) => Promise<[Buffer, number]>;
  getPrvkey: () => Promise<Buffer>;
}

export { Verifier, Signer };
