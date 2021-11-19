/*
*   This script is used to clear and recreate the database tables. Use the following command
*   to run this script:
*
*   docker compose exec api node ../scripts/force_sync_db.js
*/

'use strict';
const { forceSyncDB, XPSystems } = require('../server/config/sqlize'),
    xpSystems = require('../server/src/models/xp-systems');

forceSyncDB().then(() => {
    console.log('Database tables successfully recreated!');
    return xpSystems.initXPSystems(XPSystems);
}).then(() => {
    console.log('Database tables successfully initialized!');
    process.exit();
}).catch(err => {
    console.error(err);
    process.exit();
});
