using System;

namespace Momentum.Users.Core.Models
{
    [Flags]
    public enum Roles
    {
        None = 0,
        Verified = 1 << 0,
        Mapper = 1 << 1,
        Moderator = 1 << 2,
        Admin = 1 << 3,
        Placeholder = 1 << 4
    }
}