export enum MapStatus {
  APPROVED = 0,
  PENDING = 1,
  NEEDS_REVISION = 2,
  PRIVATE_TESTING = 3,
  PUBLIC_TESTING = 4,
  READY_FOR_RELEASE = 5,
  REJECTED = 6,
  REMOVED = 7
}

// This is the 0.10.0 version of MapStatuses. We've kept the old one for now,
// so everything compiles okay. All map submission work should use THIS enum,
// once complete we'll remove the above enum and rename this one to MapStatus.
export enum MapStatusNew {
  /* Completed submission and is available to everyone */
  APPROVED = 0,
  /* Available in the Beta tab to users with an accepted MapTestingInvite */
  PRIVATE_TESTING = 1,
  /* Awaiting approval from a REVIEWER before it can be made public */
  CONTENT_APPROVAL = 2,
  /* Available to all users in the Beta tab*/
  PUBLIC_TESTING = 3,
  /* Awaiting final approval from a MODERATOR/ADMIN */
  FINAL_APPROVAL = 4,
  /* Anything that has been disabled for some reason, such as rejected map
  submissions, maps with critical bugs (that may often be fixed and re-enabled),
  maps with a DMCA claim, etc. */
  DISABLED = 5
}

export const CombinedMapStatuses = Object.freeze({
  IN_SUBMISSION: [
    MapStatusNew.PRIVATE_TESTING,
    MapStatusNew.PUBLIC_TESTING,
    MapStatusNew.CONTENT_APPROVAL,
    MapStatusNew.FINAL_APPROVAL
  ]
});
