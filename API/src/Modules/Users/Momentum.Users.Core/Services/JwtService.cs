using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Momentum.Users.Core.Exceptions;
using Momentum.Users.Core.Models;
using Momentum.Users.Core.Models.Auth;
using Momentum.Users.Core.Repositories;
using Momentum.Users.Core.Repositories.Auth;

namespace Momentum.Users.Core.Services
{
 public class JwtService : IJwtService
    {
        private readonly IConfiguration _configuration;
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly IUserRepository _userRepository;
        
        public JwtService(IConfiguration configuration, IRefreshTokenRepository refreshTokenRepository, IUserRepository userRepository)
        {
            _configuration = configuration;
            _refreshTokenRepository = refreshTokenRepository;
            _userRepository = userRepository;
        }

        public async Task<UserRefreshToken> GetOrUpdateRefreshTokenAsync(Guid userId)
        {
            var existingRefreshToken = await _refreshTokenRepository.GetByUserId(userId);

            if (existingRefreshToken != null &&
                !string.IsNullOrEmpty(existingRefreshToken.RefreshToken) &&
                VerifyAccessToken(existingRefreshToken.RefreshToken))
            {
                return existingRefreshToken;
            }

            return await CreateOrUpdateRefreshTokenAsync(userId);
        }

        public async Task<UserRefreshToken> CreateOrUpdateRefreshTokenAsync(Guid userId)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha512);

            var token = new JwtSecurityToken(_configuration["Jwt:Issuer"], claims: new[]
                {
                    new Claim(JwtRegisteredClaimNames.Jti, userId.ToString()),
                    new Claim("refreshToken", "true")
                }, signingCredentials: credentials, audience: _configuration["Jwt:Issuer"],
                expires: DateTime.UtcNow.AddDays(int.Parse(_configuration["Jwt:RefreshExpireTime"])));

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

            var userRefreshToken = new UserRefreshToken
            {
                UserId = userId,
                RefreshToken = tokenString
            };

            var existingToken = await _refreshTokenRepository.GetByUserId(userId);

            if (existingToken == null)
            {
                await _refreshTokenRepository.Add(userRefreshToken);
            }
            else
            {
                await _refreshTokenRepository.Update(userRefreshToken);
            }

            return userRefreshToken;
        }

        public async Task<UserAccessToken> RefreshAccessTokenAsync(UserRefreshToken userRefreshToken, bool fromInGame)
        {
            var currentRefreshToken = await _refreshTokenRepository.GetByUserId(userRefreshToken.UserId);

            if (currentRefreshToken.RefreshToken != userRefreshToken.RefreshToken)
            {
                throw new InvalidCredentialsException();
            }

            return new UserAccessToken
            {
                AccessToken = await CreateAccessToken(userRefreshToken.UserId, fromInGame),
                UserId = userRefreshToken.UserId
            };
        }

        public bool VerifyAccessToken(string accessToken)
        {
            var tokenHandler = new JwtSecurityTokenHandler();

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = _configuration["Jwt:Issuer"],
                ValidAudience = _configuration["Jwt:Issuer"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]))
            };

            SecurityToken validatedToken;

            try
            {
                tokenHandler.ValidateToken(accessToken, validationParameters, out validatedToken);
            }
            catch
            {
                return false;
            }

            return validatedToken != null;
        }

        public List<Claim> ExtractClaims(string accessToken)
        {
            if (!VerifyAccessToken(accessToken))
            {
                throw new ArgumentException("Invalid access token", nameof(accessToken));
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.ReadJwtToken(accessToken);

            if (token == null)
            {
                throw new Exception("Error extracting token from string");
            }

            return token.Claims.ToList();
        }

        public async Task RevokeRefreshTokenAsync(Guid userId)
        {
            var currentRefreshToken = await _refreshTokenRepository.GetByUserId(userId);

            if (string.IsNullOrEmpty(currentRefreshToken.RefreshToken))
            {
                return;
            }

            await _refreshTokenRepository.Update(new UserRefreshToken
            {
                UserId = userId,
                RefreshToken = string.Empty
            });
        }

        private async Task<string> CreateAccessToken(Guid userId, bool fromInGame)
        {
            var user = await _userRepository.GetById(userId);

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha512);
            var claims = new List<Claim>
            {
                new("refreshToken", "false")
            };
            claims.AddRange(GetUserClaims(user));


            var token = new JwtSecurityToken(_configuration["Jwt:Issuer"], claims: claims,
                signingCredentials: credentials, audience: _configuration["Jwt:Issuer"],
                expires: DateTime.Now.AddMinutes(int.Parse(fromInGame ? _configuration["Jwt:InGameExpireTime"] : _configuration["Jwt:ExpireTime"])));

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private IEnumerable<Claim> GetUserClaims(User user) =>
            new[]
            {
                // For API auth
                new Claim(JwtRegisteredClaimNames.Jti, user.Id.ToString()),
                // For game auth
                new Claim("id", user.Id.ToString()),
                new Claim("steamID", user.SteamId),
                new Claim("roles", user.Roles.ToString()),
                new Claim("bans", user.Bans.ToString()),
            };
    }
}