using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Momentum.Auth.Core.Exceptions;
using Momentum.Auth.Core.Models;
using Momentum.Auth.Core.Repositories;
using Momentum.Users.Application.DTOs;
using Momentum.Users.Application.Requests;

namespace Momentum.Auth.Core.Services
{
 public class JwtService : IJwtService
    {
        private readonly IConfiguration _configuration;
        private readonly IJwtRepository _jwtRepository;
        private readonly IMediator _mediator;
        
        public JwtService(IConfiguration configuration, IJwtRepository jwtRepository, IMediator mediator)
        {
            _configuration = configuration;
            _jwtRepository = jwtRepository;
            _mediator = mediator;
        }

        public async Task<UserRefreshToken> GetOrUpdateRefreshTokenAsync(Guid userId)
        {
            var existingRefreshToken = await _jwtRepository.GetRefreshTokenByUserId(userId);

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

            var existingToken = await _jwtRepository.GetRefreshTokenByUserId(userId);

            if (existingToken == null)
            {
                await _jwtRepository.AddRefreshToken(userRefreshToken);
            }
            else
            {
                await _jwtRepository.UpdateRefreshToken(userRefreshToken);
            }

            return userRefreshToken;
        }

        public async Task<UserAccessToken> RefreshAccessTokenAsync(UserRefreshToken userRefreshToken, bool fromInGame)
        {
            var currentRefreshToken = await _jwtRepository.GetRefreshTokenByUserId(userRefreshToken.UserId);

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
            var currentRefreshToken = await _jwtRepository.GetRefreshTokenByUserId(userId);

            if (string.IsNullOrEmpty(currentRefreshToken.RefreshToken))
            {
                return;
            }

            await _jwtRepository.UpdateRefreshToken(new UserRefreshToken
            {
                UserId = userId,
                RefreshToken = string.Empty
            });
        }

        private async Task<string> CreateAccessToken(Guid userId, bool fromInGame)
        {
            var user = await _mediator.Send(new GetUserByIdQuery
            {
                Id = userId
            });

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

        private IEnumerable<Claim> GetUserClaims(UserDto user) =>
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