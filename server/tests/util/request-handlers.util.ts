import fs from 'node:fs';
import request, { Test } from 'supertest';
import { URL_PREFIX } from '@tests/e2e/e2e.config';

//#region Interfaces

export interface RequestOptions {
    url: string;
    status: number;
    query?: Record<string, unknown>;
    token?: string;
    contentType?: string | RegExp | null;
}

export interface JsonBodyRequestOptions extends RequestOptions {
    body?: Record<string, unknown>;
}

export type AttachRequestOptions = Omit<RequestOptions, 'contentType'> & {
    file: Blob | Buffer | fs.ReadStream | string;
    field?: string;
};

export async function get(options: RequestOptions): Promise<Test> {
    const req = request(global.server)
        .get(URL_PREFIX + options.url)
        .set('Accept', 'application/json');
    token(req, options);
    contentType(req, options);
    query(req, options);
    status(req, options);
    return req;
}

export async function getNoContent(options: RequestOptions): Promise<Test> {
    const req = request(global.server)
        .get(URL_PREFIX + options.url)
        .set('Accept', 'application/json');
    token(req, options);
    query(req, options);
    status(req, options);
    return req;
}

export async function post(options: JsonBodyRequestOptions): Promise<Test> {
    const req = request(global.server)
        .post(URL_PREFIX + options.url)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json');
    token(req, options);
    query(req, options);
    body(req, options);
    status(req, options);
    return req;
}

export async function put(options: JsonBodyRequestOptions): Promise<Test> {
    const req = request(global.server)
        .put(URL_PREFIX + options.url)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json');
    token(req, options);
    query(req, options);
    body(req, options);
    status(req, options);
    return req;
}

export async function patch(options: JsonBodyRequestOptions): Promise<Test> {
    const req = request(global.server)
        .patch(URL_PREFIX + options.url)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json');
    token(req, options);
    query(req, options);
    body(req, options);
    status(req, options);
    return req;
}

export async function del(options: RequestOptions): Promise<Test> {
    const req = request(global.server)
        .delete(URL_PREFIX + options.url)
        .set('Accept', 'application/json');
    token(req, options);
    query(req, options);
    status(req, options);
    return req;
}

export async function postAttach(options: AttachRequestOptions): Promise<Test> {
    const req = request(global.server)
        .post(URL_PREFIX + options.url)
        .set('Accept', 'application/json');
    token(req, options);
    req.set('Content-Type', 'multipart/form-data').attach(
        options.field ?? 'file',
        typeof options.file === 'string' ? './tests/files/' + options.file : options.file
    );
    status(req, options);

    return req;
}

export async function putAttach(options: AttachRequestOptions): Promise<Test> {
    const req = request(global.server)
        .put(URL_PREFIX + options.url)
        .set('Accept', 'application/json');
    token(req, options);
    req.set('Content-Type', 'multipart/form-data').attach(
        options.field ?? 'file',
        typeof options.file === 'string' ? './tests/files/' + options.file : options.file
    );
    status(req, options);

    return req;
}

function contentType(req: Test, options: RequestOptions) {
    if (options.contentType !== null)
        if (options.contentType === undefined) req.expect('Content-Type', /json/);
        else if (typeof options.contentType === typeof String)
            req.expect('Content-Type', options.contentType as string);
        else req.expect('Content-Type', options.contentType as RegExp);
}

function token(req: Test, options: RequestOptions) {
    if (options.token) req.set('Authorization', 'Bearer ' + options.token);
}

function query(req: Test, options: RequestOptions) {
    if (options.query) req.query(options.query);
}

function status(req: Test, options: RequestOptions) {
    req.expect(options.status);
}

function body(req: Test, options: JsonBodyRequestOptions): Test {
    if (options.body) req = req.send(options.body);
    return req;
}
