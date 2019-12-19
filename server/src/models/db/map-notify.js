'use strict';

module.exports = (sequelize, type) => {
    return sequelize.define('mapNotify', {
        notifyOn: {
            type: type.TINYINT.UNSIGNED,
        }
    })
}