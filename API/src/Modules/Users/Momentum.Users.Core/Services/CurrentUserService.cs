using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Net.Http.Headers;
using Momentum.Users.Core.Models;
using Momentum.Users.Core.Repositories;

namespace Momentum.Users.Core.Services
{
    /// <summary>
    ///     Scoped service for the current user
    /// </summary>
    public class CurrentUserService : ICurrentUserService
    {
        private readonly HttpContext _httpContext;
        private readonly IJwtService _jwtService;
        private readonly IUserRepository _userRepository;

        public CurrentUserService(IHttpContextAccessor httpContextAccessor, IJwtService jwtService, IUserRepository userRepository)
        {
            _httpContext = httpContextAccessor.HttpContext;
            _jwtService = jwtService;
            _userRepository = userRepository;
        }

        public Guid GetUserId()
        {
            var jti = GetClaims()
                .FirstOrDefault(x => x.Type == JwtRegisteredClaimNames.Jti);

            if (jti == null)
            {
                return Guid.Empty;
            }

            var userId = Guid.Parse(jti.Value);
            return userId;
        }

        public async Task<User> GetUser()
        {
            var userId = GetUserId();

            if (userId == Guid.Empty)
            {
                throw new Exception("No current user");
            }

            return await _userRepository.GetById(userId);
        }

        public List<Claim> GetClaims()
        {
            var accessToken = GetBearerToken();

            if (string.IsNullOrWhiteSpace(accessToken))
            {
                throw new Exception("No access token");
            }

            var claims = _jwtService.ExtractClaims(accessToken);

            if (!claims.Any())
            {
                throw new Exception("User has no claims");
            }

            return claims;
        }

        public Claim GetClaim(string claimType)
        {
            var claims = GetClaims();

            return claims.FirstOrDefault(x => x.Type == claimType);
        }

        public string GetBearerToken()
        {
            var authorizationHeader = _httpContext.Request.Headers[HeaderNames.Authorization]
                .ToString();
            var bearerToken = authorizationHeader.Replace("Bearer ", "");

            if (!string.IsNullOrWhiteSpace(bearerToken)) return bearerToken;

            // No authorization header, check if it is in a query parameter '?jwt=...'
            var jwtQuery = _httpContext.Request.Query.SingleOrDefault(x => x.Key == "jwt");

            // No null value for KVP<,>, check against `default`
            return jwtQuery.Equals(default) ? null : jwtQuery.Value.ToString();

        }

        public Roles GetRolesFromToken()
        {
            var claims = GetClaims();

            var rolesClaim = claims.FirstOrDefault(x => x.Type == "roles");

            if (rolesClaim == null)
            {
                throw new ArgumentNullException(nameof(rolesClaim), "Token has no roles claim");
            }

            if (Enum.TryParse<Roles>(rolesClaim.Value, out var roles))
            {
                return roles;
            }

            throw new Exception("Error parsing roles from token");
        }

        public bool HasRole(Roles role)
        {
            var userRoles = GetRolesFromToken();

            return (userRoles & role) == role;
        }
    }
}