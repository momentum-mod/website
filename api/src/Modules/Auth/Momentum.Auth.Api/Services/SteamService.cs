using System;
using System.Threading.Tasks;
using Momentum.Framework.Core.Services;

namespace Momentum.Auth.Api.Services
{
    public class SteamService
    {
        private readonly ICurrentUserService _currentUserService;
        
        public SteamService(ICurrentUserService currentUserService)
        {
            _currentUserService = currentUserService;
        }

        public async Task EnsurePremiumAccountWithProfile()
        {
            await EnsurePremiumAccount();
            await EnsureAccountHasProfile();
        }
        
        public async Task EnsurePremiumAccount()
        {
            throw new NotImplementedException();
        }

        public async Task EnsureAccountHasProfile()
        {
            throw new NotImplementedException();
        }
    }
}