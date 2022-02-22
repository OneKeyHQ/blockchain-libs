import { estimateVsize } from '../../../../../src/provider/chains/btc/sdk/vsize';

test('estimateVsize', () => {
  expect(estimateVsize(['P2WPKH'], [])).toBe(79);
  expect(estimateVsize(['P2WPKH'], ['P2WPKH', 'P2PKH', 'P2SH_P2WPKH'])).toBe(
    176,
  );
  expect(estimateVsize(['P2PKH'], ['P2WPKH', 'P2PKH', 'P2SH_P2WPKH'])).toBe(
    255,
  );
  expect(
    estimateVsize(['P2SH_P2WPKH'], ['P2WPKH', 'P2PKH', 'P2SH_P2WPKH']),
  ).toBe(199);

  expect(estimateVsize([], [], new Array(200).fill('a').join(''))).toBe(102); // auto slice the first 80 bytes
});
