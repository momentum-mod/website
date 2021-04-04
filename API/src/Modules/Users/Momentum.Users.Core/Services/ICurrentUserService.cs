using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Momentum.Users.Core.Models;

namespace Momentum.Users.Core.Services
{
    public interface ICurrentUserService
    {
        Guid GetUserId();
        Task<User> GetUser();
        List<Claim> GetClaims();
        Claim GetClaim(string claimType);
        string GetBearerToken();
        Roles GetRolesFromToken();
        bool HasRole(Roles role);
    }
}