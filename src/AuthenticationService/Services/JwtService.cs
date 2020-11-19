using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using AuthenticationService.Data;
using AuthenticationService.Data.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace AuthenticationService.Services
{
    public class JwtService
    {
        private readonly IConfiguration _configuration;
        private readonly AuthenticationDbContext _authenticationDbContext;
        public JwtService(IConfiguration configuration, AuthenticationDbContext authenticationDbContext)
        {
            _configuration = configuration;
            _authenticationDbContext = authenticationDbContext;
        }

        /// <summary>
        /// Generates a refresh token for a user, then either adds a new entry to the DB, or updates the existing one.
        /// </summary>
        /// <param name="userId">Momentum Mod user ID</param>
        /// <param name="gameRequest">If the request comes from the game then `true` otherwise `false`</param>
        /// <returns>The encoded refresh token</returns>
        public async Task<string> GenerateRefreshTokenAsync(uint userId, bool gameRequest)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JWT_KEY"]));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(_configuration["JWT_ISSUER"],
                claims: new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString())
                },
                signingCredentials: credentials);
            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

            _authenticationDbContext.UserAuthentications.Update(new UserAuthentication
            {
                UserId = userId,
                CreatedAt = token.IssuedAt,
                RefreshToken = tokenString
            });

            await _authenticationDbContext.SaveChangesAsync();

            return tokenString;
        }
        public string GenerateAccessToken(uint userId, ulong steamId, int roles, int bans, bool gameRequest)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JWT_KEY"]));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(_configuration["JWT_ISSUER"],
                claims: new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                    new Claim("steamID", steamId.ToString()),
                    new Claim("roles", roles.ToString()),
                    new Claim("bans", bans.ToString()),
                    new Claim("gameAuth", gameRequest.ToString()), 
                },
                signingCredentials: credentials,
                expires: new DateTime(0, 0, 0, 0, gameRequest ? _configuration.GetValue<int>("JWT_EXPIRE_TIME")
                    : _configuration.GetValue<int>("JWT_GAME_EXPIRE_TIME"), 0));

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public async Task<string> RefreshAccessTokenAsync(uint userId, string refreshToken, ulong steamId, int roles, int bans, bool gameRequest)
        {
            var userAuthentication = await _authenticationDbContext.UserAuthentications.FindAsync(userId);

            if (userAuthentication == null)
            {
                return null;
            }

            if (userAuthentication.RefreshToken != refreshToken)
            {
                return null;
            }

            return GenerateAccessToken(userId, steamId, roles, bans, gameRequest);
        }

        public bool VerifyAccessToken(string accessToken)
        {
            var tokenHandler = new JwtSecurityTokenHandler();

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JWT_KEY"]))
            };

            SecurityToken validatedToken;

            try
            {
                tokenHandler.ValidateToken(accessToken, validationParameters, out validatedToken);
            }
            catch (Exception)
            {
                return false;
            }

            return validatedToken != null;
        }

        public async Task RevokeRefreshTokenAsync(uint userId)
        {
            var userAuthentication = await _authenticationDbContext.UserAuthentications.FindAsync(userId);

            if (userAuthentication == null)
            {
                return;
            }

            userAuthentication.RefreshToken = string.Empty;

            await _authenticationDbContext.SaveChangesAsync();
        }
    }
}
