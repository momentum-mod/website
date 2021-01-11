using System;
using System.Text.Json.Serialization;
using AutoMapper;
using Momentum.Auth.Application.DTOs;
using Momentum.Users.Application.DTOs;

namespace Momentum.Auth.Api.ViewModels
{
    public class UserViewModel
    {
        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }
        [JsonPropertyName("updatedAt")]
        public DateTime? UpdatedAt { get; set; }
        
        [JsonPropertyName("id")]
        public Guid Id { get; set; }

        [JsonPropertyName("alias")]
        public string Alias { get; set; }
        [JsonPropertyName("aliasLocked")]
        public bool AliasLocked { get; set; }
        [JsonPropertyName("avatarURL")]
        public string AvatarUrl { get; set; }
        [JsonPropertyName("bans")]
        public BansDto Bans { get; set; }
        [JsonPropertyName("country")]
        public string Country { get; set; }
        [JsonPropertyName("roles")]
        public RolesDto Roles { get; set; }
        [JsonPropertyName("steamID")]
        public string SteamId { get; set; }

        [JsonPropertyName("profile")]
        public UserProfileViewModel Profile { get; set; }
    }
}