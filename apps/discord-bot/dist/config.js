"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_constants_1 = require("./path-constants");
const environmentConfigMap = {
    BOT_TOKEN: "bot_token",
    TWITCH_API_CLIENT_ID: "twitch_api_client_id",
    TWITCH_API_CLIENT_SECRET: "twitch_api_client_secret",
};
class Config {
    path;
    constructor(path = "config.json") {
        this.path = path;
        this.reload();
    }
    loadFromEnv() {
        for (const [envKey, configKey] of Object.entries(environmentConfigMap)) {
            if (!process.env[envKey]) {
                throw new Error(`Environment key ${envKey} is not set.`);
            }
            this[configKey] = process.env[envKey];
        }
    }
    reload() {
        const file = (0, fs_1.readFileSync)(this.path);
        Object.assign(this, JSON.parse(file.toString()));
        this.loadFromEnv();
    }
    async reloadAsync() {
        const file = await (0, promises_1.readFile)(this.path);
        Object.assign(this, JSON.parse(file.toString()));
        this.loadFromEnv();
    }
    async save() {
        // Removing environment variables and config path
        const cleanConfig = {
            ...this,
            ...Object.fromEntries(Object.values(environmentConfigMap).map((k) => [k, undefined])),
            path: undefined,
        };
        await (0, promises_1.writeFile)(this.path, JSON.stringify(cleanConfig, null, 2));
    }
}
exports.config = new Config(path_constants_1.PathConstants.configFile);
