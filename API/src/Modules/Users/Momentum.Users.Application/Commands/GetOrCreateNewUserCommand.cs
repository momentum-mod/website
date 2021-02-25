using System;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Momentum.Users.Application.DTOs;
using Momentum.Users.Core.Models;
using Momentum.Users.Core.Repositories;
using Profile = Momentum.Users.Core.Models.Profile;

namespace Momentum.Users.Application.Commands
{
    public class GetOrCreateNewUserCommand : IRequest<UserDto>
    {
        public string SteamId { get; set; }
        public Func<Task<UserDto>> BuildUserDto { get; set; }
        public Func<Task> EnsureSteamUserPermittedToCreateProfile { get; set; }
    }
    
    public class GetOrCreateNewUserCommandHandler : IRequestHandler<GetOrCreateNewUserCommand, UserDto>
    {
        private readonly IMapper _mapper;
        private readonly IUserRepository _userRepository;
        private readonly IUserProfileRepository _userProfileRepository;
        private readonly IUserStatsRepository _userStatsRepository;

        public GetOrCreateNewUserCommandHandler(IMapper mapper, IUserRepository userRepository, IUserProfileRepository userProfileRepository, IUserStatsRepository userStatsRepository)
        {
            _mapper = mapper;
            _userRepository = userRepository;
            _userProfileRepository = userProfileRepository;
            _userStatsRepository = userStatsRepository;
        }

        public async Task<UserDto> Handle(GetOrCreateNewUserCommand request, CancellationToken cancellationToken)
        {
            var user = await _userRepository.GetBySteamId(request.SteamId);

            // Only check if the user has a premium account/setup a profile, when creating the user
            if (user == null)
            {
                if (request.EnsureSteamUserPermittedToCreateProfile == null)
                {
                    throw new Exception("Need a function to check if the steam user is allowed to create a momentum profile");
                }
                
                await request.EnsureSteamUserPermittedToCreateProfile.Invoke();
                
                user = _mapper.Map<User>(await request.BuildUserDto.Invoke());
                user.Id = new Guid();
                
                await _userRepository.Add(user);
                
                // Now setup additional documents related to a user
                await _userProfileRepository.Add(new Profile
                {
                    UserId = user.Id
                });

                await _userStatsRepository.Add(new Stats
                {
                    UserId = user.Id
                });
            }
            else
            {
                // Map the new user properties onto the existing object
                var updatedSteamUser = await request.BuildUserDto.Invoke();

                user.Alias = updatedSteamUser.Alias;
                user.Avatar = updatedSteamUser.Avatar;
                user.Country = updatedSteamUser.Country;
                
                user = await _userRepository.Update(user);
            }

            return _mapper.Map<UserDto>(user);
        }
    }
}