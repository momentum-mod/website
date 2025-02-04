import { config } from "./config";
import { TwitchStream, TwitchUser } from "./types/twitch";

export class TwitchAPI {
  private token?: string;
  private tokenExpireAt?: Date;

  constructor() {}

  private async checkToken() {
    if (!this.token || !this.tokenExpireAt || new Date() <= this.tokenExpireAt)
      await this.updateToken();
  }

  private async apiGet(path: string, query: Record<string, any>) {
    await this.checkToken();

    const response = await fetch(
      "https://api.twitch.tv/" +
        path +
        "?" +
        new URLSearchParams(query).toString(),
      {
        headers: {
          Authorization: "Bearer " + this.token,
          "Client-Id": config.twitch_api_client_id,
        },
      }
    );
    const rawBody = await response.text();

    if (!response.ok) {
      throw new Error(
        `Failed to fetch twitch api path ${path} with status ${response.status}: ${rawBody}`
      );
    }

    return JSON.parse(rawBody);
  }

  async updateToken() {
    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.twitch_api_client_id,
        client_secret: config.twitch_api_client_secret,
        grant_type: "client_credentials",
      }).toString(),
    });
    const rawBody = await response.text();

    if (!response.ok) {
      throw new Error(
        `Failed to update twitch token with status ${response.status}: ${rawBody}`
      );
    }

    const body = JSON.parse(rawBody);
    this.token = body.access_token;
    this.tokenExpireAt = new Date(Date.now() + body.expires_in * 1000);
  }

  private momentumModGameId?: string;
  async getMomentumModId(): Promise<string> {
    const { data } = await this.apiGet("helix/games", { name: "Momentum Mod" });
    this.momentumModGameId = data[0].id;
    return this.momentumModGameId!;
  }

  private categoryNames: Map<string, string> = new Map();
  async getGameName(id: string): Promise<string> {
    if (this.categoryNames.has(id)) return this.categoryNames.get(id)!;
    const { data } = await this.apiGet("helix/games", { id });
    const name = data[0].name;
    this.categoryNames.set(id, name);
    return name;
  }

  async getLiveMomentumModStreams(): Promise<TwitchStream[]> {
    const { data } = await this.apiGet("helix/streams", {
      game_id: this.momentumModGameId ?? (await this.getMomentumModId()),
    });
    return data;
  }

  async getUser(id: string): Promise<TwitchUser | null> {
    const { data } = await this.apiGet("helix/users", { id });
    return data[0] ?? null;
  }

  private userIds: Map<string, string> = new Map();
  async getUserId(username: string): Promise<string | null> {
    // Input is user id
    if (!isNaN(parseInt(username))) return username;

    // User id is in cache
    if (this.userIds.has(username)) return this.userIds.get(username)!;

    // Get user id and cache
    const { data } = await this.apiGet("helix/users", { login: username });
    const id = data[0]?.id;
    if (!id) return null;
    this.userIds.set(username, id);
    return id;
  }
}
