CREATE TABLE IF NOT EXISTS `message_count`
(
    `UserId`       bigint unsigned    NOT NULL,
    `ChannelId`    bigint unsigned    NOT NULL,
    `Date`         date               NOT NULL,
    `MessageCount` mediumint unsigned NOT NULL,
    PRIMARY KEY (`UserId`, `ChannelId`, `Date`)
)
