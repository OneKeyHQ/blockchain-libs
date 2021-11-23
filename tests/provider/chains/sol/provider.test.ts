import BigNumber from 'bignumber.js';

import { Solana } from '../../../../src/provider/chains/sol';

jest.mock('../../../../src/provider/chains/sol');
const { Provider } = jest.requireActual('../../../../src/provider/chains/sol');
const mockedClassSolana = Solana as jest.MockedClass<typeof Solana>;
let provider: any;
let solana: any;
let chainInfo: any;

beforeEach(() => {
  solana = new mockedClassSolana('https://solana.mock/rpc');
  chainInfo = {};
  provider = new Provider(chainInfo, () => Promise.resolve(solana));
});

describe('verifyAddress', () => {
  test('verify system account', async () => {
    await expect(
      provider.verifyAddress('44wY1yr8668sCV1EivZTGd3wT6JoNpfFanGQ2YhJTvup'),
    ).resolves.toStrictEqual({
      normalizedAddress: '44wY1yr8668sCV1EivZTGd3wT6JoNpfFanGQ2YhJTvup',
      displayAddress: '44wY1yr8668sCV1EivZTGd3wT6JoNpfFanGQ2YhJTvup',
      isValid: true,
    });
  });
  test('verify mint address', async () => {
    await expect(
      provider.verifyAddress('DF55N1ZCBfEaQAc8PstaQ657sFmGjDwvNDoGQucuqbrD'),
    ).resolves.toStrictEqual({
      isValid: true,
      displayAddress: 'DF55N1ZCBfEaQAc8PstaQ657sFmGjDwvNDoGQucuqbrD',
      normalizedAddress: 'DF55N1ZCBfEaQAc8PstaQ657sFmGjDwvNDoGQucuqbrD',
    });
  });
  test('verify associated token account', async () => {
    await expect(
      provider.verifyTokenAddress(
        '2GVWvkDH6kbEjarScotT8zthQ9vZR6CJ5Qx7di4aLBSL',
      ),
    ).resolves.toStrictEqual({
      normalizedAddress: '2GVWvkDH6kbEjarScotT8zthQ9vZR6CJ5Qx7di4aLBSL',
      displayAddress: '2GVWvkDH6kbEjarScotT8zthQ9vZR6CJ5Qx7di4aLBSL',
      isValid: true,
    });
  });
  test('verify account with invalid length', async () => {
    await expect(
      provider.verifyAddress('44wY1yr8668sCV1EivZTGd3wT6JoNpfFanGQ2YhJTvupxx'),
    ).resolves.toStrictEqual({
      normalizedAddress: undefined,
      displayAddress: undefined,
      isValid: false,
    });
  });
});

test('pubkeyToAddress', async () => {
  const verifier: any = {
    getPubkey: jest.fn(),
  };
  verifier.getPubkey.mockReturnValueOnce(
    Buffer.from(
      '2d957743627270c6555d71aa76424c76132d8bb4cab2691188ca75690e39d0cb',
      'hex',
    ),
  );

  await expect(provider.pubkeyToAddress(verifier, undefined)).resolves.toBe(
    '44wY1yr8668sCV1EivZTGd3wT6JoNpfFanGQ2YhJTvup',
  );
  expect(verifier.getPubkey).toHaveBeenCalledTimes(1);
});

describe('buildUnsignedTx', () => {
  const sender = '44wY1yr8668sCV1EivZTGd3wT6JoNpfFanGQ2YhJTvup';
  const receiver = 'EP5Bg4hKT2K3KCpko6RJEYAW49Z7NsfbenVd5mhj8h2q';
  const mint = 'DF55N1ZCBfEaQAc8PstaQ657sFmGjDwvNDoGQucuqbrD';
  const fundedTokenAccount = '3Da3sHbJBBNkTmdCkK7XzWpU32UPDWkhja1ixFMGp1AZ';
  const notFundedTokenAccount = '8xhcM8bCcnJdsKjnBzRmdjVbeHnNeSPNYBaFs2DhUTjH';
  const fundedTokenAccountInfo = {
    data: {
      parsed: {
        info: {
          mint: 'DF55N1ZCBfEaQAc8PstaQ657sFmGjDwvNDoGQucuqbrD',
          owner: 'EP5Bg4hKT2K3KCpko6RJEYAW49Z7NsfbenVd5mhj8h2q',
        },
      },
    },
    lamports: 2039280,
    owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  };
  const fundedSystemAccountInfo = {
    data: ['', 'base64'],
    executable: false,
    lamports: 1000000000,
    owner: '11111111111111111111111111111111',
    rentEpoch: 135,
  };

  test('with placeholder tx', async () => {
    solana.getFeePricePerUnit.mockReturnValue(
      Promise.resolve({ normal: { price: new BigNumber(5000) } }),
    );
    await expect(
      provider.buildUnsignedTx({ inputs: [], outputs: [], payload: {} }),
    ).resolves.toStrictEqual({
      inputs: [],
      outputs: [],
      feeLimit: new BigNumber(1),
      feePricePerUnit: new BigNumber(5000),
      payload: {},
    });
    expect(solana.getFeePricePerUnit).toHaveBeenCalledTimes(1);
    expect(solana.getAccountInfo).not.toHaveBeenCalled();
    expect(solana.getFees).not.toHaveBeenCalled();
  });

  test('transfer SOL', async () => {
    solana.getFees.mockReturnValueOnce(
      Promise.resolve([5000, '7Zf5mBZPkYktFZ9AGPzkqkLbtcwVCoLeDFQmZvHgEuz1']),
    );
    await expect(
      provider.buildUnsignedTx({
        inputs: [
          {
            address: sender,
            value: new BigNumber(213),
          },
        ],
        outputs: [
          {
            address: receiver,
            value: new BigNumber(213),
          },
        ],
        feeLimit: new BigNumber(1),
        feePricePerUnit: new BigNumber(5000),
        payload: {},
      }),
    ).resolves.toStrictEqual({
      inputs: [
        {
          address: sender,
          value: new BigNumber(213),
        },
      ],
      outputs: [
        {
          address: receiver,
          value: new BigNumber(213),
        },
      ],
      feeLimit: new BigNumber(1),
      feePricePerUnit: new BigNumber(5000),
      payload: {
        recentBlockhash: '7Zf5mBZPkYktFZ9AGPzkqkLbtcwVCoLeDFQmZvHgEuz1',
      },
    });
    expect(solana.getFeePricePerUnit).not.toHaveBeenCalled();
    expect(solana.getAccountInfo).not.toHaveBeenCalled();
    expect(solana.getFees).toHaveBeenCalledTimes(1);
  });
  test('transfer spl-token with a system account receiver', async () => {
    solana.getFeePricePerUnit.mockReturnValueOnce(
      Promise.resolve({ normal: { price: new BigNumber(5000) } }),
    );
    solana.getAccountInfo
      .mockReturnValueOnce(Promise.resolve(fundedSystemAccountInfo))
      .mockReturnValueOnce(Promise.resolve(fundedTokenAccountInfo));
    solana.getFees.mockReturnValueOnce(
      Promise.resolve([5000, '7Zf5mBZPkYktFZ9AGPzkqkLbtcwVCoLeDFQmZvHgEuz1']),
    );
    await expect(
      provider
        .buildUnsignedTx({
          inputs: [
            {
              address: sender,
              value: new BigNumber(213),
              tokenAddress: mint,
            },
          ],
          outputs: [
            {
              address: receiver,
              value: new BigNumber(213),
              tokenAddress: mint,
            },
          ],
          payload: {},
        })
        .catch((err: any) => {
          console.error(err);
        }),
    ).resolves.toStrictEqual({
      inputs: [
        {
          address: sender,
          value: new BigNumber(213),
          tokenAddress: mint,
        },
      ],
      outputs: [
        {
          address: receiver,
          value: new BigNumber(213),
          tokenAddress: mint,
        },
      ],
      feeLimit: new BigNumber(1),
      feePricePerUnit: new BigNumber(5000),
      payload: {
        accountFunded: true,
        isTokenAccount: false,
        recentBlockhash: '7Zf5mBZPkYktFZ9AGPzkqkLbtcwVCoLeDFQmZvHgEuz1',
      },
    });
    expect(solana.getFeePricePerUnit).toHaveBeenCalledTimes(1);
    expect(solana.getAccountInfo).toBeCalledTimes(2);
    expect(solana.getFees).toHaveBeenCalledTimes(1);
  });
  test('transfer spl-token with a funded associated_token_account receiver', async () => {
    solana.getAccountInfo.mockReturnValueOnce(
      Promise.resolve(fundedTokenAccountInfo),
    );
    solana.getFees.mockReturnValueOnce(
      Promise.resolve([5000, '7Zf5mBZPkYktFZ9AGPzkqkLbtcwVCoLeDFQmZvHgEuz1']),
    );
    await expect(
      provider.buildUnsignedTx({
        inputs: [
          {
            address: sender,
            value: new BigNumber(213),
            tokenAddress: mint,
          },
        ],
        outputs: [
          {
            address: fundedTokenAccount,
            value: new BigNumber(213),
            tokenAddress: mint,
          },
        ],
        feePricePerUnit: new BigNumber(5000),
        payload: {},
      }),
    ).resolves.toStrictEqual({
      inputs: [
        {
          address: sender,
          value: new BigNumber(213),
          tokenAddress: mint,
        },
      ],
      outputs: [
        {
          address: fundedTokenAccount,
          value: new BigNumber(213),
          tokenAddress: mint,
        },
      ],
      feeLimit: new BigNumber(1),
      feePricePerUnit: new BigNumber(5000),
      payload: {
        accountFunded: true,
        isTokenAccount: true,
        recentBlockhash: '7Zf5mBZPkYktFZ9AGPzkqkLbtcwVCoLeDFQmZvHgEuz1',
      },
    });
    expect(solana.getAccountInfo).toBeCalledTimes(1);
    expect(solana.getFees).toHaveBeenCalledTimes(1);
  });
  test('transfer spl-token with a not funded associated_token_account receiver', async () => {
    solana.getFeePricePerUnit.mockReturnValueOnce(
      Promise.resolve({ normal: { price: new BigNumber(5000) } }),
    );
    solana.getAccountInfo.mockReturnValueOnce(Promise.resolve(null));
    solana.getFees.mockReturnValueOnce(
      Promise.resolve([5000, '7Zf5mBZPkYktFZ9AGPzkqkLbtcwVCoLeDFQmZvHgEuz1']),
    );
    await expect(
      provider.buildUnsignedTx({
        inputs: [
          {
            address: sender,
            value: new BigNumber(213),
            tokenAddress: mint,
          },
        ],
        outputs: [
          {
            address: notFundedTokenAccount,
            value: new BigNumber(213),
            tokenAddress: mint,
          },
        ],
        payload: {},
      }),
    ).rejects.toThrow('only not_funded system account allowed');
    expect(solana.getFeePricePerUnit).toHaveBeenCalledTimes(1);
    expect(solana.getAccountInfo).toBeCalledTimes(1);
    expect(solana.getFees).not.toHaveBeenCalled();
  });
});

describe('signTransaction', () => {
  const sender = '5q5Dc5znFRKryrCwSEpDKrGkco4mW1Dm959bS9ezo4S7';
  const receiver = 'EP5Bg4hKT2K3KCpko6RJEYAW49Z7NsfbenVd5mhj8h2q';
  const fundedTokenAccount = '471UuTsK2fMRAChcyaFDcvpy2GASFxC3BnXY5nrH1Som';
  const receiver2 = '44wY1yr8668sCV1EivZTGd3wT6JoNpfFanGQ2YhJTvup';
  // token account associated with receiver2
  const _notFundedTokenAccount = '3NPaKheaCvLxjsj7HYn2r4powgduLgR7iUvertep6s5x';
  const mint = '8dimoRppPAB5Mos5TBTUTbjuznmstkQZoocBgRQfVbsM';
  test('sign SOL transaction', async () => {
    const signer: any = { sign: jest.fn() };
    signer.sign.mockReturnValueOnce([
      Buffer.from(
        '53efc52376eb72b5acc5610d0f187657cf2c4f946e892ba0abe6a85f1e676e52e932d72cc2eb63fc67f6c7b22b19779d1fc2df56c7b4e073c17e5e2955b55703',
        'hex',
      ),
      0,
    ]);

    await expect(
      provider.signTransaction(
        {
          inputs: [
            {
              address: '44wY1yr8668sCV1EivZTGd3wT6JoNpfFanGQ2YhJTvup',
              value: new BigNumber(213),
            },
          ],
          outputs: [
            {
              address: receiver,
              value: new BigNumber(213),
            },
          ],
          feeLimit: new BigNumber(1),
          feePricePerUnit: new BigNumber(5000),
          payload: {
            recentBlockhash: '7Zf5mBZPkYktFZ9AGPzkqkLbtcwVCoLeDFQmZvHgEuz1',
          },
        },
        { '44wY1yr8668sCV1EivZTGd3wT6JoNpfFanGQ2YhJTvup': signer },
      ),
    ).resolves.toStrictEqual({
      rawTx:
        'AVPvxSN263K1rMVhDQ8YdlfPLE+UbokroKvmqF8eZ25S6TLXLMLrY/xn9seyKxl3nR' +
        '/C31bHtOBzwX5eKVW1VwMBAAEDLZV3Q2JycMZVXXGqdkJMdhMti7TKsmkRiMp1aQ450MvGz3BQ' +
        '+dcjipDegGm2Ygl+Tkl+pgM43tuiff4ZVqpfwgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYYPEWyA0ySW/tlaqZ9I8DE7BlYBx2ETr3gO8HJjVCPIBAgIAAQwCAAAA1QAAAAAAAAA=',
      txid: '2gLLT5ysgK9iR8JMunKTzENnyswRj2oscdn2AaM1EgDXMcMY9sJPvYax8Prw2isEzgAq75dVKoM1n4x2PCrxz35U',
    });
  });

  test('sign spl-token transfer with associated token account funded as receiver', async () => {
    const signer: any = { sign: jest.fn() };
    signer.sign.mockReturnValueOnce([
      Buffer.from(
        '6d14506e9cc8c18774d3fcaf3682938fc6cf0086e965cc37c32fdba5947953b91909cf2ca3a005bfe189b9c5d4c4a5e6c6abe7dea34c9a632e2862092108b107',
        'hex',
      ),
      0,
    ]);

    await expect(
      provider.signTransaction(
        {
          inputs: [
            {
              address: sender,
              value: new BigNumber(213),
              tokenAddress: mint,
            },
          ],
          outputs: [
            {
              address: fundedTokenAccount,
              value: new BigNumber(213),
              tokenAddress: mint,
            },
          ],
          feeLimit: new BigNumber(1),
          feePricePerUnit: new BigNumber(5000),
          payload: {
            recentBlockhash: '5kTiBacMjk82RLcqJcf2zhapKhPwSch6JE3GJgjw7ASU',
            accountFunded: true,
            isTokenAccount: true,
          },
        },
        { '5q5Dc5znFRKryrCwSEpDKrGkco4mW1Dm959bS9ezo4S7': signer },
      ),
    ).resolves.toStrictEqual({
      txid: '3BVN9qVoWEbnd4LHggLxkHJnPgYgL7pHyQMFs5Evt9ZkAxVUoPBkJ7CCwyVQEgHGBEuSvYTAbMYcHUGiMwVj9KCa',
      rawTx:
        'AW0UUG6cyMGHdNP8rzaCk4/GzwCG6WXMN8Mv26WUeVO5GQnPLKOgBb/hibnF1MSl5sar596jTJpjLihiCSEIsQcBAAEER79lJG+bQ+AFjjoZTVQqB8MmD3vybgjvhhzmc1CeA3z6aFSmlKgZ73fXN6apBTCjmw52JmuLruqQIp4nlHPA9C4dFvHz8IY2+JcY8rllBclYpvdq2njo+Ee7wnJi+bn8Bt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKlGkOxzZVAVny08T4xgzScy1Q/RvUPheUs9mDKjKwG72QEDAwECAAkD1QAAAAAAAAA=',
    });
  });
  test('sign spl-token transfer with system account as receiver and associated token account funded', async () => {
    const signer: any = { sign: jest.fn() };
    signer.sign.mockReturnValueOnce([
      Buffer.from(
        '6d14506e9cc8c18774d3fcaf3682938fc6cf0086e965cc37c32fdba5947953b91909cf2ca3a005bfe189b9c5d4c4a5e6c6abe7dea34c9a632e2862092108b107',
        'hex',
      ),
      0,
    ]);

    await expect(
      provider
        .signTransaction(
          {
            inputs: [
              {
                address: sender,
                value: new BigNumber(213),
                tokenAddress: mint,
              },
            ],
            outputs: [
              {
                address: receiver,
                value: new BigNumber(213),
                tokenAddress: mint,
              },
            ],
            feeLimit: new BigNumber(1),
            feePricePerUnit: new BigNumber(5000),
            payload: {
              recentBlockhash: '5kTiBacMjk82RLcqJcf2zhapKhPwSch6JE3GJgjw7ASU',
              accountFunded: true,
              isTokenAccount: false,
            },
          },
          { '5q5Dc5znFRKryrCwSEpDKrGkco4mW1Dm959bS9ezo4S7': signer },
        )
        .catch((err: any) => {
          console.error(err);
        }),
    ).resolves.toStrictEqual({
      txid: '3BVN9qVoWEbnd4LHggLxkHJnPgYgL7pHyQMFs5Evt9ZkAxVUoPBkJ7CCwyVQEgHGBEuSvYTAbMYcHUGiMwVj9KCa',
      rawTx:
        'AW0UUG6cyMGHdNP8rzaCk4/GzwCG6WXMN8Mv26WUeVO5GQnPLKOgBb/hibnF1MSl5sar596jTJpjLihiCSEIsQcBAAEER79lJG+bQ+AFjjoZTVQqB8MmD3vybgjvhhzmc1CeA3z6aFSmlKgZ73fXN6apBTCjmw52JmuLruqQIp4nlHPA9C4dFvHz8IY2+JcY8rllBclYpvdq2njo+Ee7wnJi+bn8Bt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKlGkOxzZVAVny08T4xgzScy1Q/RvUPheUs9mDKjKwG72QEDAwECAAkD1QAAAAAAAAA=',
    });
  });
  test('sign spl-token transfer with system account as receiver and associated token account not funded', async () => {
    const signer: any = { sign: jest.fn() };
    signer.sign.mockReturnValueOnce([
      Buffer.from(
        '55cd28869ca66eda22895ae7c615eb557977ef21da89af0aeb995cb0a36e4f3845607dd06bc3dfaed974be47306e9e2d3be696a8fadc7c0cb4f5d5662dd87b0f',
        'hex',
      ),
      0,
    ]);

    await expect(
      provider
        .signTransaction(
          {
            inputs: [
              {
                address: sender,
                value: new BigNumber(213),
                tokenAddress: mint,
              },
            ],
            outputs: [
              {
                address: receiver2,
                value: new BigNumber(213),
                tokenAddress: mint,
              },
            ],
            feeLimit: new BigNumber(1),
            feePricePerUnit: new BigNumber(5000),
            payload: {
              recentBlockhash: '8zJCRjoKrvxGuPbXTGVzmu8mLwXBdmhvYLtKVsaT9ZYE',
              accountFunded: false,
              isTokenAccount: false,
            },
          },
          { '5q5Dc5znFRKryrCwSEpDKrGkco4mW1Dm959bS9ezo4S7': signer },
        )
        .catch((err: any) => {
          console.error(err);
        }),
    ).resolves.toStrictEqual({
      txid: '2iVksBThB5QNu6ktia8VUwwJFN1faPCmZL1XdHNe1eu4rZ9S2N6k9gqdy89Ug6AvaUQSscQDN8rPPFQ7EwjN4V1Q',
      rawTx:
        'AVXNKIacpm7aIola58YV61V5d+8h2omvCuuZXLCjbk84RWB90GvD367ZdL5HMG6eLTvmlqj63HwMtPXVZi3Yew8BAAYJR79lJG+bQ+AFjjoZTVQqB8MmD3vybgjvhhzmc1CeA3wjMhiPgCQKtu+IaUggeY66+Vs+0fz/x6jOnxtEwMEXP/poVKaUqBnvd9c3pqkFMKObDnYma4uu6pAinieUc8D0LZV3Q2JycMZVXXGqdkJMdhMti7TKsmkRiMp1aQ450MtxafMorWR9zCtI7LNT9S4cC43vnGLnHbrBseWh4fN30AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKkGp9UXGSxcUSGMyUw9SvF/WNruCJuh/UTj29mKAAAAAIyXJY9OJInxuz0QKRSODYMLWhOZ2v8QhASOe9jb6fhZdq9b/IGRFup4noBny+/1K8nWOpysfqRzZyqdtS0QDJMCCAcAAQMEBQYHAAYDAgEACQPVAAAAAAAAAA==',
    });
  });
});
