import {User} from './user.model';

export interface Run {
  id: number;
  tickrate: number;
  dateAchieved: Date;
  time: number;
  flags: number;
  file: string;
  mapID: number;
  playerID: number;
  createdAt: Date;
  updatedAt: Date;
  user: User;
}
