using System;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Momentum.Users.Application.DTOs;
using Momentum.Users.Application.Requests;
using Momentum.Users.Core.Models;
using Momentum.Users.Core.Repositories;

namespace Momentum.Users.Application.Commands
{
    public class GetOrCreateNewUserCommand : IRequest<UserDto>
    {
        public string SteamId { get; set; }
        public Func<Task<UserDto>> BuildUserDto { get; set; }
    }
    
    public class GetOrCreateNewUserCommandHandler : IRequestHandler<GetOrCreateNewUserCommand, UserDto>
    {
        private readonly IMediator _mediator;
        private readonly IMapper _mapper;
        private readonly IUserRepository _userRepository;

        public GetOrCreateNewUserCommandHandler(IMediator mediator, IMapper mapper, IUserRepository userRepository)
        {
            _mediator = mediator;
            _mapper = mapper;
            _userRepository = userRepository;
        }

        public async Task<UserDto> Handle(GetOrCreateNewUserCommand request, CancellationToken cancellationToken)
        {
            var user = await _userRepository.GetBySteamId(request.SteamId);

            if (user == null)
            {
                user = _mapper.Map<User>(await request.BuildUserDto.Invoke());
                await _userRepository.Add(user);
            }

            return _mapper.Map<UserDto>(user);
        }
    }
}