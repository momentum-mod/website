export class DbError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'DbError';
    }
}

export class DbNotFoundError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'DbNotFoundError';
    }
}
