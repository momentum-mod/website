import { Gamemode } from '../enums/gamemode.enum';

/**
 * Set of gamemodes we won't generate leaderboards or allow suggestions for.
 * In the future this will probably be empty, but helpful for handling
 * in-development modes that don't have full leaderboards support yet.
 */
export const DisabledGamemodes = new Set<Gamemode>([Gamemode.CLIMB_MOM]);
