'use strict';
const { Op, Report, User } = require('../../config/sqlize'),
    ServerError = require('../helpers/server-error');

const ReportCategory = Object.freeze({
    INAPPROPRIATE_CONTENT: 1,
    PLAGIARSIM: 2,
    SPAM: 3,
    OTHER: 0,
});

const ReportType = Object.freeze({
    USER_PROFILE_REPORT: 0,
    MAP_REPORT: 1,
    MAP_COMMENT_REPORT: 2,
});

const DAILY_REPORT_LIMIT = 5;

module.exports = {

    ReportCategory,
    ReportType,

	create: (report) => {
        const beginningOfToday = (new Date()).setHours(0,0,0,0);
        return Report.count({
            where: {
                submitterID: report.submitterID,
                createdAt: {
                    [Op.gte]: beginningOfToday
                },
            },
        }).then(numOfReportsSubmittedToday => {
            if (numOfReportsSubmittedToday >= DAILY_REPORT_LIMIT)
                return Promise.reject(new ServerError(409, 'Daily report limit reached'));
            return Report.create(report);
        });
    },
    
    getAll: (queryParams) => {
        const queryOptions = {
            include: [],
            where: {},
			limit: 20,
        };
        if (queryParams.limit)
			queryOptions.limit = queryParams.limit;
		if (queryParams.offset)
            queryOptions.offset = queryParams.offset;
        if ('resolved' in queryParams)
            queryOptions.where.resolved = queryParams.resolved;
        if (queryParams.expand) {
            const expansionNames = queryParams.expand.split(',');
			if (expansionNames.includes('submitter')) {
                queryOptions.include.push({
                    model: User, as: 'submitter'
                });
            }
            if (expansionNames.includes('resolver')) {
                queryOptions.include.push({
                    model: User, as: 'resolver'
                });
            }
        }
        return Report.findAndCountAll(queryOptions);
    },

    update: (reportID, report) => {
        // if setting
        return Report.update(report, {
            where: { id: reportID },
        });
    },

};
