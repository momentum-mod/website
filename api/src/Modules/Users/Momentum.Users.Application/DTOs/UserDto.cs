using System;
using Momentum.Users.Core.Models;

namespace Momentum.Users.Application.DTOs
{
    public class UserDto
    {
        public Guid Id { get; set; }
        public string SteamId { get; set; }
        public string Alias { get; set; }
        public bool AliasLocked { get; set; }
        public string Avatar { get; set; }
        public string AvatarUrl { get; set; }
        public Roles Roles { get; set; }
        public Bans Bans { get; set; }
        public string Country { get; set; }
    }
}