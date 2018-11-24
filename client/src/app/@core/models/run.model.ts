import {User} from './user.model';
import {RunStats} from './run-stats.model';

export interface Run {
  id: number;
  tickrate: number;
  dateAchieved: Date;
  time: number;
  flags: number;
  file: string;
  mapID: number;
  playerID: number;
  createdAt?: Date;
  updatedAt?: Date;
  user: User;
  stats: RunStats;
}
