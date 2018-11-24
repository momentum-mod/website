export interface MomentumMapInfo {
  id: string;
  mapID?: number;
  totalDownloads: string;
  avatarURL: string;
  description: string;
  numBonuses: number;
  numCheckpoints: number;
  numStages: number;
  difficulty: number;
  createdAt?: Date;
  updatedAt?: Date;
}
