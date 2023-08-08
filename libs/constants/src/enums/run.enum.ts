﻿// TODO: Clean this up. Some stuff can probs just live in the module.

export enum RunValidationErrorType {
  BAD_TIMESTAMPS,
  BAD_REPLAY_FILE,
  BAD_META,
  INVALID_STATS,
  OUT_OF_SYNC,
  UNSUPPORTED_MODE,
  FUCKY_BEHAVIOUR
}

interface ErrorData {
  code: number;
  message: string;
}

export const RunValidationErrors: Record<RunValidationErrorType, ErrorData> = {
  [RunValidationErrorType.BAD_TIMESTAMPS]: {
    code: 0,
    message: 'run timestamps were misordered'
  },
  [RunValidationErrorType.BAD_REPLAY_FILE]: {
    code: 1,
    message: 'invalid replay file'
  },
  [RunValidationErrorType.BAD_META]: { code: 2, message: 'invalid metadata' },
  [RunValidationErrorType.INVALID_STATS]: { code: 3, message: 'invalid stats' },
  [RunValidationErrorType.OUT_OF_SYNC]: {
    code: 4,
    message: 'replay data out of sync with submission times'
  },
  [RunValidationErrorType.UNSUPPORTED_MODE]: {
    code: 5,
    message: 'this mode is not currently supported'
  },
  [RunValidationErrorType.FUCKY_BEHAVIOUR]: {
    code: 6,
    message: 'unusual behaviour in replay'
  }
} as const;

export class RunValidationError extends Error {
  code: number;

  constructor(type: RunValidationErrorType) {
    super(RunValidationErrors[type].message);
    this.code = RunValidationErrors[type].code;
  }
}
