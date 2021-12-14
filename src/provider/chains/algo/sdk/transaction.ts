/* Copyright (c) 2019 Algorand, llc */

import base32 from 'hi-base32';

import * as address from './address';
import * as encoding from './encoding';
import * as nacl from './naclWrappers';
import {
  Address,
  AnyTransaction,
  EncodedTransaction,
  MustHaveSuggestedParams,
  MustHaveSuggestedParamsInline,
  TransactionParams,
  TransactionType,
} from './types';
import * as utils from './utils';

const ALGORAND_TRANSACTION_LENGTH = 52;
export const ALGORAND_MIN_TX_FEE = 1000; // version v5
const ALGORAND_TRANSACTION_LEASE_LENGTH = 32;
const NUM_ADDL_BYTES_AFTER_SIGNING = 75; // NUM_ADDL_BYTES_AFTER_SIGNING is the number of bytes added to a txn after signing it

type AnyTransactionWithParams = MustHaveSuggestedParams<AnyTransaction>;
type AnyTransactionWithParamsInline =
  MustHaveSuggestedParamsInline<AnyTransaction>;

/**
 * A modified version of the transaction params. Represents the internal structure that the Transaction class uses
 * to store inputted transaction objects.
 */
// Omit allows overwriting properties
interface TransactionStorageStructure
  extends Omit<
    TransactionParams,
    | 'from'
    | 'to'
    | 'genesisHash'
    | 'closeRemainderTo'
    | 'assetRevocationTarget'
    | 'suggestedParams'
    | 'reKeyTo'
  > {
  from: string | Address;
  to: string | Address;
  fee: number;
  amount: number | bigint;
  firstRound: number;
  lastRound: number;
  note?: Uint8Array;
  genesisID: string;
  genesisHash: string | Buffer;
  lease?: Uint8Array;
  closeRemainderTo?: string | Address;
  assetIndex: number;
  assetRevocationTarget?: string | Address;
  type?: TransactionType;
  flatFee: boolean;
  reKeyTo?: string | Address;
  nonParticipation?: boolean;
  group?: Buffer;
  extraPages?: number;
}

/**
 * Transaction enables construction of Algorand transactions
 * */
export class Transaction implements TransactionStorageStructure {
  name = 'Transaction';
  tag = Buffer.from('TX');

  // Implement transaction params
  from!: Address;
  to!: Address;
  fee!: number;
  amount!: number | bigint;
  firstRound!: number;
  lastRound!: number;
  note!: Uint8Array;
  genesisID!: string;
  genesisHash!: Buffer;
  lease!: Uint8Array;
  closeRemainderTo?: Address;
  assetIndex!: number;
  assetRevocationTarget?: Address;
  type?: TransactionType;
  flatFee!: boolean;
  reKeyTo?: Address;
  nonParticipation?: boolean;
  group?: Buffer;
  extraPages?: number;

  constructor({ ...transaction }: AnyTransaction) {
    // Populate defaults
    const defaults: Partial<TransactionParams> = {
      type: TransactionType.pay,
      flatFee: false,
      nonParticipation: false,
    };
    // Default type
    if (typeof transaction.type === 'undefined') {
      transaction.type = defaults.type;
    }
    // Default flatFee
    if (
      typeof (transaction as AnyTransactionWithParamsInline).flatFee ===
      'undefined'
    ) {
      (transaction as AnyTransactionWithParamsInline).flatFee =
        defaults.flatFee;
    }

    // Move suggested parameters from its object to inline
    if (
      (transaction as AnyTransactionWithParams).suggestedParams !== undefined
    ) {
      // Create a temporary reference to the transaction object that has params inline and also as a suggested params object
      //   - Helpful for moving params from named object to inline
      const reference = transaction as AnyTransactionWithParams &
        AnyTransactionWithParamsInline;
      reference.genesisHash = reference.suggestedParams.genesisHash;
      reference.fee = reference.suggestedParams.fee;
      if (reference.suggestedParams.flatFee !== undefined)
        reference.flatFee = reference.suggestedParams.flatFee;
      reference.firstRound = reference.suggestedParams.firstRound;
      reference.lastRound = reference.suggestedParams.lastRound;
      reference.genesisID = reference.suggestedParams.genesisID;
    }

    // At this point all suggestedParams have been moved to be inline, so we can reassign the transaction object type
    // to one which is more useful as we prepare properties for storing
    const txn = transaction as TransactionStorageStructure;

    txn.from = address.decodeAddress(txn.from as string);
    if (txn.to !== undefined) txn.to = address.decodeAddress(txn.to as string);
    if (txn.closeRemainderTo !== undefined)
      txn.closeRemainderTo = address.decodeAddress(
        txn.closeRemainderTo as string,
      );
    if (txn.assetRevocationTarget !== undefined)
      txn.assetRevocationTarget = address.decodeAddress(
        txn.assetRevocationTarget as string,
      );
    if (txn.reKeyTo !== undefined)
      txn.reKeyTo = address.decodeAddress(txn.reKeyTo as string);
    if (txn.genesisHash === undefined)
      throw Error('genesis hash must be specified and in a base64 string.');

    txn.genesisHash = Buffer.from(txn.genesisHash as string, 'base64');

    if (
      txn.amount !== undefined &&
      (!(
        Number.isSafeInteger(txn.amount) ||
        (typeof txn.amount === 'bigint' &&
          txn.amount <= BigInt('0xffffffffffffffff'))
      ) ||
        txn.amount < 0)
    )
      throw Error('Amount must be a positive number and smaller than 2^64-1');
    if (!Number.isSafeInteger(txn.fee) || txn.fee < 0)
      throw Error('fee must be a positive number and smaller than 2^53-1');
    if (!Number.isSafeInteger(txn.firstRound) || txn.firstRound < 0)
      throw Error('firstRound must be a positive number');
    if (!Number.isSafeInteger(txn.lastRound) || txn.lastRound < 0)
      throw Error('lastRound must be a positive number');
    if (
      txn.extraPages !== undefined &&
      (!Number.isInteger(txn.extraPages) ||
        txn.extraPages < 0 ||
        txn.extraPages > 3)
    )
      throw Error('extraPages must be an Integer between and including 0 to 3');
    if (
      txn.assetIndex !== undefined &&
      (!Number.isSafeInteger(txn.assetIndex) || txn.assetIndex < 0)
    )
      throw Error(
        'Asset index must be a positive number and smaller than 2^53-1',
      );
    if (txn.note !== undefined) {
      if (txn.note.constructor !== Uint8Array)
        throw Error('note must be a Uint8Array.');
    } else {
      txn.note = new Uint8Array(0);
    }
    if (txn.lease !== undefined) {
      if (txn.lease.constructor !== Uint8Array)
        throw Error('lease must be a Uint8Array.');
      if (txn.lease.length !== ALGORAND_TRANSACTION_LEASE_LENGTH)
        throw Error(
          `lease must be of length ${ALGORAND_TRANSACTION_LEASE_LENGTH.toString()}.`,
        );
      if (txn.lease.every((value) => value === 0)) {
        // if lease contains all 0s, omit it
        txn.lease = new Uint8Array(0);
      }
    } else {
      txn.lease = new Uint8Array(0);
    }

    // Remove unwanted properties and store transaction on instance
    delete (txn as any).suggestedParams;
    Object.assign(this, utils.removeUndefinedProperties(txn));

    // Modify Fee
    if (!txn.flatFee) {
      this.fee *= this.estimateSize();
      // If suggested fee too small and will be rejected, set to min tx fee
      if (this.fee < ALGORAND_MIN_TX_FEE) {
        this.fee = ALGORAND_MIN_TX_FEE;
      }
    }

    // say we are aware of groups
    this.group = undefined;
  }

  // eslint-disable-next-line camelcase
  get_obj_for_encoding() {
    if (this.type === 'pay') {
      const txn: EncodedTransaction = {
        amt: this.amount,
        fee: this.fee,
        fv: this.firstRound,
        lv: this.lastRound,
        note: Buffer.from(this.note),
        snd: Buffer.from(this.from.publicKey),
        type: 'pay',
        gen: this.genesisID,
        gh: this.genesisHash,
        lx: Buffer.from(this.lease),
        grp: this.group,
      };

      // parse close address
      if (
        this.closeRemainderTo !== undefined &&
        address.encodeAddress(this.closeRemainderTo.publicKey) !==
          address.ALGORAND_ZERO_ADDRESS_STRING
      ) {
        txn.close = Buffer.from(this.closeRemainderTo.publicKey);
      }
      if (this.reKeyTo !== undefined) {
        txn.rekey = Buffer.from(this.reKeyTo.publicKey);
      }
      // allowed zero values
      if (this.to !== undefined) txn.rcv = Buffer.from(this.to.publicKey);
      if (!txn.note?.length) delete txn.note;
      if (!txn.amt) delete txn.amt;
      if (!txn.fee) delete txn.fee;
      if (!txn.fv) delete txn.fv;
      if (!txn.gen) delete txn.gen;
      if (txn.grp === undefined) delete txn.grp;
      if (!txn.lx?.length) delete txn.lx;
      if (!txn.rekey) delete txn.rekey;
      return txn;
    }
    if (this.type === 'axfer') {
      // asset transfer, acceptance, revocation, mint, or burn
      const txn: EncodedTransaction = {
        aamt: this.amount,
        fee: this.fee,
        fv: this.firstRound,
        lv: this.lastRound,
        note: Buffer.from(this.note),
        snd: Buffer.from(this.from.publicKey),
        arcv: Buffer.from(this.to.publicKey),
        type: this.type,
        gen: this.genesisID,
        gh: this.genesisHash,
        lx: Buffer.from(this.lease),
        grp: this.group,
        xaid: this.assetIndex,
      };
      if (this.closeRemainderTo !== undefined)
        txn.aclose = Buffer.from(this.closeRemainderTo.publicKey);
      if (this.assetRevocationTarget !== undefined)
        txn.asnd = Buffer.from(this.assetRevocationTarget.publicKey);
      // allowed zero values
      if (!txn.note?.length) delete txn.note;
      if (!txn.lx?.length) delete txn.lx;
      if (!txn.aamt) delete txn.aamt;
      if (!txn.amt) delete txn.amt;
      if (!txn.fee) delete txn.fee;
      if (!txn.fv) delete txn.fv;
      if (!txn.gen) delete txn.gen;
      if (txn.grp === undefined) delete txn.grp;
      if (!txn.aclose) delete txn.aclose;
      if (!txn.asnd) delete txn.asnd;
      if (!txn.rekey) delete txn.rekey;
      if (this.reKeyTo !== undefined) {
        txn.rekey = Buffer.from(this.reKeyTo.publicKey);
      }
      return txn;
    }

    return undefined;
  }

  estimateSize() {
    return this.toByte().length + NUM_ADDL_BYTES_AFTER_SIGNING;
  }

  bytesToSign() {
    const encodedMsg = this.toByte();
    return Buffer.from(utils.concatArrays(this.tag, encodedMsg));
  }

  toByte() {
    return encoding.encode(this.get_obj_for_encoding() as any);
  }

  rawTxID() {
    const enMsg = this.toByte();
    const gh = Buffer.from(utils.concatArrays(this.tag, enMsg));
    return Buffer.from(nacl.genericHash(gh));
  }

  txID() {
    const hash = this.rawTxID();
    return base32.encode(hash).slice(0, ALGORAND_TRANSACTION_LENGTH);
  }
}

/**
 * Object representing a transaction with a signature
 */
export interface SignedTransaction {
  /**
   * Transaction signature
   */
  sig?: Buffer;

  /**
   * The transaction that was signed
   */
  txn: Transaction;
}

export default Transaction;
