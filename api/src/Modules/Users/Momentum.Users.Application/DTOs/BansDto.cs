using System;

namespace Momentum.Users.Application.DTOs
{
    [Flags]
    public enum BansDto
    {
        None = 0,
        BannedLeaderboards = 1 << 0,
        BannedAlias = 1 << 1,
        BannedAvatar = 1 << 2,
        BannedBio = 1 << 3
    }
}