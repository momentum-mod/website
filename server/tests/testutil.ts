import * as request from 'supertest';

export async function get(
    url: string,
    status: number,
    query?: Record<string, unknown>,
    accessToken: string = global.accessToken
): Promise<request.Test> {
    return request(global.server)
        .get('/api/v1/' + url)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer ' + accessToken)
        .query(query ? query : {})
        .expect('Content-Type', /json/)
        .expect(status);
}

export async function post(
    url: string,
    status: number,
    send?: Record<string, unknown>,
    accessToken: string = global.accessToken
): Promise<request.Test> {
    return request(global.server)
        .post('/api/v1/' + url)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer ' + accessToken)
        .send(send ? send : {})
        .expect(status);
}

export async function put(
    url: string,
    status: number,
    send?: Record<string, unknown>,
    accessToken: string = global.accessToken
): Promise<request.Test> {
    return request(global.server)
        .put('/api/v1/' + url)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer ' + accessToken)
        .send(send ? send : {})
        .expect(status);
}

export async function patch(
    url: string,
    status: number,
    send?: Record<string, unknown>,
    accessToken: string = global.accessToken
): Promise<request.Test> {
    return request(global.server)
        .patch('/api/v1/' + url)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer ' + accessToken)
        .send(send ? send : {})
        .expect(status);
}

export async function del(
    url: string,
    status: number,
    accessToken: string = global.accessToken
): Promise<request.Test> {
    return request(global.server)
        .delete('/api/v1/' + url)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(status);
}

export async function takeTest(url: string, testFn: (res: request.Response) => void): Promise<void> {
    const res = await get(url, 200, { take: 1 });

    testFn(res);

    expect(res.body.returnCount).toBe(1);
}

export async function skipTest(url: string, testFn: (res: request.Response) => void): Promise<void> {
    const res = await get(url, 200, { take: 1 });
    const res2 = await get(url, 200, { skip: 1, take: 1 });

    testFn(res);
    testFn(res2);

    expect(res.body.returnCount).toBe(1);
    expect(res2.body.returnCount).toBe(1);
    expect(res.body.response[0]).not.toBe(res2.body.response[0]);
}
