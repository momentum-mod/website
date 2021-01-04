using System;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Xml;
using Microsoft.AspNetCore.Http;
using Momentum.Users.Application.DTOs;

namespace Momentum.Auth.Api.Services
{
    public class SteamService
    {
        private readonly HttpClient _httpClient;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private string _steamId;

        private XmlDocument _profileXmlDocument;

        public SteamService(HttpClient httpClient, IHttpContextAccessor httpContextAccessor)
        {
            _httpClient = httpClient;
            _httpContextAccessor = httpContextAccessor;
        }

        public string GetSteamId()
        {
            if (_steamId != null)
            {
                return _steamId;
            }
            
            var steamProfileUrl = _httpContextAccessor.HttpContext?.User.Claims
                .Single(x => x.Type == ClaimTypes.NameIdentifier).Value ?? throw new Exception("Expected a HttpContext while getting steam ID");;

            _steamId = steamProfileUrl.Replace("https://", "")
                .Replace("http://", "")
                .Substring("steamcommunity.com/openid/id/".Length);
            return _steamId;
        }

        private async Task<XmlDocument> GetProfileAsync()
        {
            if (_profileXmlDocument != null)
            {
                return _profileXmlDocument;
            }
            
            var steamId = GetSteamId();
            
            var profileXmlText = await _httpClient.GetStringAsync($"https://steamcommunity.com/profiles/{steamId}?xml=1");
            
            var profileXmlDoc = new XmlDocument();
            profileXmlDoc.LoadXml(profileXmlText);

            _profileXmlDocument = profileXmlDoc;
            return _profileXmlDocument;
        }

        public async Task EnsurePremiumAccountWithProfile()
        {
            var profile = await GetProfileAsync();
            
            await EnsurePremiumAccount();
            await EnsureAccountHasProfile();
        }
        
        public async Task EnsurePremiumAccount()
        {
            var profile = await GetProfileAsync();

            var isLimitedAccountNode = profile.DocumentElement?.GetAttributeNode("isLimitedAccount") ?? throw new Exception("Error parsing Steam XML profile");

            if (bool.TryParse(isLimitedAccountNode.Value, out var isLimitedAccount))
            {
                if (!isLimitedAccount)
                {
                    // Is a premium account
                    return;
                }
                
                // Limited account
                throw new Exception("We do not authenticate limited Steam accounts. Buy something on Steam first!");
            }

            throw new Exception("Error parsing " + nameof(isLimitedAccount));
        }

        public async Task EnsureAccountHasProfile()
        {
            var profile = await GetProfileAsync();

            throw new NotImplementedException();
        }

        public async Task<UserDto> BuildUserFromProfile()
        {
            var profile = await GetProfileAsync();

            return new UserDto
            {
                Alias = profile.DocumentElement.GetAttributeNode("steamID").Value,
                Avatar = profile.DocumentElement.GetAttributeNode("avatarFull").Value,
                Bans = BansDto.None,
                Roles = RolesDto.None,
                Country = profile.DocumentElement.GetAttributeNode("location").Value,
                AliasLocked = false,
                SteamId = GetSteamId()
            };
        }
    }
}