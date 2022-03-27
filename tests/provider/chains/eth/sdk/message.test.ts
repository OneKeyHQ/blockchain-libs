import {
  hashMessage,
  MessageTypes,
} from '../../../../../src/provider/chains/eth/sdk/message';

test('ETH_SIGN', () => {
  expect(
    hashMessage(
      MessageTypes.ETH_SIGN,
      '6c69d03412450b174def7d1e48b3bcbbbd8f51df2e76e2c5b3a5d951125be3a9',
    ),
  ).toBe('0x6c69d03412450b174def7d1e48b3bcbbbd8f51df2e76e2c5b3a5d951125be3a9');
});

test('PERSONAL_SIGN', () => {
  expect(
    hashMessage(
      MessageTypes.PERSONAL_SIGN,
      '6c69d03412450b174def7d1e48b3bcbbbd8f51df2e76e2c5b3a5d951125be3a9',
    ),
  ).toBe('0xa47b9109fe1a5b6ada254a9fe498dcaa648938974eda3f9001335aa24b49fe7b');

  expect(hashMessage(MessageTypes.PERSONAL_SIGN, 'Hello OneKey')).toBe(
    '0xdf3619f57f8d35a3bc81a171aad15720f9b531a0707bf637ab37f6407a9e725d',
  );
});

test('TYPE_DATA_V1', () => {
  expect(
    hashMessage(
      MessageTypes.TYPE_DATA_V1,
      '[{"type":"string","name":"message","value":"Hi, Alice!"}]',
    ),
  ).toBe('0x14b9f24872e28cc49e72dc104d7380d8e0ba84a3fe2e712704bcac66a5702bd5');

  expect(
    hashMessage(
      MessageTypes.TYPE_DATA_V1,
      '[{"type":"string","name":"message","value":"Hi, Alice!"},{"type":"uint8","name":"value","value":10}]',
    ),
  ).toBe('0xf7ad23226db5c1c00ca0ca1468fd49c8f8bbc1489bc1c382de5adc557a69c229');

  expect(
    hashMessage(
      MessageTypes.TYPE_DATA_V1,
      '[{"type":"bytes","name":"message","value":"0xdeadbeaf"}]',
    ),
  ).toBe('0x6c69d03412450b174def7d1e48b3bcbbbd8f51df2e76e2c5b3a5d951125be3a9');

  expect(
    hashMessage(
      MessageTypes.TYPE_DATA_V1,
      '[{"type":"string","name":"message","value":"Hi, Alice!"},{"type":"address","name":"wallet","value":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"}]',
    ),
  ).toBe('0x5b418c432491db89c10a5cae30b033eef42088c59459f9161756b8124653b7bc');

  expect(() =>
    hashMessage(
      MessageTypes.TYPE_DATA_V1,
      '[{"type":"jocker","name":"message","value":"Hi, Alice!"}]',
    ),
  ).toThrow('Unsupported or invalid type: jocker');
});

const fixture = [
  {
    comment: 'Type data',
    message:
      '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Person":[{"name":"name","type":"string"},{"name":"wallet","type":"address"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person"},{"name":"contents","type":"string"}]},"primaryType":"Mail","domain":{"name":"Ether Mail","version":"1","chainId":1,"verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"},"message":{"from":{"name":"Cow","wallet":"0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"},"to":{"name":"Bob","wallet":"0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"},"contents":"Hello, Bob!"}}',
    result:
      '0xbe609aee343fb3c4b28e1df9e632fca64fcfaede20f02e86244efddf30957bd2',
    preHash: [
      '0xf2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f',
      '0xc52c0ee5d84264471806290a3f2c4cecfc5490626bf912d01f240d7a274b371e',
    ],
  },
  {
    comment: 'Type data - lowercase address',
    message:
      '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Person":[{"name":"name","type":"string"},{"name":"wallet","type":"address"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person"},{"name":"contents","type":"string"}]},"primaryType":"Mail","domain":{"name":"Ether Mail","version":"1","chainId":1,"verifyingContract":"0xcccccccccccccccccccccccccccccccccccccccc"},"message":{"from":{"name":"Cow","wallet":"0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826"},"to":{"name":"Bob","wallet":"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"},"contents":"Hello, Bob!"}}',
    result:
      '0xbe609aee343fb3c4b28e1df9e632fca64fcfaede20f02e86244efddf30957bd2',
    preHash: [
      '0xf2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f',
      '0xc52c0ee5d84264471806290a3f2c4cecfc5490626bf912d01f240d7a274b371e',
    ],
  },
  {
    comment: 'Type data with bytes',
    message:
      '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Person":[{"name":"name","type":"string"},{"name":"wallet","type":"address"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person"},{"name":"contents","type":"string"},{"name":"payload","type":"bytes"}]},"primaryType":"Mail","domain":{"name":"Ether Mail","version":"1","chainId":1,"verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"},"message":{"from":{"name":"Cow","wallet":"0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"},"to":{"name":"Bob","wallet":"0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"},"contents":"Hello, Bob!","payload":"0x25192142931f380985072cdd991e37f65cf8253ba7a0e675b54163a1d133b8ca"}}',
    result:
      '0xb4aaf457227fec401db772ec22d2095d1235ee5d0833f56f59108c9ffc90fb4b',
    preHash: [
      '0xf2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f',
      '0xe004bdc1ca57ba9ad5ea8c81e54dcbdb3bfce2d1d5ad92113f0871fb2a6eb052',
    ],
  },
  {
    comment: 'Type data with recursive types',
    message:
      '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Person":[{"name":"name","type":"string"},{"name":"mother","type":"Person"},{"name":"father","type":"Person"}]},"domain":{"name":"Family Tree","version":"1","chainId":1,"verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"},"primaryType":"Person","message":{"name":"Jon","mother":{"name":"Lyanna","father":{"name":"Rickard"}},"father":{"name":"Rhaegar","father":{"name":"Aeris II"}}}}',
    result:
      '0x807773b9faa9879d4971b43856c4d60c2da15c6f8c062bd9d33afefb756de19c', // different value for v3
  },
  {
    comment: 'Type data with array',
    message:
      '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Person":[{"name":"name","type":"string"},{"name":"wallets","type":"address[]"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person[]"},{"name":"contents","type":"string"}],"Group":[{"name":"name","type":"string"},{"name":"members","type":"Person[]"}]},"domain":{"name":"Ether Mail","version":"1","chainId":1,"verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"},"primaryType":"Mail","message":{"from":{"name":"Cow","wallets":["0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826","0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF"]},"to":[{"name":"Bob","wallets":["0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB","0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57","0xB0B0b0b0b0b0B000000000000000000000000000"]}],"contents":"Hello, Bob!"}}',
    result:
      '0xa85c2e2b118698e88db68a8105b794a8cc7cec074e89ef991cb4f5f533819cc2', // not supported for v3
  },
  {
    comment: 'Type data with 2d array',
    message:
      '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Person":[{"name":"name","type":"string"},{"name":"wallets","type":"address[]"},{"name":"logo_matrix","type":"int[][]"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person[]"},{"name":"contents","type":"string"}],"Group":[{"name":"name","type":"string"},{"name":"members","type":"Person[]"}]},"domain":{"name":"Ether Mail","version":"1","chainId":1,"verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"},"primaryType":"Mail","message":{"from":{"name":"Cow","wallets":["0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826","0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF"],"logo_matrix":[[0,255],[-255,-1]]},"to":[{"name":"Bob","wallets":["0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB","0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57","0xB0B0b0b0b0b0B000000000000000000000000000"],"logo_matrix":[[0,0],[0,0]]}],"contents":"Hello, Bob!"}}',
    result:
      '0x5370bb332dbe5d922832f1654d01b5d42cbbfd7bb999e939836f4a40a12a8bd4', // not supported for v3
  },
];

test('TYPE_DATA_V4', () => {
  for (const { message, result } of fixture) {
    expect(hashMessage(MessageTypes.TYPE_DATA_V4, message)).toBe(result);
  }
});

test('TYPE_DATA_V4', () => {
  for (const { message, result } of fixture.slice(0, 3)) {
    expect(hashMessage(MessageTypes.TYPE_DATA_V3, message)).toBe(result);
  }

  expect(hashMessage(MessageTypes.TYPE_DATA_V3, fixture[3].message)).toBe(
    '0x0f11d777f9a8098d88e3869334a8f1404fd942062c5037045bae4e3b457007bd',
  ); // # This hash result is different from v4

  expect(() =>
    hashMessage(MessageTypes.TYPE_DATA_V3, fixture[4].message),
  ).toThrow('Arrays are unimplemented in encodeData; use V4 extension');
});
