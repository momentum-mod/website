import request, { Test, Response } from 'supertest';
import { URL_PREFIX } from '@tests/e2e/e2e.config';
import { get as getDeep } from 'lodash';
import { Type } from '@nestjs/common';

export class RequestUtil {
    constructor(server) {
        this.server = server;
    }

    private server;

    //#region Requests

    async get(options: RequestOptions): Promise<Response> {
        const req = request(this.server)
            .get(URL_PREFIX + options.url)
            .set('Accept', 'application/json');
        this.token(req, options.token);
        this.contentType(req, options.contentType);
        this.query(req, options.query);
        this.status(req, options.status);
        const res = await req;
        this.validate(res, options);
        return res;
    }

    async getNoContent(options: RequestOptions): Promise<Response> {
        const req = request(this.server)
            .get(URL_PREFIX + options.url)
            .set('Accept', 'application/json');
        this.status(req, options.status);
        this.token(req, options.token);
        this.query(req, options.query);
        return req;
    }

    async post(options: JsonBodyRequestOptions): Promise<Response> {
        const req = request(this.server)
            .post(URL_PREFIX + options.url)
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json');
        this.token(req, options.token);
        this.query(req, options.query);
        this.body(req, options.body);
        this.status(req, options.status);
        const res = await req;
        this.validate(res, options);
        return res;
    }

    async put(options: JsonBodyRequestOptions): Promise<Response> {
        const req = request(this.server)
            .put(URL_PREFIX + options.url)
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json');
        this.token(req, options.token);
        this.query(req, options.query);
        this.body(req, options.body);
        this.status(req, options.status);
        const res = await req;
        this.validate(res, options);
        return res;
    }

    async patch(options: JsonBodyRequestOptions): Promise<Response> {
        const req = request(this.server)
            .patch(URL_PREFIX + options.url)
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json');
        this.token(req, options.token);
        this.query(req, options.query);
        this.body(req, options.body);
        this.status(req, options.status);
        const res = await req;
        this.validate(res, options);
        return res;
    }

    async del(options: RequestOptions): Promise<Response> {
        const req = request(this.server)
            .delete(URL_PREFIX + options.url)
            .set('Accept', 'application/json');
        this.token(req, options.token);
        this.query(req, options.query);
        this.status(req, options.status);
        const res = await req;
        this.validate(res, options);
        return res;
    }

    async postAttach(options: AttachRequestOptions): Promise<Response> {
        const req = request(this.server)
            .post(URL_PREFIX + options.url)
            .set('Accept', 'application/json');
        this.token(req, options.token);
        req.set('Content-Type', 'multipart/form-data');

        if (typeof options.file === 'string') req.attach(options.field ?? 'file', './tests/files/' + options.file);
        else req.attach(options.field ?? 'file', options.file, 'dummyFileName');

        this.status(req, options.status);

        const res = await req;
        this.validate(res, options);
        return res;
    }

    async putAttach(options: AttachRequestOptions): Promise<Response> {
        const req = request(this.server)
            .put(URL_PREFIX + options.url)
            .set('Accept', 'application/json');
        this.token(req, options.token);
        req.set('Content-Type', 'multipart/form-data').attach(
            options.field ?? 'file',
            typeof options.file === 'string' ? './tests/files/' + options.file : options.file
        );
        this.status(req, options.status);

        const res = await req;
        this.validate(res, options);
        return res;
    }

    private contentType(req: Test, contentType: string | RegExp | null) {
        if (contentType !== null)
            if (contentType === undefined) req.expect('Content-Type', /json/);
            else if (typeof contentType === 'string') req.expect('Content-Type', new RegExp(contentType));
            else req.expect('Content-Type', contentType as RegExp);
    }

    private token(req: Test, token?: string) {
        if (token) req.set('Authorization', 'Bearer ' + token);
    }

    private query(req: Test, query?: Record<string, unknown>) {
        if (query) req.query(query);
    }

    private status(req: Test, status: number) {
        req.expect(status);
    }

    private body(req: Test, body: Record<string, unknown>): Test {
        req = req.send(body ?? {});
        return req;
    }

    private validate(res: Response, options: RequestOptions) {
        if (options.validate) {
            expect(res.body).toBeValidDto(options.validate);
        } else if (options.validatePaged) {
            if ('type' in options.validatePaged) {
                if ('returnCount' in options.validatePaged) {
                    expect(res.body).toBeValidPagedDto(
                        options.validatePaged.type,
                        options.validatePaged.returnCount,
                        options.validatePaged.totalCount
                    );
                } else if ('count' in options.validatePaged) {
                    expect(res.body).toBeValidPagedDto(
                        options.validatePaged.type,
                        options.validatePaged.count,
                        options.validatePaged.count
                    );
                }
            } else {
                expect(res.body).toBeValidPagedDto(options.validatePaged);
            }
        } else if (options.validateArray) {
            if ('type' in options.validateArray) {
                for (const item of res.body) expect(item).toBeValidDto(options.validateArray.type);
                expect(res.body).toHaveLength(options.validateArray.length);
            } else {
                for (const item of res.body) expect(item).toBeValidDto(options.validateArray);
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

    async expandTest(options: ExpandTestOptions): Promise<void> {
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
            expect(data).toHaveProperty(options.expectedPropertyName);
            expect(data[options.expectedPropertyName]).not.toBeNull();
            if (options.expectedPropertyValue)
                expect(data[options.expectedPropertyValue]).toBe(options.expectedPropertyValue);
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

    async sortTest(options: SortTestOptions): Promise<void> {
        const res = await this.get({
            url: options.url,
            status: 200,
            query: options.query,
            validatePaged: options.validate,
            token: options.token
        });

        expect(res.body.response).toStrictEqual([...res.body.response].sort(options.sortFn));
    }

    sortByDateTest(options: Omit<SortTestOptions, 'sortFn'>): Promise<void> {
        return this.sortTest({
            ...options,
            sortFn: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        });
    }

    async searchTest(options: SearchTestOptions): Promise<void> {
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

export interface RequestOptions {
    url: string;
    status: number;
    query?: Record<string, unknown>;
    token?: string;
    contentType?: string | RegExp | null;
    validate?: Type;
    validateArray?: Type | { type: Type; length: number };
    validatePaged?: Type | { type: Type; returnCount?: number; totalCount?: number } | { type: Type; count?: number };
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

export interface ExpandTestOptions extends E2ETestOptions {
    expand: string;
    query?: Record<string, unknown>;
    paged?: boolean; // False by default
    filter?: (item: Record<string, unknown>) => boolean;
    expectedPropertyName?: string;
    expectedPropertyValue?: any;
}

export interface SortTestOptions extends E2ETestOptions {
    sortFn: (a: any, b: any) => number;
    query?: Record<string, unknown>;
}

export interface SearchTestOptions extends Omit<E2ETestOptions, 'validate'> {
    searchString: string;
    searchMethod: 'startsWith' | 'contains';
    searchPropertyName: string;
    validate: { type: Type; count?: number };
}

export interface UnauthorizedTestOptions {
    url: string;
    method: (options: RequestOptions) => Promise<request.Response>;
}

//#endregion
