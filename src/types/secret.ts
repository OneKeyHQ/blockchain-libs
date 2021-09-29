export interface Verifier {
  getPubkey: (compressed: boolean) => Promise<Buffer>;
  verify: (digest: Buffer, signature: Buffer) => Promise<Buffer>;
}

export interface Signer {
  sign: (digest: Buffer) => Promise<Buffer>;
  getPrvkey: () => Promise<Buffer>;
}
