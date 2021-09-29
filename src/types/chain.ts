export type ChainInfo = {
  code: string;
  feeCoin: string;
  impl: string;
  clients: Array<{ name: string; args: Array<any> }>;
};

export type CoinInfo = {
  code: string;
  chainCoin: string;
  decimals: number;
  tokenAddress?: string;
};
