import * as BitcoinJS from 'bitcoinjs-lib';

const ltc = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bech32: 'ltc',
  bip32: {
    public: 0x019da462,
    private: 0x019d9cfe,
  },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0,
};

const bch = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: '',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80,
};

const doge = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bech32: '',
  bip32: {
    public: 0x02facafd,
    private: 0x02fac398,
  },
  pubKeyHash: 0x1e,
  scriptHash: 0x16,
  wif: 0x9e,
};

const btg = {
  messagePrefix: '\x1dBitcoin Gold Signed Message:\n',
  bech32: 'btg',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x26,
  scriptHash: 0x17,
  wif: 0x80,
};

const dgb = {
  messagePrefix: '\x19DigiByte Signed Message:\n',
  bech32: 'dgb',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x1e,
  scriptHash: 0x3f,
  wif: 0xb0,
};

const nmc = {
  messagePrefix: '\x19Namecoin Signed Message:\n',
  bech32: '',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x34,
  scriptHash: 0x05,
  wif: 0x80,
};

const vtc = {
  messagePrefix: '\x19Vertcoin Signed Message:\n',
  bech32: 'vtc',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x47,
  scriptHash: 0x05,
  wif: 0x80,
};

const extendedNetworks: Record<string, BitcoinJS.Network> = {
  ltc,
  bch,
  doge,
  btg,
  dgb,
  nmc,
  vtc,
};

const getNetwork = (chainCode: string): BitcoinJS.Network => {
  switch (chainCode) {
    case 'btc':
      return BitcoinJS.networks.bitcoin;
    case 'tbtc':
      return BitcoinJS.networks.testnet;
    case 'rbtc':
      return BitcoinJS.networks.regtest;
    default: {
      const network = extendedNetworks[chainCode];
      if (!network) {
        throw new Error(`Network not found. chainCode: ${chainCode}`);
      }
      return network;
    }
  }
};

export { getNetwork };
