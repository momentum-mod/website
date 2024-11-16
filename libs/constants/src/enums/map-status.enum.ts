export enum MapStatus {
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

export const MapStatuses = Object.freeze({
  IN_SUBMISSION: [
    MapStatus.PRIVATE_TESTING,
    MapStatus.PUBLIC_TESTING,
    MapStatus.CONTENT_APPROVAL,
    MapStatus.FINAL_APPROVAL
  ],
  PRIVATE: [MapStatus.PRIVATE_TESTING, MapStatus.CONTENT_APPROVAL]
});
