import {
  Gamemode,
  LobbyStatus,
  MapLobbyPlayerCount,
  MapLobbyPlayerCounts
} from '@momentum/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, Min, ValidateIf } from 'class-validator';
import { EnumProperty, IdProperty, NestedProperty } from '../decorators';
import { IsSteamCommunityID } from '../../validators';

/**
 * Body of the `lobby.update` message: the Steam lobby the player is currently
 * in, and the map they're on within it. Sent whenever any of it changes.
 */
export class LobbyStatusDto implements LobbyStatus {
  @ApiProperty({
    type: String,
    description: 'Steam ID of the lobby, as a uint64 string'
  })
  @IsSteamCommunityID()
  readonly lobbyID: string;

  @ApiProperty({
    type: Boolean,
    description: 'Whether this is an automatic per-map lobby'
  })
  @IsBoolean()
  readonly isMapLobby: boolean;

  // Optional via @ValidateIf rather than `required: false`, whose @IsOptional
  // would also let a map lobby omit it. Map lobbies only exist while on their
  // map, so always have one.
  @ValidateIf(
    (status: LobbyStatusDto) => status.isMapLobby || status.mapID != null
  )
  @IdProperty({ description: 'ID of the map the player is on, if any' })
  readonly mapID?: number;

  @ValidateIf((status: LobbyStatusDto) => status.mapID != null)
  @EnumProperty(Gamemode, {
    description: 'Gamemode the player is playing the map in, if on one'
  })
  readonly gamemode?: Gamemode;
}

/** Body of the `lobby.mapcounts` message. */
export class MapLobbyPlayerCountsQueryDto {
  @EnumProperty(Gamemode)
  readonly gamemode: Gamemode;
}

export class MapLobbyPlayerCountDto implements MapLobbyPlayerCount {
  @IdProperty()
  readonly mapID: number;

  @ApiProperty({ type: Number })
  @IsInt()
  @Min(1)
  readonly count: number;
}

/**
 * Response to `lobby.mapcounts`: the number of players in each map's lobbies.
 * Maps with nobody in them are omitted.
 */
export class MapLobbyPlayerCountsDto implements MapLobbyPlayerCounts {
  @EnumProperty(Gamemode)
  readonly gamemode: Gamemode;

  @NestedProperty(MapLobbyPlayerCountDto, { isArray: true, required: true })
  readonly counts: MapLobbyPlayerCountDto[];
}
