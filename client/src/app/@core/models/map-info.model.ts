export interface MomentumMapInfo {
  id: string;
  mapID?: number;
  avatarURL: string;
  description: string;
  numBonuses: number;
  numZones: number;
  isLinear: boolean;
  difficulty: number;
  creationDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
