import { defaultAbiCoder } from '@ethersproject/abi';
import { getAddress } from '@ethersproject/address';
import { hexZeroPad, splitSignature } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/keccak256';
import { serialize, UnsignedTransaction } from '@ethersproject/transactions';
import BigNumber from 'bignumber.js';

import { fromBigIntHex, toBigIntHex } from '../../../basic/bignumber-plus';
import { check, checkIsDefined } from '../../../basic/precondtion';
import {
  AddressValidation,
  FeePricePerUnit,
  SignedTx,
  UnsignedTx,
} from '../../../types/provider';
import { Signer, Verifier } from '../../../types/secret';
import { BaseProvider } from '../../abc';

import { BlockNative } from './blocknative';
import { Geth } from './geth';

class Provider extends BaseProvider {
  private _blockNative!: BlockNative;

  get blockNative(): BlockNative {
    check(this.chainId === 1, 'Only use block native for eth mainnet');

    if (!this._blockNative) {
      this._blockNative = new BlockNative();
    }

    return this._blockNative;
  }

  get geth(): Promise<Geth> {
    return this.clientSelector((i) => i instanceof Geth);
  }

  get chainId(): number {
    return Number(this.chainInfo?.implOptions?.chainId);
  }

  verifyAddress(address: string): Promise<AddressValidation> {
    let isValid = false;
    let checksumAddress = '';

    try {
      checksumAddress = address.startsWith('0x') ? getAddress(address) : '';
      isValid = checksumAddress.length === 42;
    } catch (e) {
      console.error(e);
    }

    return Promise.resolve({
      normalizedAddress: checksumAddress.toLowerCase() || undefined,
      displayAddress: checksumAddress || undefined,
      isValid,
    });
  }

  async pubkeyToAddress(
    verifier: Verifier,
    encoding: string | undefined,
  ): Promise<string> {
    const pubkey = await verifier.getPubkey(false);
    return '0x' + keccak256(pubkey.slice(-64)).slice(-40);
  }

  async buildUnsignedTx(unsignedTx: UnsignedTx): Promise<UnsignedTx> {
    const input = unsignedTx.inputs[0];
    const output = unsignedTx.outputs[0];

    const payload = unsignedTx.payload || {};
    let nonce = unsignedTx.nonce;
    let feeLimit = unsignedTx.feeLimit;

    if (input && output) {
      const fromAddress = input.address;
      const tokenAddress = output.tokenAddress;
      let toAddress = output.address;
      let value: string = toBigIntHex(output.value);
      let data: string | undefined;

      if (tokenAddress) {
        data =
          '0xa9059cbb' +
          defaultAbiCoder
            .encode(['address', 'uint256'], [toAddress, value])
            .slice(2); // method_selector(transfer) + byte32_pad(address) + byte32_pad(value)
        value = '0x0';
        toAddress = tokenAddress;
      } else {
        data = payload.data;
      }

      if (typeof data === 'string' && data) {
        payload.data = data;
      }

      if (!feeLimit) {
        const estimatedGasLimit = await this.geth.then((client) =>
          client.estimateGasLimit(fromAddress, toAddress, value, data),
        );
        const estimatedGasLimitBN = fromBigIntHex(estimatedGasLimit);
        const multiplier =
          this.chainInfo.implOptions['contract_gaslimit_multiplier'] || 1.2;

        feeLimit =
          tokenAddress ||
          (await this.geth.then((client) => client.isContract(toAddress)))
            ? estimatedGasLimitBN.multipliedBy(multiplier).integerValue()
            : estimatedGasLimitBN;
      }

      if (typeof nonce !== 'number' || nonce < 0) {
        const [addressInfo] = await this.geth.then((client) =>
          client.getAddresses([fromAddress]),
        );
        nonce = addressInfo?.nonce;
      }
    }

    feeLimit = feeLimit || new BigNumber(21000);

    let feePricePerUnit = unsignedTx.feePricePerUnit;
    if (!feePricePerUnit) {
      const feePrice = await this.getFeePriceInfo();
      feePricePerUnit = feePrice.feePricePerUnit;

      if (feePrice.maxFeePerGas && feePrice.maxPriorityFeePerGas) {
        Object.assign(payload, {
          maxFeePerGas: feePrice.maxFeePerGas,
          maxPriorityFeePerGas: feePrice.maxPriorityFeePerGas,
        });
      }
    }

    return Object.assign(unsignedTx, {
      inputs: input ? [input] : [],
      outputs: output ? [output] : [],
      nonce,
      feeLimit,
      feePricePerUnit,
      payload,
    });
  }

  async getFeePriceInfo(): Promise<{
    feePricePerUnit: BigNumber;
    maxPriorityFeePerGas: BigNumber | undefined;
    maxFeePerGas: BigNumber | undefined;
  }> {
    let fee: FeePricePerUnit | undefined = undefined;

    if (
      this.chainId === 1 &&
      this.chainInfo?.implOptions?.EIP1559Enabled === true
    ) {
      try {
        fee = await this.blockNative.getFeePricePerUnit();
      } catch (e) {
        console.error('Error in get fee from block native. error: ', e);
      }
    }

    if (typeof fee === 'undefined') {
      fee = await this.geth.then((i) => i.getFeePricePerUnit());
    }

    if (fee === undefined) {
      throw new Error('Illegal State');
    }

    const normal = fee.normal;
    return {
      feePricePerUnit: normal.price,
      maxPriorityFeePerGas: normal.payload?.maxPriorityFeePerGas,
      maxFeePerGas: normal.payload?.maxFeePerGas,
    };
  }

  async signTransaction(
    unsignedTx: UnsignedTx,
    signers: { [address: string]: Signer },
  ): Promise<SignedTx> {
    const fromAddress = unsignedTx.inputs[0]?.address;
    check(fromAddress && signers[fromAddress], 'Signer not found');

    const tx = this.buildEtherUnSignedTx(unsignedTx);
    const digest = keccak256(serialize(tx));
    const [sig, recoveryParam] = await signers[fromAddress].sign(
      Buffer.from(digest.slice(2), 'hex'),
    );
    const [r, s]: [Buffer, Buffer] = [sig.slice(0, 32), sig.slice(32)];
    const signature = splitSignature({
      recoveryParam: recoveryParam,
      r: hexZeroPad('0x' + r.toString('hex'), 32),
      s: hexZeroPad('0x' + s.toString('hex'), 32),
    });

    const rawTx: string = serialize(tx, signature);
    const txid = keccak256(rawTx);
    return { txid, rawTx };
  }

  private buildEtherUnSignedTx(unsignedTx: UnsignedTx): UnsignedTransaction {
    const output = unsignedTx.outputs[0];
    const isERC20Transfer = !!output.tokenAddress;
    const toAddress = isERC20Transfer ? output.tokenAddress : output.address;
    const value = isERC20Transfer ? '0x0' : toBigIntHex(output.value);

    const baseTx = {
      to: toAddress,
      value,
      gasLimit: toBigIntHex(checkIsDefined(unsignedTx.feeLimit)),
      nonce: checkIsDefined(unsignedTx.nonce),
      data: unsignedTx.payload?.data || '0x',
      chainId: parseInt(checkIsDefined(this.chainInfo.implOptions.chainId)),
    };

    if (unsignedTx.payload?.EIP1559Enabled === true) {
      Object.assign(baseTx, {
        type: 2,
        maxFeePerGas: toBigIntHex(
          new BigNumber(checkIsDefined(unsignedTx.payload?.maxFeePerGas)),
        ),
        maxPriorityFeePerGas: toBigIntHex(
          new BigNumber(
            checkIsDefined(unsignedTx.payload?.maxPriorityFeePerGas),
          ),
        ),
      });
    } else {
      Object.assign(baseTx, {
        gasPrice: toBigIntHex(checkIsDefined(unsignedTx.feePricePerUnit)),
      });
    }

    return baseTx;
  }
}

export { Provider };
