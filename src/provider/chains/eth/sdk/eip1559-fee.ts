/* Inspired by https://github.com/MyCryptoHQ/gas-estimation */

import BigNumber from 'bignumber.js';

type FeeHistory = {
  baseFeePerGas: string[];
  gasUsedRatio: number[];
  reward: Array<[string, string]>;
};

const GWEI_MULTIPLIER = new BigNumber(1).shiftedBy(9);

const gwei = (value: BigNumber | number): BigNumber => {
  return new BigNumber(value).multipliedBy(GWEI_MULTIPLIER);
};

const DEFAULT_PRIORITY_FEE = gwei(3);

const getBaseFeeMultiplier = (baseFee: BigNumber): number => {
  const baseFeeInGwei = baseFee.div(GWEI_MULTIPLIER).toNumber();

  if (baseFeeInGwei <= 40) {
    return 200;
  } else if (baseFeeInGwei <= 100) {
    return 160;
  } else if (baseFeeInGwei <= 200) {
    return 140;
  } else {
    return 120;
  }
};

const estimatePriorityFee = (feeHistory: FeeHistory): BigNumber | undefined => {
  const rewards = feeHistory.reward
    ?.map((i) => new BigNumber(i[0]))
    .filter((i) => i.isFinite() && i.gt(0))
    .sort();

  if (!rewards || rewards.length <= 0) {
    return;
  }

  const percentageIncreases = rewards.reduce<BigNumber[]>(
    (acc, cur, i, arr) => {
      if (i < arr.length - 1) {
        const next = arr[i + 1];
        const p = next.minus(cur).div(cur).multipliedBy(100);
        acc.push(p);
      }

      return acc;
    },
    [],
  );
  const highestIncrease = BigNumber.max(...percentageIncreases);
  const highestIncreaseIndex = percentageIncreases.findIndex((p) =>
    p.eq(highestIncrease),
  );

  const values =
    highestIncrease.gte(200) &&
    highestIncreaseIndex >= Math.floor(rewards.length / 2)
      ? rewards.slice(highestIncreaseIndex)
      : rewards;

  return values[Math.floor(values.length / 2)];
};

const estimateFee = (
  baseFee: BigNumber,
  feeHistory?: FeeHistory,
): {
  maxFeePerGas: BigNumber;
  maxPriorityFeePerGas: BigNumber;
} => {
  const estimatedPriorityFee = feeHistory
    ? estimatePriorityFee(feeHistory)
    : undefined;
  const maxPriorityFeePerGas = BigNumber.max(
    estimatedPriorityFee ?? 0,
    DEFAULT_PRIORITY_FEE,
  );

  const multiplier = getBaseFeeMultiplier(baseFee);

  const potentialMaxFee = baseFee.multipliedBy(multiplier).div(100);
  const maxFeePerGas = maxPriorityFeePerGas.isGreaterThan(potentialMaxFee)
    ? potentialMaxFee.plus(maxPriorityFeePerGas)
    : potentialMaxFee;

  return {
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
};

export { estimateFee };
