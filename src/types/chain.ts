type ChainInfo = {
  code: string;
  feeCode: string;
  impl: string;
  curve: 'secp256k1' | 'ed25519';
  implOptions: { [key: string]: any };
  clients: Array<{ name: string; args: Array<any> }>;
};

type CoinInfo = {
  code: string;
  chainCode: string;
  decimals: number;
  tokenAddress?: string;
  options?: { [key: string]: any };
};

export { ChainInfo, CoinInfo };
