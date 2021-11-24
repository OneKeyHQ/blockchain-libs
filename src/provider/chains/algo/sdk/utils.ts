/* Copyright (c) 2019 Algorand, llc */

/**
 * ArrayEqual takes two arrays and return true if equal, false otherwise
 */
export function arrayEqual(a: ArrayLike<any>, b: ArrayLike<any>) {
  if (a.length !== b.length) {
    return false;
  }
  return Array.from(a).every((val, i) => val === b[i]);
}

/**
 * ConcatArrays takes n number arrays and returns a joint Uint8Array
 * @param arrs - An arbitrary number of n array-like number list arguments
 * @returns [a,b]
 */
export function concatArrays(...arrs: ArrayLike<number>[]) {
  const size = arrs.reduce((sum, arr) => sum + arr.length, 0);
  const c = new Uint8Array(size);

  let offset = 0;
  for (let i = 0; i < arrs.length; i++) {
    c.set(arrs[i], offset);
    offset += arrs[i].length;
  }

  return c;
}

/**
 * Remove undefined properties from an object
 * @param obj - An object, preferably one with some undefined properties
 * @returns A copy of the object with undefined properties removed
 */
export function removeUndefinedProperties(
  obj: Record<string | number | symbol, any>,
) {
  const mutableCopy = { ...obj };
  Object.keys(mutableCopy).forEach((key) => {
    if (typeof mutableCopy[key] === 'undefined') delete mutableCopy[key];
  });
  return mutableCopy;
}
