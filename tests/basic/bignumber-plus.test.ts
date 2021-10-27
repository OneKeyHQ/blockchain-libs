import BigNumber from 'bignumber.js';

import { fromBigIntHex, toBigIntHex } from '../../src/basic/bignumber-plus';

test('toBigIntHex', () => {
  expect(toBigIntHex(new BigNumber(0))).toBe('0x00');
  expect(toBigIntHex(new BigNumber(10))).toBe('0x0a');
  expect(toBigIntHex(new BigNumber(0xff))).toBe('0xff');
  expect(toBigIntHex(new BigNumber('0xa.1c28f5c28f5c28f5c28f'))).toBe('0x0a'); // ignore decimal point
});

test('fromBigIntHex', () => {
  expect(fromBigIntHex('0x00')).toStrictEqual(new BigNumber(0));
  expect(fromBigIntHex('0x0')).toStrictEqual(new BigNumber(0));
  expect(fromBigIntHex('0xa')).toStrictEqual(new BigNumber(10));
  expect(fromBigIntHex('0x0a')).toStrictEqual(new BigNumber(10));
  expect(fromBigIntHex('0xa.1c28f5c28f5c28f5c28f')).toStrictEqual(
    new BigNumber(10),
  );
});
