import BigNumber from 'bignumber.js';
import { Response } from 'cross-fetch';
import { mocked } from 'ts-jest/utils';

import { ResponseError } from '../../../../src/basic/request/exceptions';
import { RestfulRequest } from '../../../../src/basic/request/restful';
import { BlockBook } from '../../../../src/provider/chains/btc';
import { TransactionStatus } from '../../../../src/types/provider';

export const okResponse = (data: unknown) =>
  Promise.resolve(new Response(JSON.stringify(data)));

jest.mock('../../../../src/basic/request/restful');
const mockRestfulClass = mocked(RestfulRequest, true);

const blockbook = new BlockBook('https://myblockbook.com/api');
const [restful] = mockRestfulClass.mock.instances as Array<any>;

test('getInfo', async () => {
  restful.get.mockReturnValueOnce(
    okResponse({
      backend: {
        blocks: 724263,
      },
    }),
  );

  await expect(blockbook.getInfo()).resolves.toStrictEqual({
    bestBlockNumber: 724263,
    isReady: true,
  });
});

test('getAddress', async () => {
  restful.get.mockReturnValueOnce(
    okResponse({
      address: '12dRugNcdxK39288NjcDV4GX7rMsKCGn6B',
      unconfirmedBalance: '1000',
      balance: '35000000000',
      txs: 12044,
    }),
  );

  await expect(
    blockbook.getAddress('12dRugNcdxK39288NjcDV4GX7rMsKCGn6B'),
  ).resolves.toStrictEqual({
    balance: new BigNumber('35000001000'),
    existing: true,
  });
});

test('getFeePricePerUnit', async () => {
  restful.get
    .mockReturnValueOnce(
      okResponse({
        result: '0.000024',
      }),
    )
    .mockReturnValueOnce(
      okResponse({
        result: '0.000036',
      }),
    )
    .mockReturnValueOnce(
      okResponse({
        result: '0.000012',
      }),
    );

  await expect(blockbook.getFeePricePerUnit()).resolves.toStrictEqual({
    normal: { price: new BigNumber('2.4'), waitingBlock: 5 },
    others: [
      { price: new BigNumber('1.2'), waitingBlock: 20 },
      { price: new BigNumber('3.6'), waitingBlock: 1 },
    ],
  });
});

test('getFeePricePerUnit - planB', async () => {
  restful.get
    .mockReturnValueOnce(
      okResponse({
        result: '0.000024',
      }),
    )
    .mockRejectedValueOnce(undefined)
    .mockRejectedValueOnce(undefined);

  await expect(blockbook.getFeePricePerUnit()).resolves.toStrictEqual({
    normal: { price: new BigNumber('2.4'), waitingBlock: 5 },
    others: [
      { price: new BigNumber('1.44'), waitingBlock: 20 },
      { price: new BigNumber('3.84'), waitingBlock: 1 },
    ],
  });
});

test('getTransactionStatus', async () => {
  restful.get
    .mockReturnValueOnce(
      okResponse({
        txid: 'txid1',
        confirmations: 1,
      }),
    )
    .mockReturnValueOnce(
      okResponse({
        txid: 'txid2',
        confirmations: 0,
      }),
    )
    .mockReturnValueOnce(
      Promise.reject(
        new ResponseError(
          '',
          new Response(
            JSON.stringify({
              error: 'txid3 not found',
            }),
            { status: 404 },
          ),
        ),
      ),
    );

  await expect(blockbook.getTransactionStatus('txid1')).resolves.toBe(
    TransactionStatus.CONFIRM_AND_SUCCESS,
  );
  await expect(blockbook.getTransactionStatus('txid2')).resolves.toBe(
    TransactionStatus.PENDING,
  );
  await expect(blockbook.getTransactionStatus('txid3')).resolves.toBe(
    TransactionStatus.NOT_FOUND,
  );
});

test('broadcastTransaction', async () => {
  restful.get
    .mockReturnValueOnce(
      okResponse({
        result:
          '2222222222222222222222222222222222222222222222222222222222222222',
      }),
    )
    .mockReturnValueOnce(
      Promise.reject(
        new ResponseError(
          '',
          new Response(
            JSON.stringify({
              error: 'Transaction already in block chain',
            }),
            { status: 400 },
          ),
        ),
      ),
    );

  await expect(blockbook.broadcastTransaction('rawTx1')).resolves.toBe(true);
  await expect(blockbook.broadcastTransaction('rawTx2')).rejects.toThrow(
    'Transaction already in block',
  );
});
