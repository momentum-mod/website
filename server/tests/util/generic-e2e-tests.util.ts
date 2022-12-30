import request from 'supertest';
import { get } from '@tests/util/request-handlers.util';

export interface TakeTestOptions {
    url: string;
    test: (res: request.Response) => void;
    token: string;
}

export async function takeTest(options: TakeTestOptions): Promise<void> {
    const res = await get({
        url: options.url,
        status: 200,
        query: { take: 1 },
        token: options.token
    });

    options.test(res);

    expect(res.body.returnCount).toBe(1);
}

export interface SkipTestOptions {
    url: string;
    test: (res: request.Response) => void;
    token: string;
}

export async function skipTest(options: SkipTestOptions): Promise<void> {
    const res = await get({
        url: options.url,
        status: 200,
        query: { take: 1 },
        token: options.token
    });

    const res2 = await get({
        url: options.url,
        status: 200,
        query: { skip: 1, take: 1 },
        token: options.token
    });

    options.test(res);
    options.test(res2);

    expect(res.body.returnCount).toBe(1);
    expect(res2.body.returnCount).toBe(1);
    expect(res.body.response[0]).not.toEqual(res2.body.response[0]);
}

export interface ExpandTestOptions {
    url: string;
    test: (res: request.Response | unknown) => void;
    expand: string;
    token: string;
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

    options.test(res);

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
