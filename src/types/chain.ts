type ChainInfo = {
  code: string;
  feeCoin: string;
  impl: string;
  implOptions: { [key: string]: any };
  clients: Array<{ name: string; args: Array<any> }>;
};

type CoinInfo = {
  code: string;
  chainCoin: string;
  decimals: number;
  tokenAddress?: string;
};

export { ChainInfo, CoinInfo };
