import fetch from 'cross-fetch';
import timeoutSignal from 'timeout-signal';

import { JsonPRCResponseError, ResponseError } from './exceptions';

type JsonRpcParams = undefined | { [p: string]: any } | Array<any>;

class JsonRPCRequest {
  readonly url: string;
  readonly timeout: number;
  readonly headers: Record<string, string>;

  constructor(url: string, headers?: Record<string, string>, timeout = 10000) {
    this.url = url;
    this.timeout = timeout;

    this.headers = {
      'User-Agent': 'blockchain-libs',
      'Content-Type': 'application/json',
    };
    if (headers) {
      Object.assign(this.headers, headers);
    }
  }

  private static async parseRPCResponse<T>(response: any): Promise<T> {
    if (typeof response !== 'object') {
      throw new ResponseError(
        'Invalid JSON RPC response, typeof response should be an object',
        response,
      );
    } else if (response.error) {
      throw new JsonPRCResponseError('Error JSON PRC response', response);
    } else if (!('result' in response)) {
      throw new ResponseError(
        'Invalid JSON RPC response, result not found',
        response,
      );
    }

    return response.result as T;
  }

  private static normalizePayload(
    method: string,
    params: JsonRpcParams,
    id = 0,
  ): any {
    const payload: any = {
      jsonrpc: '2.0',
      id,
      method,
    };

    if (typeof payload !== 'undefined') {
      payload.params = params;
    }

    return payload;
  }

  async call<T>(
    method: string,
    params?: JsonRpcParams,
    headers?: Record<string, string>,
    timeout?: number,
  ): Promise<T> {
    headers = this.assembleHeaders(headers);
    const payload = JsonRPCRequest.normalizePayload(method, params);

    const response = await fetch(this.url, {
      headers,
      method: 'POST',
      body: JSON.stringify(payload),
      signal: timeoutSignal(timeout || this.timeout),
    });

    if (!response.ok) {
      throw new ResponseError(`Wrong response<${response.status}>`, response);
    }

    const jsonResponse: any = await response.json();
    return JsonRPCRequest.parseRPCResponse(jsonResponse);
  }

  async batchCall<T>(
    calls: Array<[string, JsonRpcParams]>,
    headers?: { [p: string]: string },
    timeout?: number,
    ignoreSoloError = true,
  ): Promise<T> {
    headers = this.assembleHeaders(headers);
    const payload = calls.map(([method, params], index) =>
      JsonRPCRequest.normalizePayload(method, params, index),
    );

    const response = await fetch(this.url, {
      headers,
      method: 'POST',
      body: JSON.stringify(payload),
      signal: timeoutSignal(timeout || this.timeout),
    });

    if (!response.ok) {
      throw new ResponseError(`Wrong response<${response.status}>`, response);
    }

    const jsonResponses: any = await response.json();
    if (!Array.isArray(jsonResponses)) {
      throw new ResponseError(
        'Invalid JSON Batch RPC response, response should be an array',
        response,
      );
    } else if (calls.length !== jsonResponses.length) {
      throw new ResponseError(
        `Invalid JSON Batch RPC response, batch with ${calls.length} calls, but got ${jsonResponses.length} responses`,
        response,
      );
    }

    // @ts-ignore
    return Promise.all(
      jsonResponses.map((response) =>
        JsonRPCRequest.parseRPCResponse(response).catch((e) => {
          if (e instanceof JsonPRCResponseError && ignoreSoloError) {
            return undefined;
          } else {
            throw e;
          }
        }),
      ),
    );
  }

  private assembleHeaders(
    headers?: Record<string, string>,
  ): Record<string, string> {
    headers = headers || {};
    return Object.assign(Object.assign({}, this.headers), headers);
  }
}

export { JsonRPCRequest };
