"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathConstants = void 0;
const path_1 = require("path");
const configFolder = (0, path_1.join)(process.cwd(), "config");
const configFile = (0, path_1.join)(configFolder, "config.json");
const dbFolder = (0, path_1.join)(process.cwd(), "data");
const dbFile = (0, path_1.join)(dbFolder, "bot_data.db");
exports.PathConstants = {
    configFolder,
    configFile,
    dbFolder,
    dbFile,
};
