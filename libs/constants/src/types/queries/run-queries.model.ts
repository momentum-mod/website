﻿import { Gamemode } from '../../enums/gamemode.enum';
import { TrackType } from '../../enums/track-type.enum';
import { Style } from '../../enums/style.enum';
import { PagedQuery } from './pagination.model';
import { Order } from './order.model';
import { RunSession } from '../../';

export type RunsGetAllExpand = Array<'user' | 'map' | 'leaderboardRun'>;
export enum RunsGetAllOrder {
  DATE = 'createdAt',
  RUN_TIME = 'time'
}

export type RunsGetAllQuery = PagedQuery & {
  expand?: RunsGetAllExpand;
  mapID?: number;
  mapName?: string;
  gamemode?: Gamemode;
  trackType?: TrackType; // Default 0
  trackNum?: number; // Default 1
  style?: Style; // Default 0
  flags?: number[];
  userID?: number;
  userIDs?: number[];
  isPB?: boolean;
  orderBy?: RunsGetAllOrder;
  order?: Order;
};

export type RunsGetExpand = RunsGetAllExpand;

export type RunsGetQuery = {
  expand?: RunsGetExpand;
};

export type CreateRunSession = Pick<
  RunSession,
  'mapID' | 'gamemode' | 'trackType' | 'trackNum'
>;

export interface UpdateRunSession {
  majorNum: number;
  minorNum: number;
  time: number;
}
