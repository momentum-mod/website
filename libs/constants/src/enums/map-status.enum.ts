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
  /* Rejected for being unsalvagable crap, rule-breaking etc. */
  REJECTED = 5,
  /* Previously approved but subsequentially disabled for some reason.
   * This could be due to a critical bug or some other reason that makes us want
   * to keep it in DB whilst it gets patched, rather than outright deleted. */
  DISABLED = 6
}
