export class DatabaseError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'DbError';
  }
}

export class DatabaseNotFoundError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'DbNotFoundError';
  }
}
