import { Vector, Vector2D } from '../../utils';

export interface MapZones {
  // extends JsonObject { // TODO: #855
  formatVersion: number;
  dataTimestamp: number;
  maxVelocity?: number;
  tracks: MapTracks;
}

export interface MapTracks {
  // extends JsonObject { // TODO: #855
  main: MainTrack;
  bonuses: BonusTrack[];
}

export interface MainTrack {
  zones: TrackZones;
  stagesEndAtStageStarts: boolean;
}

export interface BonusTrack {
  zones?: TrackZones;
  defragFlags?: number;
}

export interface TrackZones {
  segments: Segment[];
  end: Zone;
}

export interface Segment {
  // extends JsonObject { // TODO: #855
  limitStartGroundSpeed: boolean;
  checkpointsRequired: boolean;
  checkpointsOrdered: boolean;
  checkpoints: Zone[];
  cancel: Zone[];
  name?: string;
}

export interface Zone {
  // extends JsonObject { // TODO: #855
  regions: Region[];
  filterName?: string;
}

export interface Region {
  // extends JsonObject { // TODO: #855
  points: Vector2D[];
  bottom: number;
  height: number;
  teleDestTargetname?: string;
  teleDestPos?: Vector;
  teleDestYaw?: number;
  safeHeight?: number;
}
