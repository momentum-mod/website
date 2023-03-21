import request from 'supertest';
import { get, RequestOptions } from '@tests/util/request-handlers.util';
import { get as getDeep } from 'lodash';
import { Type } from '@nestjs/common';

export interface E2ETestOptions {
    url: string;
    token: string;
    validate: Type;
}

export async function takeTest(options: E2ETestOptions): Promise<void> {
    const res = await get({
        url: options.url,
        status: 200,
        query: { take: 1 },
        token: options.token,
        validatePaged: options.validate
    });

    expect(res.body.returnCount).toBe(1);
}

export async function skipTest(options: E2ETestOptions): Promise<void> {
    const res = await get({
        url: options.url,
        status: 200,
        query: { take: 1 },
        token: options.token,
        validatePaged: options.validate
    });

    const res2 = await get({
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

export interface ExpandTestOptions extends E2ETestOptions {
    expand: string;
    query?: Record<string, unknown>;
    paged?: boolean; // False by default
    filter?: (item: Record<string, unknown>) => boolean;
    expectedPropertyName?: string;
    expectedPropertyValue?: any;
}

export async function expandTest(options: ExpandTestOptions): Promise<void> {
    options.expectedPropertyName ??= options.expand;

    const res = await get({
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

export interface SortTestOptions extends E2ETestOptions {
    sortFn: (a: any, b: any) => number;
    query?: Record<string, unknown>;
}

export async function sortTest(options: SortTestOptions): Promise<void> {
    const res = await get({
        url: options.url,
        status: 200,
        query: options.query,
        validatePaged: options.validate,
        token: options.token
    });

    expect(res.body.response).toStrictEqual([...res.body.response].sort(options.sortFn));
}

export function sortByDateTest(options: Omit<SortTestOptions, 'sortFn'>): Promise<void> {
    return sortTest({
        ...options,
        sortFn: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    });
}

export interface SearchTestOptions extends Omit<E2ETestOptions, 'validate'> {
    searchString: string;
    searchMethod: 'startsWith' | 'contains';
    searchPropertyName: string;
    validate: { type: Type; count?: number };
}

export async function searchTest(options: SearchTestOptions): Promise<void> {
    const res = await get({
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

export interface UnauthorizedTestOptions {
    url: string;
    method: (options: RequestOptions) => Promise<request.Response>;
}

export function unauthorizedTest(url: string, method: (options: RequestOptions) => Promise<request.Response>) {
    it('should 401 when no access token is provided', () => method({ url: url, status: 401 }));
}
