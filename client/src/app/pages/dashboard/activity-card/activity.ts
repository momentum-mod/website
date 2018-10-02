

export enum Activity_Type {
  ALL = 0,
  TIME_SUBMITTED = 1,
  MAP_UPLOADED = 2,
}

export class MapActivityData {
  constructor(public mapID: number /* TODO more info*/) {
  }
}

export class Activity {
  constructor(public type: Activity_Type, // Type of the activity
              public userID: number,   // ID of the user who did this activity
              // Data object: map uploads have the map object, times has the submission to leaderboard, etc
              public data: any) {
  }
}
