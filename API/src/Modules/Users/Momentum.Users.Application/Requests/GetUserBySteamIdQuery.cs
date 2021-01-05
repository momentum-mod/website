using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Momentum.Users.Application.DTOs;
using Momentum.Users.Core.Repositories;

namespace Momentum.Users.Application.Requests
{
    public class GetUserBySteamIdQuery : IRequest<UserDto>
    {
        public string Id { get; set; }
    }

    public class GetUserBySteamIdQueryHandler : IRequestHandler<GetUserBySteamIdQuery, UserDto>
    {
        private readonly IMapper _mapper;
        private readonly IUserRepository _userRepository;

        public GetUserBySteamIdQueryHandler(IUserRepository userRepository, IMapper mapper)
        {
            _userRepository = userRepository;
            _mapper = mapper;
        }

        public async Task<UserDto> Handle(GetUserBySteamIdQuery request, CancellationToken cancellationToken)
        {
            var user = await _userRepository.GetBySteamId(request.Id);

            return _mapper.Map<UserDto>(user);
        }
    }
}