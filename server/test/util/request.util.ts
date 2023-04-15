import { get as getDeep } from 'lodash';
import { Type } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { InjectOptions, Response } from 'light-my-request';
import FormData from 'form-data';
import * as fs from 'node:fs';
import * as http from 'node:http';

export const URL_PREFIX = '/api/v1/';

export class RequestUtil {
    constructor(private readonly app: NestFastifyApplication) {}

    //#region Requests

    get(options: RequestOptions): Promise<ParsedResponse> {
        return this.request({ method: 'GET', headers: { 'content-type': 'application/json' } }, options);
    }

    post(options: JsonBodyRequestOptions): Promise<ParsedResponse> {
        return this.request({ method: 'POST', headers: { 'content-type': 'application/json' } }, options);
    }

    put(options: JsonBodyRequestOptions): Promise<ParsedResponse> {
        return this.request({ method: 'PUT', headers: { 'content-type': 'application/json' } }, options);
    }

    patch(options: JsonBodyRequestOptions): Promise<ParsedResponse> {
        return this.request({ method: 'PATCH', headers: { 'content-type': 'application/json' } }, options);
    }

    del(options: RequestOptions): Promise<ParsedResponse> {
        return this.request({ method: 'DELETE', headers: { 'content-type': 'application/json' } }, options);
    }

    postAttach(options: AttachRequestOptions): Promise<ParsedResponse> {
        return this.request({ method: 'POST', headers: { 'content-type': 'multipart/form-data' } }, options);
    }

    putAttach(options: AttachRequestOptions): Promise<ParsedResponse> {
        return this.request({ method: 'PUT', headers: { 'content-type': 'multipart/form-data' } }, options);
    }

    private async request(
        injectOptions: InjectOptions,
        options: RequestOptions | JsonBodyRequestOptions | AttachRequestOptions
    ): Promise<ParsedResponse> {
        injectOptions.headers = { ...injectOptions.headers, ...options.headers, accept: 'application/json' };
        injectOptions.url = (options.skipApiPrefix ?? false ? '/' : URL_PREFIX) + options.url;

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
            if ('file' in options && options.file) {
                const form = new FormData();
                const field = options.field ?? 'file';

                if (typeof options.file === 'string') {
                    const file = fs.readFileSync(`./test/files/${options.file}`);
                    form.append(field, file, 'dummyFileName');
                } else {
                    form.append(field, options.file, 'dummyFileName');
                }

                injectOptions.payload = form;

                Object.assign(injectOptions.headers, form.getHeaders());
            } else injectOptions.payload = 'body' in options ? options.body ?? {} : {};
        }

        const response = await this.app.inject(injectOptions);

        if (options.status) {
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
            query: { take: 1 },
            token: options.token,
            validatePaged: options.validate
        });

        expect(res.body.returnCount).toBe(1);
    }

    async skipTest(options: E2ETestOptions): Promise<void> {
        const res = await this.get({
            url: options.url,
            status: 200,
            query: { take: 1 },
            token: options.token,
            validatePaged: options.validate
        });

        const res2 = await this.get({
            url: options.url,
            status: 200,
            query: { skip: 1, take: 1 },
            token: options.token,
            validatePaged: options.validate
        });

        expect(res.body.returnCount).toBe(1);
        expect(res2.body.returnCount).toBe(1);
        expect(res.body.response[0]).not.toEqual(res2.body.response[0]);
    }

    async expandTest(
        options: E2ETestOptions & {
            expand: string;
            query?: Query;
            paged?: boolean; // False by default
            filter?: (item: Record<string, unknown>) => boolean;
            expectedPropertyName?: string;
            expectedPropertyValue?: any;
        }
    ): Promise<void> {
        options.expectedPropertyName ??= options.expand;

        const res = await this.get({
            url: options.url,
            status: 200,
            query: { ...options.query, expand: options.expand },
            token: options.token
        });

        if (options.validate)
            if (options.paged) expect(res.body).toBeValidPagedDto(options.validate);
            else expect(res.body).toBeValidDto(options.validate);

        const expects = (data) => {
            const value = getDeep(data, options.expectedPropertyName);
            expect(value).toBeDefined();
        };

        if (options.paged ?? false) {
            options.filter ??= () => true;
            // Unicorn rule doesn't seem to parse this correctly.
            // eslint-disable-next-line unicorn/no-array-callback-reference
            const toTest = res.body.response.filter((x) => options.filter(x));
            if (toTest.length === 0) throw 'nothing passed to expandTest passes filter';
            for (const x of toTest) expects(x);
        } else expects(res.body);
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

        expect(res.body.response).toStrictEqual([...res.body.response].sort(options.sortFn));
    }

    sortByDateTest(options: E2ETestOptions & { query?: Query }): Promise<void> {
        return this.sortTest({
            ...options,
            sortFn: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        });
    }

    async searchTest(
        options: Omit<E2ETestOptions, 'validate'> & {
            searchString: string;
            searchMethod: 'startsWith' | 'contains';
            searchPropertyName: string;
            validate: { type: Type; count?: number };
        }
    ): Promise<void> {
        const res = await this.get({
            url: options.url,
            query: { search: options.searchString },
            status: 200,
            token: options.token,
            validatePaged: {
                type: options.validate.type,
                returnCount: options.validate.count,
                totalCount: options.validate.count
            }
        });

        for (const item of res.body.response) {
            const propertyValue: string = getDeep(item, options.searchPropertyName);
            const stringCheck =
                options.searchMethod === 'startsWith'
                    ? propertyValue.startsWith(options.searchString)
                    : propertyValue.includes(options.searchString);
            expect(stringCheck).toBe(true);
        }
    }

    unauthorizedTest(url: string, methodType: 'get' | 'post' | 'patch' | 'put' | 'del') {
        return this[methodType]({
            url: url,
            status: 401,
            // Fastify will 400 empty content POST/PUT/PATCH https://github.com/fastify/fastify/issues/297
            body: ['post', 'put', 'patch'].includes(methodType) ? {} : undefined
        });
    }
}

//#region Types

export interface ParsedResponse extends Omit<Response, 'body'> {
    body: Record<string, any> | any;
}

type Query = Record<string, string | number | boolean | bigint>;

export interface RequestOptions {
    url: string;
    status?: number;
    headers?: http.IncomingHttpHeaders;
    query?: Query;
    token?: string;
    contentType?: string | RegExp | null;
    validate?: Type;
    validateArray?: Type | { type: Type; length: number };
    validatePaged?: Type | { type: Type; returnCount?: number; totalCount?: number } | { type: Type; count?: number };
    skipApiPrefix?: boolean;
}

export interface JsonBodyRequestOptions extends RequestOptions {
    body?: Record<string, unknown>;
}

export type AttachRequestOptions = Omit<RequestOptions, 'contentType'> & {
    file: Buffer | string;
    field?: string;
};

export interface E2ETestOptions {
    url: string;
    token: string;
    validate: Type;
}

//#endregion
