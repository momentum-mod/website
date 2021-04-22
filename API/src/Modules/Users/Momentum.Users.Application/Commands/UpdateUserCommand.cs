using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Momentum.Users.Core.Models;
using Momentum.Users.Core.Repositories;
using Momentum.Users.Core.Services;
using SteamWebAPI2.Interfaces;
using SteamWebAPI2.Utilities;

namespace Momentum.Users.Application.Commands
{
    public class UpdateUserCommand : IRequest
    {
        public string Alias { get; set; }
        public string Bio { get; set; }
    }

    public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand>
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly IUserRepository _userRepository;
        private readonly IUserProfileRepository _userProfileRepository;
        private readonly ISteamWebInterfaceFactory _steamWebInterfaceFactory;

        public UpdateUserCommandHandler(ICurrentUserService currentUserService, IUserRepository userRepository, IUserProfileRepository userProfileRepository, ISteamWebInterfaceFactory steamWebInterfaceFactory)
        {
            _currentUserService = currentUserService;
            _userRepository = userRepository;
            _userProfileRepository = userProfileRepository;
            _steamWebInterfaceFactory = steamWebInterfaceFactory;
        }

        public async Task<Unit> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
        {
            var currentUser = await _currentUserService.GetUser();

            if (!currentUser.Bans.HasFlag(Bans.BannedAlias))
            {
                if (string.IsNullOrWhiteSpace(request.Alias))
                {
                    // Updating user with no requested alias, use the steam display name
                    var steamUserInterface = _steamWebInterfaceFactory.CreateSteamWebInterface<SteamUser>();
                    var steamUser = await steamUserInterface.GetPlayerSummaryAsync(ulong.Parse(currentUser.SteamId));

                    currentUser.Alias = steamUser.Data.Nickname;
                    currentUser.AliasLocked = false;
                }
                else
                {
                    if (!currentUser.Roles.HasFlag(Roles.Placeholder))
                    {
                        currentUser.AliasLocked = currentUser.Alias != request.Alias;
                    }

                    currentUser.Alias = request.Alias;
                }

                await _userRepository.Update(currentUser);
            }

            // You can clear your bio even if you have a bio ban
            if (string.IsNullOrWhiteSpace(request.Bio) || !currentUser.Bans.HasFlag(Bans.BannedBio))
            {
                var currentProfile = await _userProfileRepository.GetByUserId(currentUser.Id);

                currentProfile.Bio = request.Bio;

                await _userProfileRepository.Update(currentProfile);
            }

            return Unit.Value;
        }
    }
}