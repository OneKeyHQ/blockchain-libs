import fetch, { Response } from 'cross-fetch';
import timeoutSignal from 'timeout-signal';
import { URL, URLSearchParams } from 'whatwg-url';

import { ResponseError } from './exceptions';

class RestfulRequest {
  readonly baseUrl: string;
  readonly timeout: number;
  readonly headers: Record<string, string>;

  constructor(
    baseUrl: string,
    headers?: Record<string, string>,
    timeout = 10000,
  ) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.timeout = timeout;

    this.headers = {};
    if (headers) {
      Object.assign(this.headers, headers);
    }
  }

  private static async handleResponse(response: Response): Promise<Response> {
    if (!response.ok) {
      throw new ResponseError(`Wrong response<${response.status}>`, response);
    }

    return response;
  }

  async get(
    path: string,
    params?: Record<string, any>,
    headers?: Record<string, string>,
    timeout?: number,
  ): Promise<Response> {
    headers = this.assembleHeaders(headers);

    const url = this.buildUrl(path);
    if (typeof params === 'object') {
      url.search = new URLSearchParams(params).toString();
    }

    const response = await fetch(url.toString(), {
      headers,
      signal: timeoutSignal(timeout || this.timeout),
    });

    return RestfulRequest.handleResponse(response);
  }

  async post(
    path: string,
    data?: Record<string, any> | string,
    json = false,
    headers?: Record<string, string>,
    timeout?: number,
  ): Promise<Response> {
    headers = this.assembleHeaders(headers);
    if (json) {
      headers['Content-Type'] = 'application/json';
    }

    const url = this.buildUrl(path);
    const body =
      typeof data === 'object'
        ? json
          ? JSON.stringify(data)
          : new URLSearchParams(data).toString()
        : data;

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body,
      signal: timeoutSignal(timeout || this.timeout),
    });

    return RestfulRequest.handleResponse(response);
  }

  private buildUrl(path: string): URL {
    path = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${path}`;
    return new URL(url);
  }

  private assembleHeaders(
    headers?: Record<string, string>,
  ): Record<string, string> {
    headers = headers || {};
    return Object.assign(Object.assign({}, this.headers), headers);
  }
}

export { RestfulRequest };
