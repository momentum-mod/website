import {
  Ban,
  Role,
  ActivityType,
  MapStatus,
  MapCreditType,
  Gamemode,
  TrackType,
  MapSubmissionType,
  LeaderboardType,
  MapTestInviteState,
  Vector2D,
  Vector,
  Style,
  AdminActivityType,
  KillswitchType,
  ReportType,
  ReportCategory,
  MapTag,
  Flags,
  DateString
} from '../../';

// Collection of models used throughout the codebase, as well as in Panorama.
//
// We don't use Prisma types anymore, since
// - Data exported from the backend often has small difference from how it's
//   stored in DB.
// - Prisma schemas *still* can't specific types for Json values.
// - Prisma types are absurdly complicated, and slow down the TypeScript
//   language server.
// - Fuck Prisma.

//#region User

export interface User {
  id: number;
  steamID: string;
  alias: string;
  avatarURL: string;
  country: string | null;
  roles: Flags<Role>;
  bans: Flags<Ban>;
  createdAt: DateString;
  profile?: Profile;
  userStats?: UserStats;
}

export interface Profile {
  bio: string;
  socials: Socials;
}

export type Socials = {
  Discord?: string;
  Twitch?: string;
  YouTube?: string;
  Github?: string;
  Twitter?: string;
  Mastodon?: string;
  LinkedIn?: string;
  Instagram?: string;
  Spotify?: string;
  Patreon?: string;
  'Ko-fi'?: string;
  Paypal?: string;
};

export interface UserStats {
  cosXP: number;
  level: number;
  mapsCompleted: number;
  runsSubmitted: number;
  totalJumps: number;
  totalStrafes: number;
}

export interface Activity {
  id: number;
  userID: number;
  data: number;
  type: ActivityType;
  user?: User;
  createdAt: DateString;
  updatedAt: DateString;
}

export interface Notification {
  id: number;
  read: boolean;
  userID: number;
  user?: User;
  activityID: number;
  activity?: Activity;
  createdAt: DateString;
  updatedAt: DateString;
}

export interface Follow {
  followedID: number;
  followeeID: number;
  notifyOn: Flags<ActivityType>;
  followed?: User;
  followee?: User;
  createdAt: DateString;
}

export interface FollowStatus {
  local?: Follow;
  target?: Follow;
}

export interface MapSummary {
  status: MapStatus;
  statusCount: number;
}

//#endregion
//#region Auth

export interface JWTResponseWeb {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface JWTResponseGame {
  token: string;
  length: number;
}

export interface RefreshToken {
  refreshToken: string;
}

//#endregion User
//#region Admin

export interface AdminActivity {
  id: number;
  comment: string | null;
  type: AdminActivityType;
  target: number;
  oldData: object;
  newData: object;
  userID: number;
  user?: User;
  createdAt: DateString;
}

export type Killswitches = Record<KillswitchType, boolean>;

//#endregion
//#region Reports

export interface Report {
  id: number;
  data: number;
  type: ReportType;
  category: ReportCategory;
  message: string;
  resolved: boolean;
  resolutionMessage?: string;
  submitterID: number;
  submitter: User;
  resolverID: number | null;
  resolver?: User;
  createdAt: DateString;
  updatedAt: DateString;
}

//#endregion
//#region Maps

export interface MMap {
  id: number;
  name: string;
  status: MapStatus;
  submitterID: number;
  createdAt: DateString;
  updatedAt: DateString;
  currentVersion: MapVersion;
  currentVersionID: string;
  versions: MapVersion[];
  info: MapInfo;
  submission: MapSubmission;
  submitter: User;
  images: MapImage[];
  thumbnail: MapImage;
  stats: MapStats;
  credits: MapCredit[];
  favorites: MapFavorite[];
  leaderboards: Leaderboard[];
  worldRecords: LeaderboardRun[];
  personalBests: LeaderboardRun[];
  testInvites?: MapTestInvite[];
}

export interface MapVersion {
  id: string;
  versionNum: number;
  submitterID: number | null;
  changelog: string;
  zones: MapZones;
  bspHash: string;
  zoneHash: string;
  downloadURL: string;
  vmfDownloadURL?: string;
  createdAt: DateString;
}

export interface MapInfo {
  description: string;
  youtubeID: string;
  creationDate: DateString;
}

export interface MapCredit {
  type: MapCreditType;
  description: string | null;
  userID: number;
  user?: User;
  mapID: number;
  map?: MMap;
}

export interface MapFavorite {
  id: number;
  userID: number;
  user?: User;
  mapID: number;
  map?: MMap;
  createdAt: DateString;
}

export interface MapImage {
  id: string;
  small: string;
  medium: string;
  large: string;
  xl: string;
}

export interface MapListVersion {
  approved: number;
  approvedURL: string;
  submissions: number;
  submissionsURL: string;
}

export interface MapNotify {
  notifyOn: ActivityType;
  mapID: number;
  userID: number;
  createdAt: DateString;
  updatedAt: DateString;
}

export interface MapPreSignedUrl {
  url: string;
}

export interface MapReview {
  id: number;
  mainText: string;
  comments: MapReviewComment[];
  numComments: number;
  suggestions: MapReviewSuggestion[];
  editHistory: MapReviewEdit[];
  map: MMap;
  mapID: number;
  reviewerID: number;
  reviewer?: User;
  images: string[];
  resolved: boolean | null;
  resolverID: number;
  resolver?: User;
  createdAt: DateString;
  updatedAt: DateString;
}

export interface MapReviewComment {
  id: number;
  reviewID: number;
  text: string;
  reviewerID?: number;
  reviewer?: User;
  userID: number;
  user?: User;
  createdAt: DateString;
  updatedAt: DateString;
}

export interface MapReviewEdit {
  mainText?: string;
  resolved?: boolean | null;
  editorID: number;
  date: DateString;
}

export interface MapReviewSuggestion {
  gamemode: Gamemode;
  trackType: TrackType;
  trackNum: number;
  tier?: number;
  gameplayRating?: number;
}

export interface MapStats {
  reviews: number;
  downloads: number;
  subscriptions: number;
  plays: number;
  favorites: number;
  completions: number;
  uniqueCompletions: number;
  timePlayed: number;
  baseStats: BaseStats;
}

export interface MapSubmission {
  type: MapSubmissionType;
  suggestions: MapSubmissionSuggestion[];
  placeholders: MapSubmissionPlaceholder[];
  dates: MapSubmissionDate[];
}

export interface MapSubmissionApproval {
  trackType: TrackType;
  trackNum: number;
  gamemode: Gamemode;
  tier?: number; // Hidden leaderboards don't have tiers
  type: Exclude<LeaderboardType, LeaderboardType.IN_SUBMISSION>;
}

export type MapSubmissionDate = {
  status: MapStatus;
  date: DateString;
};

export interface MapSubmissionPlaceholder {
  alias: string;
  type: MapCreditType;
  description?: string;
}

export interface MapSubmissionSuggestion {
  trackType: TrackType;
  trackNum: number;
  gamemode: Gamemode;
  tier: number;
  type: LeaderboardType.RANKED | LeaderboardType.UNRANKED;
  comment?: string;
  tags: MapTag[];
}

export interface MapTestInvite {
  mapID: number;
  userID: number;
  user?: User;
  state: MapTestInviteState;
  createdAt: DateString;
  updatedAt: DateString;
}

//#endregion
//#region Map Zones

export interface MapZones {
  formatVersion: number;
  dataTimestamp: number;
  maxVelocity?: number;
  tracks: MapTracks;
  globalRegions?: GlobalRegions;
}

export interface GlobalRegions {
  allowBhop: Region[];
}

export interface MapTracks {
  main: MainTrack;
  bonuses?: BonusTrack[];
}

export interface MainTrack {
  zones: TrackZones;
  stagesEndAtStageStarts: boolean;
  bhopEnabled?: boolean;
}

export interface BonusTrack {
  zones?: TrackZones;
  defragModifiers?: number;
  bhopEnabled?: boolean;
}

export interface TrackZones {
  segments: Segment[];
  end: Zone;
}

export interface Segment {
  checkpoints: Zone[];
  cancel?: Zone[];
  name?: string;
  limitStartGroundSpeed: boolean;
  checkpointsRequired: boolean;
  checkpointsOrdered: boolean;
}

export interface Zone {
  regions: Region[];
  filtername?: string;
}

export interface Region {
  points: Vector2D[];
  bottom: number;
  height: number;
  teleDestTargetname?: string;
  teleDestPos?: Vector;
  teleDestYaw?: number;
  safeHeight?: number;
}

//#endregion
//#region Stats

export interface BaseStats {
  jumps: number;
  strafes: number;
  avgStrafeSync: number;
  avgStrafeSync2: number;
  enterTime: number;
  totalTime: number;
  velAvg3D: number;
  velAvg2D: number;
  velMax3D: number;
  velMax2D: number;
  velEnter3D: number;
  velEnter2D: number;
  velExit3D: number;
  velExit2D: number;
}

export interface RunStats {
  overall: BaseStats;
  zones?: any; // TODO
}

export interface Leaderboard {
  gamemode: Gamemode;
  trackType: TrackType;
  trackNum: number;
  tier: number | null;
  style: Style;
  type: LeaderboardType;
  tags: MapTag[];
  linear: boolean;
}

export interface LeaderboardStats {
  leaderboard: Leaderboard;
  totalRuns: number;
}

export interface LeaderboardRun {
  gamemode: Gamemode;
  trackType: TrackType;
  trackNum: number;
  style: Style;
  time: number;
  downloadURL: string;
  replayHash: string;
  flags: Style[]; // TODO: Weird, don't know why this is an array not flags
  stats: RunStats;
  rank: number;
  rankXP: number;
  userID: number;
  user?: User;
  mapID: number;
  map?: MMap;
  pastRunID: number;
  pastRun?: PastRun;
  leaderboard?: Leaderboard;
  createdAt: DateString;
}

export interface PastRun {
  id: number;
  gamemode: Gamemode;
  trackType: TrackType;
  trackNum: number;
  style: Style;
  time: number;
  flags: Style[];
  isPB: boolean;
  userID: number;
  user?: User;
  mapID: number;
  map?: MMap;
  leaderboardRun?: LeaderboardRun;
  createdAt: DateString;
}

export interface RunSession {
  id: number;
  mapID: number;
  gamemode: Gamemode;
  trackType: TrackType;
  trackNum: number;
  userID: number;
  createdAt: DateString;
}

export interface RunSessionTimestamp {
  id: number;
  segment: number;
  checkpoint: number;
  time: number;
  sessionID: number;
  createdAt: DateString;
}

export interface XpGain {
  rankXP: number;
  cosXP: {
    gainLvl: number;
    oldXP: number;
    gainXP: number;
  };
}

export interface CompletedRun {
  isNewWorldRecord: boolean;
  isNewPersonalBest: boolean;
  run: LeaderboardRun;
  xp: XpGain;
}

//#endregion
//#region Misc

/* eslint-disable @typescript-eslint/naming-convention */
export interface TwitchStream {
  title: string;
  user_name: string;
  viewer_count: number;
  started_at: string;
  thumbnail_url: string;
}
//#endregion
