using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Momentum.Users.Application.DTOs;

namespace Momentum.Framework.Application.Services
{
    public interface ICurrentUserService
    {
        Guid GetUserId();
        Task<UserDto> GetUser();
        List<Claim> GetClaims();
        string GetBearerToken();
        RolesDto GetRolesFromToken();
        bool HasRole(RolesDto role);
    }
}