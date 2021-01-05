using System;

namespace Momentum.Users.Core.Models
{
    public class User
    {
        public Guid Id { get; set; }
        public string SteamId { get; set; }
        public string Alias { get; set; }
        public bool AliasLocked { get; set; }
        public string Avatar { get; set; }
        public string AvatarUrl => Bans.HasFlag(Bans.BannedAvatar) 
            ? "/assets/images/blank_avatar.jpg" 
            : $"https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/{Avatar}";

        public Roles Roles { get; set; }
        public Bans Bans { get; set; }
        public string Country { get; set; }
        
    }
}