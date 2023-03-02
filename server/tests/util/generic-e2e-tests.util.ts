import request from 'supertest';
import { get, RequestOptions } from '@tests/util/request-handlers.util';
import { get as getDeep } from 'radash';
import { Type } from '@nestjs/common';

export interface BaseE2ETestOptions {
    url: string;
    token: string;
    validate?: Type; // TODO: Make required
}

// TODO: Remove after refactor
export interface TakeTestOptions extends BaseE2ETestOptions {
    test?: (res: request.Response) => void;
}
export interface SkipTestOptions extends BaseE2ETestOptions {
    test?: (res: request.Response) => void; // TODO: Remove after refactor
}

export async function takeTest(options: TakeTestOptions): Promise<void> {
    const res = await get({
        url: options.url,
        status: 200,
        query: { take: 1 },
        token: options.token,
        validatePaged: options.validate
    });

    expect(res.body.returnCount).toBe(1);
}

export async function skipTest(options: SkipTestOptions): Promise<void> {
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

export interface ExpandTestOptions extends BaseE2ETestOptions {
    expand: string;
    test?: any; // TODO: Remove
    query?: Record<string, unknown>;
    paged?: boolean; // False by default
    filter?: (item: Record<string, unknown>) => boolean; // TODO: Remove
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
