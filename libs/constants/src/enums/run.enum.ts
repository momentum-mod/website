export enum RunValidationErrorType {
  BAD_TIMESTAMPS = 0,
  BAD_REPLAY_FILE = 1,
  BAD_META = 2,
  INVALID_STATS = 3,
  OUT_OF_SYNC = 4,
  UNSUPPORTED_MODE = 5,
  FUCKY_BEHAVIOUR = 6,
  INTERNAL_ERROR = 7
}

// prettier-ignore
export const RunValidationErrorMessages: Record<RunValidationErrorType, string> = {
  [RunValidationErrorType.BAD_TIMESTAMPS]: 'run timestamps were misordered',
  [RunValidationErrorType.BAD_REPLAY_FILE]: 'invalid replay file',
  [RunValidationErrorType.BAD_META]: 'invalid metadata',
  [RunValidationErrorType.INVALID_STATS]: 'invalid stats',
  [RunValidationErrorType.OUT_OF_SYNC]: 'replay data out of sync with submission times',
  [RunValidationErrorType.UNSUPPORTED_MODE]: 'this mode is not currently supported',
  [RunValidationErrorType.FUCKY_BEHAVIOUR]: 'unusual behaviour in replay',
  [RunValidationErrorType.INTERNAL_ERROR]: 'an internal server error occurred'
}

export class RunValidationError extends Error {
  code: RunValidationErrorType;

  constructor(type: RunValidationErrorType) {
    super(RunValidationErrorMessages[type]);
    this.code = type;
  }
}
