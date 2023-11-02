import { Vector, Vector2D } from '../../utils';
import { JsonObject } from 'type-fest';

export interface MapZones extends JsonObject {
  formatVersion: number;
  dataTimestamp: number;
  tracks: Tracks;
  volumes: Volume[];
}

export interface Tracks extends JsonObject {
  // TODO: #855
  main: TrackEx;
  stages: Track[];
  bonuses: TrackEx[];
}

export interface Track extends JsonObject {
  // TODO: #855
  name?: string;
  majorOrdered?: boolean;
  minorRequired?: boolean;
  zones: {
    segments: Segment[];
    end: Zone;
    cancel?: Zone[];
  };
}

export interface TrackEx extends Track {
  maxVelocity?: number;
  defragFlags?: number;
}

export interface Segment extends JsonObject {
  // TODO: #855
  limitStartGroundSpeed: boolean;
  checkpoints: Zone[];
}

export interface Zone extends JsonObject {
  // TODO: #855
  volumeIndex: number;
  filterName?: string;
}

export interface Volume extends JsonObject {
  // TODO: #855
  regions: Region[];
}

export interface Region extends JsonObject {
  points: Vector2D[];
  bottom: number;
  height: number;
  teleportPos?: Vector;
  teleportYaw?: number;
  safeHeight?: number;
}
