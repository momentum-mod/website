export enum RunValidationErrorTypes {
    BAD_TIMESTAMPS,
    BAD_REPLAY_FILE,
    BAD_META,
    INVALID_STATS,
    OUT_OF_SYNC,
    UNSUPPORTED_MODE,
    FUCKY_BEHAVIOUR
}

interface ErrData {
    code: number;
    message: string;
}

export const RunValidationErrors: Record<RunValidationErrorTypes, ErrData> = {
    [RunValidationErrorTypes.BAD_TIMESTAMPS]: { code: 0, message: 'run timestamps were misordered' },
    [RunValidationErrorTypes.BAD_REPLAY_FILE]: { code: 1, message: 'invalid replay file' },
    [RunValidationErrorTypes.BAD_META]: { code: 2, message: 'invalid metadata' },
    [RunValidationErrorTypes.INVALID_STATS]: { code: 3, message: 'invalid stats' },
    [RunValidationErrorTypes.OUT_OF_SYNC]: { code: 4, message: 'replay data out of sync with submission times' },
    [RunValidationErrorTypes.UNSUPPORTED_MODE]: { code: 5, message: 'this mode is not currently supported' },
    [RunValidationErrorTypes.FUCKY_BEHAVIOUR]: { code: 6, message: 'unusual behaviour in replay' }
} as const;

export class RunValidationError extends Error {
    code: number;

    constructor(type: RunValidationErrorTypes) {
        super(RunValidationErrors[type].message);
        this.code = RunValidationErrors[type].code;
    }
}
