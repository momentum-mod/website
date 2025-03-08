import { config } from './config';
import axios from 'axios';
import { TwitchStream, TwitchUser } from '@momentum/constants';

export class TwitchAPI {
  private token?: string;
  private tokenExpireAt?: Date;

  private async checkToken() {
    if (!this.token || !this.tokenExpireAt || new Date() <= this.tokenExpireAt)
      await this.updateToken();
  }

  private async apiGet(path: string, query: Record<string, any>) {
    await this.checkToken();

    const response = await axios.get(
      'https://api.twitch.tv/' +
        path +
        '?' +
        new URLSearchParams(query).toString(),
      {
        headers: {
          Authorization: 'Bearer ' + this.token,
          'Client-Id': config.twitch_api_client_id
        },
        validateStatus: () => true
      }
    );

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `Failed to fetch twitch api path ${path} with status ${response.status}: ${response.data}`
      );
    }

    return response.data;
  }

  async updateToken() {
    const response = await axios.post(
      'https://id.twitch.tv/oauth2/token',
      new URLSearchParams({
        client_id: config.twitch_api_client_id,
        client_secret: config.twitch_api_client_secret,
        grant_type: 'client_credentials'
      }).toString(),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `Failed to update twitch token with status ${response.status}: ${response.data}`
      );
    }

    const body = response.data;
    this.token = body.access_token;
    this.tokenExpireAt = new Date(Date.now() + body.expires_in * 1000);
  }

  private categoryNames = new Map<string, string>();
  async getGameName(id: string): Promise<string> {
    if (this.categoryNames.has(id)) return this.categoryNames.get(id)!;

    return await this.apiGet('helix/games', { id }).then(
      ({ data: [{ name }] }) => {
        this.categoryNames.set(id, name);
        return name;
      }
    );
  }

  async getLiveMomentumModStreams(): Promise<TwitchStream[]> {
    return await Promise.all([
      this.apiGet('helix/streams', {
        game_id: config.twitch_momentum_mod_game_id
      }),
      this.apiGet('helix/streams', {
        user_id: config.twitch_momentum_mod_official_channels.join(',')
      })
    ]).then((arr) => arr.flatMap(({ data }) => data));
  }

  async getUser(id: string): Promise<TwitchUser | null> {
    return await this.apiGet('helix/users', { id }).then(
      ({ data }) => data[0] ?? null
    );
  }

  private userIds = new Map<string, string>();
  async getUserId(username: string): Promise<string | null> {
    // Input is user id
    if (!Number.isNaN(Number.parseInt(username))) return username;

    // User id is in cache
    if (this.userIds.has(username)) return this.userIds.get(username)!;

    // Get user id and cache
    const { data } = await this.apiGet('helix/users', { login: username });
    const id = data[0]?.id;
    if (!id) return null;
    this.userIds.set(username, id);
    return id;
  }
}
