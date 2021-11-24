/* Copyright (c) 2019 Algorand, llc */

import * as txnBuilder from './transaction';
import {
  AssetTransferTransaction,
  MustHaveSuggestedParams,
  PaymentTransaction,
  TransactionType,
} from './types';

/**
 * makePaymentTxnWithSuggestedParams takes payment arguments and returns a Transaction object
 * @param from - string representation of Algorand address of sender
 * @param to - string representation of Algorand address of recipient
 * @param amount - integer amount to send, in microAlgos
 * @param closeRemainderTo - optionally close out remaining account balance to this account, represented as string rep of Algorand address
 * @param note - uint8array of arbitrary data for sender to store
 * @param suggestedParams - a dict holding common-to-all-txns args:
 * fee - integer fee per byte, in microAlgos. for a flat fee, set flatFee to true
 * flatFee - bool optionally set this to true to specify fee as microalgos-per-txn
 *       If true, txn fee may fall below the ALGORAND_MIN_TX_FEE
 * firstRound - integer first protocol round on which this txn is valid
 * lastRound - integer last protocol round on which this txn is valid
 * genesisHash - string specifies hash genesis block of network in use
 * genesisID - string specifies genesis ID of network in use
 * @param rekeyTo - rekeyTo address, optional
 */
export function makePaymentTxnWithSuggestedParams(
  from: PaymentTransaction['from'],
  to: PaymentTransaction['to'],
  amount: PaymentTransaction['amount'],
  closeRemainderTo: PaymentTransaction['closeRemainderTo'],
  note: PaymentTransaction['note'],
  suggestedParams: MustHaveSuggestedParams<PaymentTransaction>['suggestedParams'],
  rekeyTo?: PaymentTransaction['reKeyTo'],
) {
  const o: PaymentTransaction = {
    from,
    to,
    amount,
    closeRemainderTo,
    note,
    suggestedParams,
    type: TransactionType.pay,
    reKeyTo: rekeyTo,
  };
  return new txnBuilder.Transaction(o);
}

/** makeAssetTransferTxnWithSuggestedParams allows for the creation of an asset transfer transaction.
 * Special case: to begin accepting assets, set amount=0 and from=to.
 *
 * @param from - string representation of Algorand address of sender
 * @param to - string representation of Algorand address of asset recipient
 * @param closeRemainderTo - optional - string representation of Algorand address - if provided,
 * send all remaining assets after transfer to the "closeRemainderTo" address and close "from"'s asset holdings
 * @param revocationTarget - optional - string representation of Algorand address - if provided,
 * and if "from" is the asset's revocation manager, then deduct from "revocationTarget" rather than "from"
 * @param amount - integer amount of assets to send
 * @param note - uint8array of arbitrary data for sender to store
 * @param assetIndex - int asset index uniquely specifying the asset
 * @param suggestedParams - a dict holding common-to-all-txns args:
 * fee - integer fee per byte, in microAlgos. for a flat fee, set flatFee to true
 * flatFee - bool optionally set this to true to specify fee as microalgos-per-txn
 *       If true, txn fee may fall below the ALGORAND_MIN_TX_FEE
 * * flatFee - bool optionally set this to true to specify fee as microalgos-per-txn
 *       If true, txn fee may fall below the ALGORAND_MIN_TX_FEE
 * firstRound - integer first protocol round on which this txn is valid
 * lastRound - integer last protocol round on which this txn is valid
 * genesisHash - string specifies hash genesis block of network in use
 * genesisID - string specifies genesis ID of network in use
 * @param rekeyTo - rekeyTo address, optional
 */
export function makeAssetTransferTxnWithSuggestedParams(
  from: AssetTransferTransaction['from'],
  to: AssetTransferTransaction['to'],
  closeRemainderTo: AssetTransferTransaction['closeRemainderTo'],
  revocationTarget: AssetTransferTransaction['assetRevocationTarget'],
  amount: AssetTransferTransaction['amount'],
  note: AssetTransferTransaction['note'],
  assetIndex: AssetTransferTransaction['assetIndex'],
  suggestedParams: MustHaveSuggestedParams<AssetTransferTransaction>['suggestedParams'],
  rekeyTo?: AssetTransferTransaction['reKeyTo'],
) {
  const o: AssetTransferTransaction = {
    type: TransactionType.axfer,
    from,
    to,
    amount,
    suggestedParams,
    assetIndex,
    note,
    assetRevocationTarget: revocationTarget,
    closeRemainderTo,
    reKeyTo: rekeyTo,
  };
  return new txnBuilder.Transaction(o);
}
