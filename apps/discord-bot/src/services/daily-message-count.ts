import { Client, Snowflake } from "discord.js";
import { Service } from "../types/service";
import { PathConstants } from "../path-constants";
import {
  DatabaseSync,
  StatementResultingChanges,
  StatementSync,
  SupportedValueType,
} from "node:sqlite";

export class DailyMessageCountService implements Service {
  private db: DatabaseSync;
  constructor(public client: Client<true>) {
    this.db = new DatabaseSync(PathConstants.dbFile);
  }
  init() {}

  prepare(sql: string) {
    return new MessageCountStatement(this.db.prepare(sql));
  }
}

class MessageCountStatement {
  constructor(private statement: StatementSync) {
    statement.setReadBigInts(true);
  }

  all(...params: Array<SupportedValueType | Date>): MessageCount[] {
    params = params.map((param) =>
      param instanceof Date ? this.stringifyDate(param) : param
    );

    return this.statement
      .all(...(params as SupportedValueType[]))
      .map((res) => this.normalizeResult(res as RawMessageCount));
  }

  get(...params: Array<SupportedValueType | Date>): MessageCount | null {
    params = params.map((param) =>
      param instanceof Date ? this.stringifyDate(param) : param
    );

    const statementResult = this.statement.get(
      ...(params as SupportedValueType[])
    );
    if (!statementResult) return null;
    return this.normalizeResult(statementResult as RawMessageCount);
  }

  run(...params: Array<SupportedValueType | Date>): StatementResultingChanges {
    params = params.map((param) =>
      param instanceof Date ? this.stringifyDate(param) : param
    );

    return this.statement.run(...(params as SupportedValueType[]));
  }

  // toISOString always returns time in UTC timezone
  private stringifyDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  private normalizeResult(rawResult: RawMessageCount): MessageCount {
    return {
      UserId: rawResult.UserId.toString(),
      ChannelId: rawResult.ChannelId.toString(),
      Date: new Date(rawResult.Date),
      MessageCount: Number(rawResult.MessageCount),
    };
  }
}

interface MessageCount {
  UserId: Snowflake;
  ChannelId: Snowflake;
  Date: Date;
  MessageCount: number;
}

interface RawMessageCount {
  UserId: BigInt;
  ChannelId: BigInt;
  Date: string;
  MessageCount: BigInt;
}
