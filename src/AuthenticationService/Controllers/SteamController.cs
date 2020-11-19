using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using AuthenticationService.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AuthenticationService.Controllers
{
    [Route("auth/steam")]
    [ApiController]
    public class SteamController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly JwtService _jwtService;
        public SteamController(IHttpClientFactory httpClientFactory, JwtService jwtService)
        {
            _httpClientFactory = httpClientFactory;
        }

        [HttpGet]
        public async Task<IActionResult> SignIn()
        {
            if (User.Identity.IsAuthenticated)
            {
                return await HandleSignInAsync();
            }

            return Challenge("Steam");
        }
        public async Task<IActionResult> HandleSignInAsync()
        {
            // TODO: Remove this, it should use cookie settings from Startup.cs
            var cookieOptions = new CookieOptions
            {
                IsEssential = true,
                SameSite = SameSiteMode.None,
                Expires = DateTimeOffset.Now.AddHours(1),
                HttpOnly = false,
                MaxAge = TimeSpan.FromHours(2),
                Secure = true
            };

            var refreshToken = await _jwtService.GenerateRefreshTokenAsync(userId, gameRequest);
            var accessToken = _jwtService.GenerateAccessToken(userId, steamId, roles, bans, gameRequest);

            Response.Cookies.Append("accessToken", accessToken, cookieOptions);
            Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);

            if (!ulong.TryParse(Regex.Match(HttpContext.User.FindFirst(ClaimTypes.NameIdentifier).Value,
                @"^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$").Groups[1].Value, out var steamId))
            {
                return BadRequest("SteamID should be of type ulong");
            }


            //Response.Cookies.Append("user", JsonSerializer.Serialize(userResponse.Data), cookieOptions);

            return LocalRedirect("/dashboard");
        }

        [HttpGet("/signout"), HttpPost("/signout")]
        public IActionResult SignOut()
        {
            // Instruct the cookies middleware to delete the local cookie created
            // when the user agent is redirected from the external identity provider
            // after a successful authentication flow
            return SignOut(new AuthenticationProperties { RedirectUri = "/" },
                "Steam");
        }
    }
}
