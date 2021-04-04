using System;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Xml;
using Microsoft.AspNetCore.Http;
using Momentum.Users.Application.DTOs;
using SteamWebAPI2.Interfaces;
using SteamWebAPI2.Utilities;

namespace Momentum.Users.Api.Services
{
    public class SteamService
    {
        private readonly HttpClient _httpClient;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ISteamWebInterfaceFactory _steamWebInterfaceFactory;
        private string _steamId;

        private XmlDocument _profileXmlDocument;

        private const string SteamIdXPath = "/profile/steamID";
        private const string AvatarXPath = "/profile/avatarFull";
        private const string CountryXPath = "/profile/location";

        public SteamService(HttpClient httpClient, IHttpContextAccessor httpContextAccessor, ISteamWebInterfaceFactory steamWebInterfaceFactory)
        {
            _httpClient = httpClient;
            _httpContextAccessor = httpContextAccessor;
            _steamWebInterfaceFactory = steamWebInterfaceFactory;
        }

        public string GetSteamId()
        {
            if (_steamId != null)
            {
                return _steamId;
            }
            
            var steamProfileUrl = _httpContextAccessor.HttpContext?.User.Claims
                .Single(x => x.Type == ClaimTypes.NameIdentifier).Value ?? throw new Exception("Expected a HttpContext while getting steam ID");

            _steamId = steamProfileUrl.Replace("https://", "")
                .Replace("http://", "")
                .Substring("steamcommunity.com/openid/id/".Length);
            return _steamId;
        }

        private async Task<XmlDocument> GetProfileAsync(string steamId = null)
        {
            if (_profileXmlDocument != null)
            {
                return _profileXmlDocument;
            }
            
            steamId ??= GetSteamId();
            
            var profileXmlText = await _httpClient.GetStringAsync($"https://steamcommunity.com/profiles/{steamId}?xml=1");
            
            var profileXmlDoc = new XmlDocument();
            profileXmlDoc.LoadXml(profileXmlText);

            _profileXmlDocument = profileXmlDoc;
            return _profileXmlDocument;
        }

        public async Task EnsurePremiumAccountWithProfile(string steamId = null)
        {
            await EnsurePremiumAccount(steamId);
            await EnsureAccountHasProfile(steamId);
        }
        
        public async Task EnsurePremiumAccount(string steamId = null)
        {
            var profile = await GetProfileAsync(steamId);

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

        public async Task EnsureAccountHasProfile(string steamId = null)
        {
            var profile = await GetProfileAsync(steamId);

            if (profile.SelectSingleNode(SteamIdXPath) == null)
            {
                throw new Exception("You must have a username, please setup your steam profile");
            }

            if (profile.SelectSingleNode(AvatarXPath) == null)
            {
                throw new Exception("You must have an avatar, please setup your steam profile");
            }
            
            // Could check for a country here, but null is fine
        }

        public async Task<UserDto> BuildUserFromProfile(string steamId = null)
        {
            var profile = await GetProfileAsync(steamId);

            var user = new UserDto
            {
                Alias = profile.SelectSingleNode(SteamIdXPath).InnerText,
                Avatar = profile.SelectSingleNode(AvatarXPath).InnerText,
                Bans = BansDto.None,
                Roles = RolesDto.None,
                Country = profile.SelectSingleNode(CountryXPath)?.Value,
                AliasLocked = false,
                SteamId = steamId ?? GetSteamId()
            };

            var steamUserInterface = _steamWebInterfaceFactory.CreateSteamWebInterface<SteamUser>();
            var userSummary = await steamUserInterface.GetPlayerSummaryAsync(ulong.Parse(user.SteamId));
            user.Country = userSummary.Data.CountryCode;

            return user;
        }
    }
}