import { Snowflake } from 'discord.js';
import { Service } from '../types/service';
import { PathConstants } from '../path-constants';
import {
  DatabaseSync,
  StatementResultingChanges,
  StatementSync,
  SupportedValueType
} from 'node:sqlite';

export class DailyMessageCountService extends Service {
  private db = new DatabaseSync(PathConstants.dbFile);

  prepare(sql: string) {
    return new MessageCountStatement(this.db.prepare(sql));
  }
}

class MessageCountStatement {
  constructor(private statement: StatementSync) {
    statement.setReadBigInts(true);
  }

  all(...params: Array<SupportedValueType | Date>): MessageCount[] {
    return this.statement
      .all(...stringifyDateInParams(params))
      .map((res) => this.normalizeResult(res as RawMessageCount));
  }

  get(...params: Array<SupportedValueType | Date>): MessageCount | null {
    const statementResult = this.statement.get(
      ...stringifyDateInParams(params)
    );
    if (!statementResult) return null;
    return this.normalizeResult(statementResult as RawMessageCount);
  }

  run(...params: Array<SupportedValueType | Date>): StatementResultingChanges {
    return this.statement.run(...stringifyDateInParams(params));
  }

  private normalizeResult(rawResult: RawMessageCount): MessageCount {
    return {
      UserId: rawResult.UserId.toString(),
      ChannelId: rawResult.ChannelId.toString(),
      Date: new Date(rawResult.Date),
      MessageCount: Number(rawResult.MessageCount)
    };
  }
}
// toISOString always returns time in UTC timezone
function stringifyDateInParams(
  params: Array<SupportedValueType | Date>
): Array<SupportedValueType> {
  return params.map((param) =>
    param instanceof Date ? param.toISOString().split('T')[0] : param
  );
}

interface MessageCount extends Record<string, unknown> {
  UserId: Snowflake;
  ChannelId: Snowflake;
  Date: Date;
  MessageCount: number;
}

interface RawMessageCount extends Record<string, unknown> {
  UserId: bigint;
  ChannelId: bigint;
  Date: string;
  MessageCount: bigint;
}
