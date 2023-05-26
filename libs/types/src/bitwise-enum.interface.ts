import { Ban, Role } from '@momentum/constants';

export type BitwiseEnum<T extends Role | Ban> = number;
