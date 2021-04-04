using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Momentum.Users.Core.Repositories.Auth;
using Momentum.Users.Core.Services;

namespace Momentum.Users.Application.Commands.Auth
{
    public class CreateOrUpdateUserTwitterCommand : IRequest
    {
        public string DisplayName { get; set; }
    }

    public class CreateOrUpdateUserTwitterCommandHandler : IRequestHandler<CreateOrUpdateUserTwitterCommand>
    {
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _currentUserService;
        private readonly IUserTwitterRepository _userTwitterRepository;

        public CreateOrUpdateUserTwitterCommandHandler(IMapper mapper, ICurrentUserService currentUserService, IUserTwitterRepository userTwitterRepository)
        {
            _mapper = mapper;
            _currentUserService = currentUserService;
            _userTwitterRepository = userTwitterRepository;
        }

        public async Task<Unit> Handle(CreateOrUpdateUserTwitterCommand request, CancellationToken cancellationToken)
        {
            var userId = _currentUserService.GetUserId();

            var existingItem = await _userTwitterRepository.GetByUserId(userId);

            var userTwitter = _mapper.Map(request, existingItem);
            userTwitter.UserId = userId;

            if (existingItem == null)
            {
                await _userTwitterRepository.Add(userTwitter);
            }
            else
            {
                await _userTwitterRepository.Update(userTwitter);
            }

            return Unit.Value;
        }
    }
}