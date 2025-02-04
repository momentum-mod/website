"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitchAPI = void 0;
const config_1 = require("./config");
class TwitchAPI {
    token;
    tokenExpireAt;
    constructor() { }
    async checkToken() {
        if (!this.token || !this.tokenExpireAt || new Date() <= this.tokenExpireAt)
            await this.updateToken();
    }
    async apiGet(path, query) {
        await this.checkToken();
        const response = await fetch("https://api.twitch.tv/" +
            path +
            "?" +
            new URLSearchParams(query).toString(), {
            headers: {
                Authorization: "Bearer " + this.token,
                "Client-Id": config_1.config.twitch_api_client_id,
            },
        });
        const rawBody = await response.text();
        if (!response.ok) {
            throw new Error(`Failed to fetch twitch api path ${path} with status ${response.status}: ${rawBody}`);
        }
        return JSON.parse(rawBody);
    }
    async updateToken() {
        const response = await fetch("https://id.twitch.tv/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: config_1.config.twitch_api_client_id,
                client_secret: config_1.config.twitch_api_client_secret,
                grant_type: "client_credentials",
            }).toString(),
        });
        const rawBody = await response.text();
        if (!response.ok) {
            throw new Error(`Failed to update twitch token with status ${response.status}: ${rawBody}`);
        }
        const body = JSON.parse(rawBody);
        this.token = body.access_token;
        this.tokenExpireAt = new Date(Date.now() + body.expires_in * 1000);
    }
    momentumModGameId;
    async getMomentumModId() {
        const { data } = await this.apiGet("helix/games", { name: "Momentum Mod" });
        this.momentumModGameId = data[0].id;
        return this.momentumModGameId;
    }
    categoryNames = new Map();
    async getGameName(id) {
        if (this.categoryNames.has(id))
            return this.categoryNames.get(id);
        const { data } = await this.apiGet("helix/games", { id });
        const name = data[0].name;
        this.categoryNames.set(id, name);
        return name;
    }
    async getLiveMomentumModStreams() {
        const { data } = await this.apiGet("helix/streams", {
            game_id: this.momentumModGameId ?? (await this.getMomentumModId()),
        });
        return data;
    }
    async getUser(id) {
        const { data } = await this.apiGet("helix/users", { id });
        return data[0] ?? null;
    }
    userIds = new Map();
    async getUserId(username) {
        // Input is user id
        if (!isNaN(parseInt(username)))
            return username;
        // User id is in cache
        if (this.userIds.has(username))
            return this.userIds.get(username);
        // Get user id and cache
        const { data } = await this.apiGet("helix/users", { login: username });
        const id = data[0]?.id;
        if (!id)
            return null;
        this.userIds.set(username, id);
        return id;
    }
}
exports.TwitchAPI = TwitchAPI;
