/* Copyright (c) 2019 Algorand, llc */

// <<<<< types.utils
/**
 * Overwrite a type with properties from another type
 */
export type Overwrite<T, U extends Partial<T>> = Pick<
  T,
  Exclude<keyof T, keyof U>
> &
  U;

/**
 * Same as Overwrite, but will distribute the Overwrite over unions
 */
export type DistributiveOverwrite<T, K> = T extends unknown
  ? Overwrite<T, K>
  : never;

// <<<<< types.utils

// >>>>> types.address
export type Address = {
  publicKey: Uint8Array;
  checksum: Uint8Array;
};
// <<<<< types.address

// >>>>> types.transactions.base
/**
 * Enum for application transaction types.
 *
 * The full list is availabe at https://developer.algorand.org/docs/reference/transactions/
 */
export enum TransactionType {
  /**
   * Payment transaction
   */
  pay = 'pay',

  /**
   * Key registration transaction
   */
  // keyreg = 'keyreg',

  /**
   * Asset configuration transaction
   */
  // acfg = 'acfg',

  /**
   * Asset transfer transaction
   */
  axfer = 'axfer',

  /**
   * Asset freeze transaction
   */
  // afrz = 'afrz',

  /**
   * Application transaction
   */
  // appl = 'appl',
}

/**
 * Enums for application transactions on-transaction-complete behavior
 */
export enum OnApplicationComplete {
  /**
   * NoOpOC indicates that an application transaction will simply call its
   * ApprovalProgram
   */
  NoOpOC,

  /**
   * OptInOC indicates that an application transaction will allocate some
   * LocalState for the application in the sender's account
   */
  OptInOC,

  /**
   * CloseOutOC indicates that an application transaction will deallocate
   * some LocalState for the application from the user's account
   */
  CloseOutOC,

  /**
   * ClearStateOC is similar to CloseOutOC, but may never fail. This
   * allows users to reclaim their minimum balance from an application
   * they no longer wish to opt in to.
   */
  ClearStateOC,

  /**
   * UpdateApplicationOC indicates that an application transaction will
   * update the ApprovalProgram and ClearStateProgram for the application
   */
  UpdateApplicationOC,

  /**
   * DeleteApplicationOC indicates that an application transaction will
   * delete the AppParams for the application from the creator's balance
   * record
   */
  DeleteApplicationOC,
}

/**
 * A dict holding common-to-all-txns arguments
 */
export interface SuggestedParams {
  /**
   * Set this to true to specify fee as microalgos-per-txn
   *   If the final calculated fee is lower than the protocol minimum fee, the fee will be increased to match the minimum
   */
  flatFee?: boolean;

  /**
   * Integer fee per byte, in microAlgos. For a flat fee, set flatFee to true
   */
  fee: number;

  /**
   * First protocol round on which this txn is valid
   */
  firstRound: number;

  /**
   * Last protocol round on which this txn is valid
   */
  lastRound: number;

  /**
   * Specifies genesis ID of network in use
   */
  genesisID: string;

  /**
   * Specifies hash genesis block of network in use
   */
  genesisHash: string;
}

/**
 * A full list of all available transaction parameters
 *
 * The full documentation is available at:
 * https://developer.algorand.org/docs/reference/transactions/#common-fields-header-and-type
 */
export interface TransactionParams {
  /**
   * String representation of Algorand address of sender
   */
  from: string;

  /**
   * String representation of Algorand address of recipient
   */
  to: string;

  /**
   * Integer fee per byte, in microAlgos. For a flat fee, set flatFee to true
   */
  fee: number;

  /**
   * Integer amount to send
   */
  amount: number | bigint;

  /**
   * Integer first protocol round on which this txn is valid
   */
  firstRound: number;

  /**
   * Integer last protocol round on which this txn is valid
   */
  lastRound: number;

  /**
   * Arbitrary data for sender to store
   */
  note?: Uint8Array;

  /**
   * Specifies genesis ID of network in use
   */
  genesisID: string;

  /**
   * Specifies hash genesis block of network in use
   */
  genesisHash: string;

  /**
   * Lease a transaction. The sender cannot send another txn with that same lease until the last round of original txn has passed
   */
  lease?: Uint8Array;

  /**
   * Close out remaining account balance to this account
   */
  closeRemainderTo?: string;

  /**
   * String representation of voting key. For key deregistration, leave undefined
   */
  // voteKey: string;

  /**
   * String representation of selection key. For key deregistration, leave undefined
   */
  // selectionKey: string;

  /**
   * First round on which voteKey is valid
   */
  // voteFirst: number;

  /**
   * Last round on which voteKey is valid
   */
  // voteLast: number;

  /**
   * The dilution fo the 2-level participation key
   */
  // voteKeyDilution: number;

  /**
   * Asset index uniquely specifying the asset
   */
  assetIndex: number;

  /**
   * Total supply of the asset
   */
  // assetTotal: number | bigint;

  /**
   * Integer number of decimals for asset unit calcuation
   */
  // assetDecimals: number;

  /**
   * Whether asset accounts should default to being frozen
   */
  // assetDefaultFrozen: boolean;

  /**
   * String representation of Algorand address in charge of reserve, freeze, clawback, destruction, etc.
   */
  // assetManager?: string;

  /**
   * String representation of Algorand address representing asset reserve
   */
  assetReserve?: string;

  /**
   * String representation of Algorand address with power to freeze/unfreeze asset holdings
   */
  // assetFreeze?: string;

  /**
   * String representation of Algorand address with power to revoke asset holdings
   */
  // assetClawback?: string;

  /**
   * Unit name for this asset
   */
  // assetUnitName?: string;
  /**
   * Name for this asset
   */
  // assetName?: string;

  /**
   * URL relating to this asset
   */
  // assetURL?: string;

  /**
   * Uint8Array or UTF-8 string representation of a hash commitment with respect to the asset. Must be exactly 32 bytes long.
   */
  // assetMetadataHash?: Uint8Array | string;

  /**
   * String representation of Algorand address being frozen or unfrozen
   */
  // freezeAccount: string;

  /**
   * true if freezeTarget should be frozen, false if freezeTarget should be allowed to transact
   */
  // freezeState: boolean;

  /**
   * String representation of Algorand address – if provided, and if "from" is
   * the asset's revocation manager, then deduct from "revocationTarget" rather than "from"
   */
  assetRevocationTarget?: string;

  /**
   * A unique application index
   */
  // appIndex: number;

  /**
   * What application should do once the program has been run
   */
  // appOnComplete: OnApplicationComplete;

  /**
   * Restricts number of ints in per-user local state
   */
  // appLocalInts: number;

  /**
   * Restricts number of byte slices in per-user local state
   */
  // appLocalByteSlices: number;

  /**
   * Restricts number of ints in global state
   */
  // appGlobalInts: number;

  /**
   * Restricts number of byte slices in global state
   */
  // appGlobalByteSlices: number;

  /**
   * The compiled TEAL that approves a transaction
   */
  // appApprovalProgram: Uint8Array;

  /**
   * The compiled TEAL program that runs when clearing state
   */
  // appClearProgram: Uint8Array;

  /**
   * Array of Uint8Array, any additional arguments to the application
   */
  // appArgs?: Uint8Array[];

  /**
   * Array of Address strings, any additional accounts to supply to the application
   */
  // appAccounts?: string[];

  /**
   * Array of int, any other apps used by the application, identified by index
   */
  // appForeignApps?: number[];

  /**
   * Array of int, any assets used by the application, identified by index
   */
  // appForeignAssets?: number[];

  /**
   * Transaction type
   */
  type?: TransactionType;

  /**
   * Set this to true to specify fee as microalgos-per-txn.
   *
   * If the final calculated fee is lower than the protocol minimum fee, the fee will be increased to match the minimum
   */
  flatFee?: boolean;

  /**
   * A dict holding common-to-all-txns arguments
   */
  suggestedParams: SuggestedParams;

  /**
   * String representation of the Algorand address that will be used to authorize all future transactions
   */
  reKeyTo?: string;

  /**
   * Set this value to true to mark this account as nonparticipating.
   *
   * All new Algorand accounts are participating by default. This means they earn rewards.
   */
  nonParticipation?: boolean;

  /**
   * Int representing extra pages of memory to rent during an application create transaction.
   */
  extraPages?: number;
}
// <<<<< types.transactions.base

// >>>>> types.transactions.builder
/**
 * Transaction base with suggested params as object
 */
type TransactionBaseWithSuggestedParams = Pick<
  TransactionParams,
  'suggestedParams' | 'from' | 'type' | 'lease' | 'note' | 'reKeyTo'
>;

/**
 * Transaction base with suggested params included as parameters
 */
type TransactionBaseWithoutSuggestedParams = Pick<
  TransactionParams,
  | 'flatFee'
  | 'fee'
  | 'firstRound'
  | 'lastRound'
  | 'genesisHash'
  | 'from'
  | 'type'
  | 'genesisID'
  | 'lease'
  | 'note'
  | 'reKeyTo'
>;

/**
 * Transaction common fields.
 *
 * Base transaction type that is extended for all other transaction types.
 * Suggested params must be included, either as named object or included in the rest
 * of the parameters.
 */
export type TransactionBase =
  | TransactionBaseWithoutSuggestedParams
  | TransactionBaseWithSuggestedParams
  | (TransactionBaseWithSuggestedParams &
      TransactionBaseWithoutSuggestedParams);

export type ConstructTransaction<A = {}, O = {}> = DistributiveOverwrite<
  TransactionBase & A,
  O
>;

/**
 * Only accept transaction objects that include suggestedParams as an object
 */
export type MustHaveSuggestedParams<T extends ConstructTransaction> = Extract<
  T,
  { suggestedParams: SuggestedParams }
>;

/**
 * Only accept transaction objects that include suggestedParams inline instead of being
 * enclosed in its own property
 */
export type MustHaveSuggestedParamsInline<T extends ConstructTransaction> =
  Extract<T, SuggestedParams>;

// <<<<< types.transactions.builder

// >>>>> types.transactions.encoded
/**
 * Interfaces for the encoded transaction object. Every property is labelled with its associated Transaction type property
 */

export interface EncodedAssetParams {
  /**
   * assetTotal
   */
  t: number | bigint;

  /**
   * assetDefaultFrozen
   */
  df: boolean;

  /**
   * assetDecimals
   */
  dc: number;

  /**
   * assetManager
   */
  m?: Buffer;

  /**
   * assetReserve
   */
  r?: Buffer;

  /**
   * assetFreeze
   */
  f?: Buffer;

  /**
   * assetClawback
   */
  c?: Buffer;

  /**
   * assetName
   */
  an?: string;

  /**
   * assetUnitName
   */
  un?: string;

  /**
   * assetURL
   */
  au?: string;

  /**
   * assetMetadataHash
   */
  am?: Buffer;
}

export interface EncodedLocalStateSchema {
  /**
   * appLocalInts
   */
  nui: number;

  /**
   * appLocalByteSlices
   */
  nbs: number;
}

export interface EncodedGlobalStateSchema {
  /**
   * appGlobalInts
   */
  nui: number;

  /**
   * appGlobalByteSlices
   */
  nbs: number;
}

/**
 * A rough structure for the encoded transaction object. Every property is labelled with its associated Transaction type property
 */
export interface EncodedTransaction {
  /**
   * fee
   */
  fee?: number;

  /**
   * firstRound
   */
  fv?: number;

  /**
   * lastRound
   */
  lv: number;

  /**
   * note
   */
  note?: Buffer;

  /**
   * from
   */
  snd: Buffer;

  /**
   * type
   */
  type: string;

  /**
   * genesisID
   */
  gen?: string;

  /**
   * genesisHash
   */
  gh: Buffer;

  /**
   * lease
   */
  lx?: Buffer;

  /**
   * group
   */
  grp?: Buffer;

  /**
   * amount
   */
  amt?: number | bigint;

  /**
   * amount (but for asset transfers)
   */
  aamt?: number | bigint;

  /**
   * closeRemainderTo
   */
  close?: Buffer;

  /**
   * closeRemainderTo (but for asset transfers)
   */
  aclose?: Buffer;

  /**
   * reKeyTo
   */
  rekey?: Buffer;

  /**
   * to
   */
  rcv?: Buffer;

  /**
   * to (but for asset transfers)
   */
  arcv?: Buffer;

  /**
   * voteKey
   */
  votekey?: Buffer;

  /**
   * selectionKey
   */
  selkey?: Buffer;

  /**
   * voteFirst
   */
  votefst?: number;

  /**
   * voteLast
   */
  votelst?: number;

  /**
   * voteKeyDilution
   */
  votekd?: number;

  /**
   * nonParticipation
   */
  nonpart?: boolean;

  /**
   * assetIndex
   */
  caid?: number;

  /**
   * assetIndex (but for asset transfers)
   */
  xaid?: number;

  /**
   * assetIndex (but for asset freezing/unfreezing)
   */
  faid?: number;

  /**
   * freezeState
   */
  afrz?: boolean;

  /**
   * freezeAccount
   */
  fadd?: Buffer;

  /**
   * assetRevocationTarget
   */
  asnd?: Buffer;

  /**
   * See EncodedAssetParams type
   */
  apar?: EncodedAssetParams;

  /**
   * appIndex
   */
  apid?: number;

  /**
   * appOnComplete
   */
  apan?: number;

  /**
   * See EncodedLocalStateSchema type
   */
  apls?: EncodedLocalStateSchema;

  /**
   * See EncodedGlobalStateSchema type
   */
  apgs?: EncodedGlobalStateSchema;

  /**
   * appForeignApps
   */
  apfa?: number[];

  /**
   * appForeignAssets
   */
  apas?: number[];

  /**
   * appApprovalProgram
   */
  apap?: Buffer;

  /**
   * appClearProgram
   */
  apsu?: Buffer;

  /**
   * appArgs
   */
  apaa?: Buffer[];

  /**
   * appAccounts
   */
  apat?: Buffer[];

  /**
   * extraPages
   */
  apep?: number;
}

/**
 * A structure for an encoded signed transaction object
 */
export interface EncodedSignedTransaction {
  /**
   * Transaction signature
   */
  sig?: Buffer;

  /**
   * The transaction that was signed
   */
  txn: EncodedTransaction;

  /**
   * Multisig structure
   */
  msig?: any;

  /**
   * Logic signature
   */
  lsig?: any;

  /**
   * The signer, if signing with a different key than the Transaction type `from` property indicates
   */
  sgnr?: Buffer;
}

// <<<<< types.transactions.encoded

// >>>>> types.transactions.payment
type SpecificParameters = Pick<
  TransactionParams,
  'to' | 'amount' | 'closeRemainderTo'
>;

interface Overwrites {
  type?: TransactionType.pay;
}

export type PaymentTransaction = ConstructTransaction<
  SpecificParameters,
  Overwrites
>;
// <<<<< types.transactions.payment

// >>>>> types.transactions.asset
type SpecificParametersForTransfer = Pick<
  TransactionParams,
  | 'from'
  | 'to'
  | 'closeRemainderTo'
  | 'assetRevocationTarget'
  | 'amount'
  | 'assetIndex'
>;

interface OverwritesForTransfer {
  type?: TransactionType.axfer;
}

export type AssetTransferTransaction = ConstructTransaction<
  SpecificParametersForTransfer,
  OverwritesForTransfer
>;
// <<<<< types.transactions.asset

// All possible transaction types
export type AnyTransaction = PaymentTransaction | AssetTransferTransaction;
