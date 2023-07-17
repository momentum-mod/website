import { Role } from '../../enums/role.enum';
import { Ban } from '../../enums/bans.enum';

// TODO: Stupid, change to type Bitfield = number;
export type BitwiseEnum<T extends Role | Ban> = number;
