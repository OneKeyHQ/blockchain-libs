interface BaseCurve {
  transformPublicKey(publicKey: Buffer): Buffer;
  publicFromPrivate(privateKey: Buffer): Buffer;
  verify(publicKey: Buffer, digest: Buffer, signature: Buffer): boolean;
  sign(privateKey: Buffer, digest: Buffer): Buffer;
}

interface CurveForKD extends BaseCurve {
  groupOrder: bigint;
  getChildPublicKey(IL: Buffer, parentPublicKey: Buffer): Buffer | null;
}

export { BaseCurve, CurveForKD };
