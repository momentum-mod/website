"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyMessageCountService = void 0;
const path_constants_1 = require("../path-constants");
const node_sqlite_1 = require("node:sqlite");
class DailyMessageCountService {
    client;
    db;
    constructor(client) {
        this.client = client;
        this.db = new node_sqlite_1.DatabaseSync(path_constants_1.PathConstants.dbFile);
    }
    init() { }
    prepare(sql) {
        return new MessageCountStatement(this.db.prepare(sql));
    }
}
exports.DailyMessageCountService = DailyMessageCountService;
class MessageCountStatement {
    statement;
    constructor(statement) {
        this.statement = statement;
        statement.setReadBigInts(true);
    }
    all(...params) {
        params = params.map((param) => param instanceof Date ? this.stringifyDate(param) : param);
        return this.statement
            .all(...params)
            .map((res) => this.normalizeResult(res));
    }
    get(...params) {
        params = params.map((param) => param instanceof Date ? this.stringifyDate(param) : param);
        const statementResult = this.statement.get(...params);
        if (!statementResult)
            return null;
        return this.normalizeResult(statementResult);
    }
    run(...params) {
        params = params.map((param) => param instanceof Date ? this.stringifyDate(param) : param);
        return this.statement.run(...params);
    }
    // toISOString always returns time in UTC timezone
    stringifyDate(date) {
        return date.toISOString().split("T")[0];
    }
    normalizeResult(rawResult) {
        return {
            UserId: rawResult.UserId.toString(),
            ChannelId: rawResult.ChannelId.toString(),
            Date: new Date(rawResult.Date),
            MessageCount: Number(rawResult.MessageCount),
        };
    }
}
