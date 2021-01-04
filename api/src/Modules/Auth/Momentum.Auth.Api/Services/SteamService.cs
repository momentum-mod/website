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

        private readonly string _steamIdXPath = "/profile/steamID";
        private readonly string _avatarXPath = "/profile/avatarFull";
        private readonly string _countryXPath = "/profile/location";
        
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
            await EnsurePremiumAccount();
            await EnsureAccountHasProfile();
        }
        
        public async Task EnsurePremiumAccount()
        {
            var profile = await GetProfileAsync();

            var isLimitedAccountNode = profile.SelectSingleNode("/profile/isLimitedAccount") ?? throw new Exception("Error getting isLimitedAccount from profile");

            if (int.TryParse(isLimitedAccountNode.InnerText, out var isLimitedAccountInt))
            {
                if (isLimitedAccountInt == 0)
                {
                    // Is a premium account
                    return;
                }
                
                // Limited account
                throw new Exception("We do not authenticate limited Steam accounts. Buy something on Steam first!");
            }

            throw new Exception("Error parsing isLimitedAccount");
        }

        public async Task EnsureAccountHasProfile()
        {
            var profile = await GetProfileAsync();

            if (profile.SelectSingleNode(_steamIdXPath) == null)
            {
                throw new Exception("You must have a username, please setup your steam profile");
            }

            if (profile.SelectSingleNode(_avatarXPath) == null)
            {
                throw new Exception("You must have an avatar, please setup your steam profile");
            }
            
            // Could check for a country here, but null is fine
        }

        public async Task<UserDto> BuildUserFromProfile()
        {
            var profile = await GetProfileAsync();

            return new UserDto
            {
                Alias = profile.SelectSingleNode(_steamIdXPath).Value,
                Avatar = profile.SelectSingleNode(_avatarXPath).Value,
                Bans = BansDto.None,
                Roles = RolesDto.None,
                Country = profile.SelectSingleNode(_countryXPath)?.Value,
                AliasLocked = false,
                SteamId = GetSteamId()
            };
        }
    }
}