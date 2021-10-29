type ChainInfo = {
  code: string;
  feeCode: string;
  impl: string;
  implOptions: { [key: string]: any };
  clients: Array<{ name: string; args: Array<any> }>;
};

type CoinInfo = {
  code: string;
  chainCode: string;
  decimals: number;
  tokenAddress?: string;
};

export { ChainInfo, CoinInfo };
