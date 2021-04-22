using System;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Momentum.Users.Application.DTOs;
using Momentum.Users.Core.Repositories;

namespace Momentum.Users.Application.Queries
{
    public class GetUserStatsQuery : IRequest<StatsDto>
    {
        public Guid UserId { get; set; }
    }

    public class GetUserStatsQueryHandler : IRequestHandler<GetUserStatsQuery, StatsDto>
    {
        private readonly IUserStatsRepository _userStatsRepository;
        private readonly IMapper _mapper;

        public GetUserStatsQueryHandler(IUserStatsRepository userStatsRepository, IMapper mapper)
        {
            _userStatsRepository = userStatsRepository;
            _mapper = mapper;
        }

        public async Task<StatsDto> Handle(GetUserStatsQuery request, CancellationToken cancellationToken)
        {
            var stats = await _userStatsRepository.GetByUserId(request.UserId);

            return _mapper.Map<StatsDto>(stats);
        }
    }
}