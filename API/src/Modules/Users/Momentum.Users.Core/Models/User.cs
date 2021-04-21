using System;
using System.Collections.Generic;
using Momentum.Framework.Core.Models;

namespace Momentum.Users.Core.Models
{
    public class User : TimeTrackedModel
    {
        public Guid Id { get; set; }
        public string SteamId { get; set; }
        public string Alias { get; set; }
        public bool AliasLocked { get; set; }
        public string Avatar { get; set; }

        public Roles Roles { get; set; }
        public Bans Bans { get; set; }
        public string Country { get; set; }
        public List<Guid> FavoriteMapIds { get; set; }
        public List<Guid> LibraryMapIds { get; set; }
        public List<Guid> FollowedMapIds { get; set; }
    }
}