import fs from 'node:fs';
import request, { Test, Response } from 'supertest';
import { URL_PREFIX } from '@tests/e2e/e2e.config';
import { Type } from '@nestjs/common';

export interface RequestOptions {
    url: string;
    status: number;
    query?: Record<string, unknown>;
    token?: string;
    contentType?: string | RegExp | null;
    validate?: Type;
    validateArray?: Type | { type: Type; length: number };
    validatePaged?: Type | { type: Type; returnCount?: number; totalCount?: number };
}

export interface JsonBodyRequestOptions extends RequestOptions {
    body?: Record<string, unknown>;
}

export type AttachRequestOptions = Omit<RequestOptions, 'contentType'> & {
    file: Blob | Buffer | fs.ReadStream | string;
    field?: string;
};

export async function get(options: RequestOptions): Promise<Response> {
    const req = request(global.server)
        .get(URL_PREFIX + options.url)
        .set('Accept', 'application/json');
    token(req, options.token);
    contentType(req, options.contentType);
    query(req, options.query);
    status(req, options.status);
    const res = await req;
    validate(res, options);
    return res;
}

export async function getNoContent(options: RequestOptions): Promise<Response> {
    const req = request(global.server)
        .get(URL_PREFIX + options.url)
        .set('Accept', 'application/json');
    status(req, options.status);
    token(req, options.token);
    query(req, options.query);
    return req;
}

export async function post(options: JsonBodyRequestOptions): Promise<Response> {
    const req = request(global.server)
        .post(URL_PREFIX + options.url)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json');
    token(req, options.token);
    query(req, options.query);
    body(req, options.body);
    status(req, options.status);
    const res = await req;
    validate(res, options);
    return res;
}

export async function put(options: JsonBodyRequestOptions): Promise<Response> {
    const req = request(global.server)
        .put(URL_PREFIX + options.url)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json');
    token(req, options.token);
    query(req, options.query);
    body(req, options.body);
    status(req, options.status);
    const res = await req;
    validate(res, options);
    return res;
}

export async function patch(options: JsonBodyRequestOptions): Promise<Response> {
    const req = request(global.server)
        .patch(URL_PREFIX + options.url)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json');
    token(req, options.token);
    query(req, options.query);
    body(req, options.body);
    status(req, options.status);
    const res = await req;
    validate(res, options);
    return res;
}

export async function del(options: RequestOptions): Promise<Response> {
    const req = request(global.server)
        .delete(URL_PREFIX + options.url)
        .set('Accept', 'application/json');
    token(req, options.token);
    query(req, options.query);
    status(req, options.status);
    const res = await req;
    validate(res, options);
    return res;
}

export async function postAttach(options: AttachRequestOptions): Promise<Response> {
    const req = request(global.server)
        .post(URL_PREFIX + options.url)
        .set('Accept', 'application/json');
    token(req, options.token);
    req.set('Content-Type', 'multipart/form-data').attach(
        options.field ?? 'file',
        typeof options.file === 'string' ? './tests/files/' + options.file : options.file
    );
    status(req, options.status);

    const res = await req;
    validate(res, options);
    return res;
}

export async function putAttach(options: AttachRequestOptions): Promise<Response> {
    const req = request(global.server)
        .put(URL_PREFIX + options.url)
        .set('Accept', 'application/json');
    token(req, options.token);
    req.set('Content-Type', 'multipart/form-data').attach(
        options.field ?? 'file',
        typeof options.file === 'string' ? './tests/files/' + options.file : options.file
    );
    status(req, options.status);

    const res = await req;
    validate(res, options);
    return res;
}

function contentType(req: Test, contentType: string | RegExp | null) {
    if (contentType !== null)
        if (contentType === undefined) req.expect('Content-Type', /json/);
        else if (typeof contentType === 'string') req.expect('Content-Type', new RegExp(contentType));
        else req.expect('Content-Type', contentType as RegExp);
}

function token(req: Test, token?: string) {
    if (token) req.set('Authorization', 'Bearer ' + token);
}

function query(req: Test, query?: Record<string, unknown>) {
    if (query) req.query(query);
}

function status(req: Test, status: number) {
    req.expect(status);
}

function body(req: Test, body: Record<string, unknown>): Test {
    if (body) req = req.send(body);
    return req;
}

function validate(res: Response, options: RequestOptions) {
    if (options.validate) expect(res.body).toBeValidDto(options.validate);
    else if (options.validatePaged)
        if ('type' in options.validatePaged)
            expect(res.body).toBeValidPagedDto(
                options.validatePaged.type,
                options.validatePaged.returnCount,
                options.validatePaged.totalCount
            );
        else expect(res.body).toBeValidPagedDto(options.validatePaged);
    else if (options.validateArray)
        if ('type' in options.validateArray) {
            for (const item of res.body) expect(item).toBeValidDto(options.validateArray.type);
            expect(res.body).toHaveLength(options.validateArray.length);
        } else for (const item of res.body) expect(item).toBeValidDto(options.validateArray);
}
