// https://developer.valvesoftware.com/wiki/Steam_Web_API#GetPlayerSummaries_.28v0002.29
export interface SteamUserSummaryResponse {
    _json: SteamUserSummaryData;
    provider: string;
    id: string;
    displayName: string;
    photos: [{ value: string }, { value: string }, { value: string }];
}

export interface SteamUserSummaryData {
    steamid: string;
    communityvisibilitystate: number;
    profilestate: number;
    personaname: string;
    profileurl: string;
    avatar: string;
    avatarmedium: string;
    avatarfull: string;
    avatarhash: string;
    lastlogoff: number;
    personastate: number;
    realname: string;
    primaryclanid: string;
    timecreated: number;
    personastateflags: number;
    loccountrycode: string;
}

export interface SteamFriendData {
    steamid: string;
    relationship: string;
    friend_since: number;
}
