using System;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Momentum.Users.Application.DTOs;
using Momentum.Users.Core.Repositories;

namespace Momentum.Users.Application.Requests
{
    public class GetUserByIdQuery : IRequest<UserDto>
    {
        public Guid Id { get; set; }
    }

    public class GetUserByIdQueryHandler : IRequestHandler<GetUserByIdQuery, UserDto>
    {
        private readonly IMapper _mapper;
        private readonly IUserRepository _userRepository;

        public GetUserByIdQueryHandler(IUserRepository userRepository, IMapper mapper)
        {
            _userRepository = userRepository;
            _mapper = mapper;
        }

        public async Task<UserDto> Handle(GetUserByIdQuery request, CancellationToken cancellationToken)
        {
            var user = await _userRepository.GetById(request.Id);

            return _mapper.Map<UserDto>(user);
        }
    }
}