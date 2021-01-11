using System;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Momentum.Auth.Application.DTOs;
using Momentum.Auth.Core.Repositories;

namespace Momentum.Auth.Application.Queries
{
    public class GetUserSocialsQuery : IRequest<UserSocialsDto>
    {
        public Guid UserId { get; set; }
    }

    public class GetUserSocialsQueryHandler : IRequestHandler<GetUserSocialsQuery, UserSocialsDto>
    {
        private readonly IMapper _mapper;
        private readonly IUserDiscordRepository _userDiscordRepository;
        private readonly IUserTwitchRepository _userTwitchRepository;
        private readonly IUserTwitterRepository _userTwitterRepository;

        public GetUserSocialsQueryHandler(IUserDiscordRepository userDiscordRepository, IUserTwitchRepository userTwitchRepository, IUserTwitterRepository userTwitterRepository, IMapper mapper)
        {
            _userDiscordRepository = userDiscordRepository;
            _userTwitchRepository = userTwitchRepository;
            _userTwitterRepository = userTwitterRepository;
            _mapper = mapper;
        }

        public async Task<UserSocialsDto> Handle(GetUserSocialsQuery request, CancellationToken cancellationToken)
        {
            var userDiscord = await _userDiscordRepository.GetByUserId(request.UserId);
            var userTwitch = await _userTwitchRepository.GetByUserId(request.UserId);
            var userTwitter = await _userTwitterRepository.GetByUserId(request.UserId);

            return new UserSocialsDto
            {
                UserDiscord = _mapper.Map<UserDiscordDto>(userDiscord),
                UserTwitch = _mapper.Map<UserTwitchDto>(userTwitch),
                UserTwitter = _mapper.Map<UserTwitterDto>(userTwitter)
            };
        }
    }
}