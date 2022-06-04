﻿import * as request from 'supertest';

export const TestUtil = {
    async req(
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
    },

    async takeTest(url: string, testFunc: (res: request.Response) => void): Promise<void> {
        const res = await this.req(url, 200, { take: 1 });

        testFunc(res);

        expect(res.body.returnCount).toBe(1);
    },

    async skipTest(url: string, testFunc: (res: request.Response) => void): Promise<void> {
        const res = await this.req(url, 200, { take: 1 });
        const res2 = await this.req(url, 200, { skip: 1, take: 1 });

        testFunc(res);
        testFunc(res2);

        expect(res.body.returnCount).toBe(1);
        expect(res2.body.returnCount).toBe(1);
        expect(res.body.response[0]).not.toBe(res2.body.response[0]);
    }
};
