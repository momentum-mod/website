import { get as getDeep } from 'lodash';
import { Type } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { InjectOptions, Response } from 'light-my-request';
import FormData from 'form-data';
import * as fs from 'node:fs';
import * as http from 'node:http';
import path from 'node:path';
import { FILES_PATH } from '../files-path.const';
import { isEmpty, isObject } from '@momentum/util-fn';
import { MergeExclusive, Primitive } from 'type-fest';

export const URL_PREFIX = '/v1/';

export class RequestUtil {
  constructor(private readonly app: NestFastifyApplication) {}

  //#region Requests

  get(options: RequestOptions): Promise<ParsedResponse> {
    return this.request(
      { method: 'GET', headers: { 'content-type': 'application/json' } },
      options
    );
  }

  post(options: JsonBodyRequestOptions): Promise<ParsedResponse> {
    return this.request(
      { method: 'POST', headers: { 'content-type': 'application/json' } },
      options
    );
  }

  put(options: JsonBodyRequestOptions): Promise<ParsedResponse> {
    return this.request(
      { method: 'PUT', headers: { 'content-type': 'application/json' } },
      options
    );
  }

  patch(options: JsonBodyRequestOptions): Promise<ParsedResponse> {
    return this.request(
      { method: 'PATCH', headers: { 'content-type': 'application/json' } },
      options
    );
  }

  del(options: RequestOptions): Promise<ParsedResponse> {
    return this.request({ method: 'DELETE' }, options);
  }

  postOctetStream(
    options: RawBodyBufferRequestOptions
  ): Promise<ParsedResponse> {
    return this.request(
      {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' }
      },
      options
    );
  }

  postAttach(options: AttachRequestOptions): Promise<ParsedResponse> {
    return this.request(
      { method: 'POST', headers: { 'content-type': 'multipart/form-data' } },
      options
    );
  }

  putAttach(options: AttachRequestOptions): Promise<ParsedResponse> {
    return this.request(
      { method: 'PUT', headers: { 'content-type': 'multipart/form-data' } },
      options
    );
  }

  private async request(
    injectOptions: InjectOptions,
    options:
      | RequestOptions
      | JsonBodyRequestOptions
      | RawBodyBufferRequestOptions
      | AttachRequestOptions
  ): Promise<ParsedResponse> {
    injectOptions.headers = {
      ...injectOptions.headers,
      ...options.headers,
      accept: 'application/json'
    };
    injectOptions.url =
      ((options.skipApiPrefix ?? false) ? '/' : URL_PREFIX) + options.url;

    if (options.query) {
      if (typeof options.query === 'string') {
        injectOptions.query = options.query;
      } else {
        const stringifiedQuery: Record<string, string> = {};
        for (const [key, value] of Object.entries(options.query)) {
          stringifiedQuery[key] = value.toString();
        }
        injectOptions.query = new URLSearchParams(stringifiedQuery).toString();
      }
    }

    if (options.token) {
      injectOptions.headers.authorization = `Bearer ${options.token}`;
    }

    if (['POST', 'PUT', 'PATCH'].includes(injectOptions.method)) {
      if ('file' in options || 'files' in options || 'data' in options) {
        const attachFile = (
          form: FormData,
          file: Buffer | File | string,
          field: string,
          fileName?: string
        ) => {
          if (typeof file == 'string') {
            const fileBuffer = fs.readFileSync(path.join(FILES_PATH, file));
            form.append(field, fileBuffer, fileName ?? 'dummyFileName');
          } else {
            form.append(field, file, fileName ?? 'dummyFileName');
          }
        };

        const form = new FormData();
        if (options.file) {
          attachFile(
            form,
            options.file,
            options.field ?? 'file',
            options.fileName
          );
        } else if ('files' in options) {
          for (const { file, field, fileName } of options.files) {
            attachFile(form, file, field, fileName);
          }
        }

        if (options.data) {
          form.append('data', JSON.stringify(options.data));
        }
        Object.assign(injectOptions.headers, form.getHeaders());
        injectOptions.payload = form;
      } else {
        injectOptions.payload = 'body' in options ? (options.body ?? {}) : {};
      }
    }

    const response = await this.app.inject(injectOptions);

    if (options.status) {
      if (response.statusCode === 400 && response.statusCode !== options.status)
        console.log(response.body);
      expect(response.statusCode).toBe(options.status);
    }

    let contentTypeMatcher;
    if ('contentType' in options && options.contentType !== null) {
      if (options.contentType === undefined) {
        contentTypeMatcher = /json/; // Just expect JSON by default
      } else if (typeof options.contentType === 'string') {
        contentTypeMatcher = new RegExp(options.contentType);
      } else {
        contentTypeMatcher = options.contentType as RegExp;
      }

      expect(response.headers['content-type']).toMatch(contentTypeMatcher);
    }

    const parsedResponse: ParsedResponse =
      typeof response.body === 'string' &&
      response.body.length > 0 &&
      /json/.test((response.headers['content-type'] as string) ?? '')
        ? { ...response, body: response.json() }
        : response;

    this.validate(parsedResponse, options);

    return parsedResponse;
  }

  private validate({ body }: ParsedResponse, options: RequestOptions) {
    if (options.validate) {
      expect(body).toBeValidDto(options.validate);
    } else if (options.validatePaged) {
      if ('type' in options.validatePaged) {
        if ('returnCount' in options.validatePaged) {
          expect(body).toBeValidPagedDto(
            options.validatePaged.type,
            options.validatePaged.returnCount,
            options.validatePaged.totalCount
          );
        } else if ('count' in options.validatePaged) {
          expect(body).toBeValidPagedDto(
            options.validatePaged.type,
            options.validatePaged.count,
            options.validatePaged.count
          );
        }
      } else {
        expect(body).toBeValidPagedDto(options.validatePaged);
      }
    } else if (options.validateArray) {
      expect(body).toBeInstanceOf(Array);
      if ('type' in options.validateArray) {
        for (const item of body as unknown as unknown[]) {
          expect(item).toBeValidDto(options.validateArray.type);
        }
      } else {
        for (const item of body as unknown as unknown[]) {
          expect(item).toBeValidDto(options.validateArray);
        }
      }
    }
  }

  //#endregion

  //#region Tests

  async takeTest(options: E2ETestOptions): Promise<void> {
    const res = await this.get({
      url: options.url,
      status: 200,
      query: { ...options.query, take: 1 },
      token: options.token,
      validatePaged: options.validate
    });

    expect(res.body.returnCount).toBe(1);
  }

  async skipTest(options: E2ETestOptions): Promise<void> {
    const res = await this.get({
      url: options.url,
      status: 200,
      query: { ...options.query, take: 1 },
      token: options.token,
      validatePaged: options.validate
    });

    const res2 = await this.get({
      url: options.url,
      status: 200,
      query: { ...options.query, skip: 1, take: 1 },
      token: options.token,
      validatePaged: options.validate
    });

    expect(res.body.returnCount).toBe(1);
    expect(res2.body.returnCount).toBe(1);
    expect(res.body.data[0]).not.toEqual(res2.body.data[0]);
  }

  async expandTest(
    options: E2ETestOptions & {
      expand: string;
      query?: Query;
      paged?: boolean; // False by default
      filter?: (item: Record<string, unknown>) => boolean;
      expectedPropertyName?: string;
      expectedPropertyValue?: any;
      some?: boolean; // Only test that one or more paged entry passes
    }
  ): Promise<ParsedResponse> {
    options.expectedPropertyName ??= options.expand;

    const res = await this.get({
      url: options.url,
      status: 200,
      query: { ...options.query, expand: options.expand },
      token: options.token
    });

    if (options.validate)
      if (options.paged) {
        expect(res.body).toBeValidPagedDto(options.validate);
      } else {
        expect(res.body).toBeValidDto(options.validate);
      }

    const test = (item) =>
      !(
        item === undefined ||
        (Array.isArray(item) && item.length === 0) ||
        (isObject(item) && isEmpty(item))
      );

    if (options.paged ?? false) {
      options.filter ??= () => true;
      const toTest = res.body.data.filter(options.filter);
      if (toTest.length === 0)
        throw 'nothing passed to expandTest passes filter';

      const propertyNames = toTest.map((x) =>
        getDeep(x, options.expectedPropertyName)
      );
      if (options.some ?? false) {
        expect(propertyNames.some(test)).toBeTruthy();
      } else {
        expect(propertyNames.every(test)).toBeTruthy();
      }
    } else {
      expect(
        test(getDeep(res.body, options.expectedPropertyName))
      ).toBeTruthy();
    }

    return res;
  }

  async sortTest(
    options: E2ETestOptions & {
      sortFn: (a: any, b: any) => number;
      query?: Query;
    }
  ): Promise<void> {
    const res = await this.get({
      url: options.url,
      status: 200,
      query: options.query,
      validatePaged: options.validate,
      token: options.token
    });

    expect(res.body.data).toEqual(
      structuredClone(res.body.data).sort(options.sortFn)
    );
  }

  /*
   * Test for date ordering. Default to descending (newest to oldest)
   */
  sortByDateTest(
    options: E2ETestOptions & { query?: Query; descending?: boolean }
  ): Promise<void> {
    const ascending = options.descending ?? true;
    return this.sortTest({
      ...options,
      sortFn: (a, b) =>
        new Date((ascending ? b : a).createdAt).getTime() -
        new Date((ascending ? a : b).createdAt).getTime()
    });
  }

  async searchTest(
    options: Omit<E2ETestOptions, 'validate'> & {
      searchString: string;
      searchMethod: 'startsWith' | 'contains';
      searchPropertyName: string;
      searchQueryName?: string;
      validate: { type: Type; count?: number };
    }
  ): Promise<void> {
    const res = await this.get({
      url: options.url,
      query: { [options.searchQueryName ?? 'search']: options.searchString },
      status: 200,
      token: options.token,
      validatePaged: {
        type: options.validate.type,
        returnCount: options.validate.count,
        totalCount: options.validate.count
      }
    });

    for (const item of res.body.data) {
      const propertyValue: string = getDeep(item, options.searchPropertyName);
      const stringCheck =
        options.searchMethod === 'startsWith'
          ? propertyValue?.startsWith(options.searchString)
          : propertyValue?.includes(options.searchString);
      expect(stringCheck).toBe(true);
    }
  }

  unauthorizedTest(
    url: string,
    methodType: 'get' | 'post' | 'patch' | 'put' | 'del'
  ) {
    return this[methodType]({
      url: url,
      status: 401,
      // Fastify will 400 empty content POST/PUT/PATCH https://github.com/fastify/fastify/issues/297
      body: ['post', 'put', 'patch'].includes(methodType) ? {} : undefined
    });
  }
}

//#endregion
//#region Misc utils

// TODO: This is a very ugly lil util for using a HTTP request to reset
// killswitches, since the state is currently stored directly in the Node app
// at runtime. In the future this will be in Redis, so should add a function to
// DbUtil instead.
export function resetKillswitches(req: RequestUtil, adminToken: string) {
  return req.patch({
    url: 'admin/killswitch',
    status: 204,
    body: {
      NEW_SIGNUPS: false,
      RUN_SUBMISSION: false,
      MAP_SUBMISSION: false,
      MAP_REVIEWS: false
    },
    token: adminToken
  });
}

//#endregion
//#region Types

type Query = Record<string, Primitive | Array<Primitive>>;
type Body = Record<string, unknown> | Record<string, unknown>[];

export interface ParsedResponse extends Omit<Response, 'body'> {
  body: Body | any;
}

export interface RequestOptions {
  url: string;
  status?: number;
  headers?: http.IncomingHttpHeaders;
  query?: Query;
  token?: string;
  contentType?: string | RegExp | null;
  validate?: Type;
  validateArray?: Type | { type: Type; length: number };
  validatePaged?:
    | Type
    | { type: Type; returnCount?: number; totalCount?: number }
    | { type: Type; count?: number };
  skipApiPrefix?: boolean;
}

export interface JsonBodyRequestOptions extends RequestOptions {
  body?: Body;
}

export interface RawBodyBufferRequestOptions extends RequestOptions {
  body?: Buffer;
}

type FileWithOptions = {
  file: Buffer | string;
  field?: string;
  fileName?: string;
};

export type AttachRequestOptions = Omit<RequestOptions, 'contentType'> &
  MergeExclusive<FileWithOptions, { files?: FileWithOptions[] }> & {
    data?: Body;
  };

export interface E2ETestOptions {
  url: string;
  token: string;
  validate: Type;
  query?: Query;
}

//#endregion
