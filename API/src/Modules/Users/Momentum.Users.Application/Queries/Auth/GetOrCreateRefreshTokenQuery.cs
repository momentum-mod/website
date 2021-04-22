using System;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Momentum.Users.Core.Services;

namespace Momentum.Users.Application.Queries.Auth
{
    public class GetOrCreateRefreshTokenQuery : IRequest<string>
    {
        public Guid UserId { get; set; } = Guid.Empty;
    }

    public class GetOrCreateRefreshTokenQueryHandler : IRequestHandler<GetOrCreateRefreshTokenQuery, string>
    {
        private readonly IJwtService _jwtService;
        private readonly IMapper _mapper;
        private readonly IMediator _mediator;
        private readonly ICurrentUserService _currentUserService;

        public GetOrCreateRefreshTokenQueryHandler(IJwtService jwtService, IMapper mapper, IMediator mediator, ICurrentUserService currentUserService)
        {
            _jwtService = jwtService;
            _mapper = mapper;
            _mediator = mediator;
            _currentUserService = currentUserService;
        }

        public async Task<string> Handle(GetOrCreateRefreshTokenQuery request, CancellationToken cancellationToken)
        {
            var userId = request.UserId;

            if (userId == Guid.Empty)
            {
                userId = _currentUserService.GetUserId();
            }

            var userRefreshToken = await _jwtService.GetOrUpdateRefreshTokenAsync(userId);
            return userRefreshToken.RefreshToken;
        }
    }
}