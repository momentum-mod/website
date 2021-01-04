using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Momentum.Users.Application.DTOs;
using Momentum.Users.Core.Models;

namespace Momentum.Framework.Core.Services
{
    public interface ICurrentUserService
    {
        Guid GetUserId();
        Task<UserDto> GetUser();
        List<Claim> GetClaims();
        string GetBearerToken();
        Roles GetRolesFromToken();
        bool HasRole(Roles role);
    }
}