using System;

namespace Momentum.Users.Application.DTOs
{
    public class UserDto
    {
        public Guid Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string SteamId { get; set; }
        public string Alias { get; set; }
        public bool AliasLocked { get; set; }
        public string Avatar { get; set; }
        public string AvatarUrl => Bans.HasFlag(BansDto.BannedAvatar) 
            ? "/assets/images/blank_avatar.jpg" 
            : $"https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/{Avatar}";
        public RolesDto Roles { get; set; }
        public BansDto Bans { get; set; }
        public string Country { get; set; }
    }
}