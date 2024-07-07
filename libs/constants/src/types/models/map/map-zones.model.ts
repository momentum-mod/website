import { Vector, Vector2D } from '../../utils';

// TypeScript equivalent of the C++ structs in mom_timer_defs.h
// Note C++ has everything in a "ZoneDefs" namespace, and uses "Base" for our "MapZones".

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
  defragModifiers?: number;
}

export interface TrackZones {
  segments: Segment[];
  end: Zone;
}

export interface Segment {
  // extends JsonObject { // TODO: #855
  checkpoints: Zone[];
  cancel: Zone[];
  name?: string;
  limitStartGroundSpeed: boolean;
  checkpointsRequired: boolean;
  checkpointsOrdered: boolean;
}

export interface Zone {
  // extends JsonObject { // TODO: #855
  regions: Region[];
  filtername?: string;
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
