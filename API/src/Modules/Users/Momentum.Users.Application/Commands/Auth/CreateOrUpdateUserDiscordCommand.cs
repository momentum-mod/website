using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Momentum.Users.Core.Repositories.Auth;
using Momentum.Users.Core.Services;

namespace Momentum.Users.Application.Commands.Auth
{
    public class CreateOrUpdateUserDiscordCommand : IRequest
    {
        public ulong DiscordId { get; set; }
        public string DisplayName { get; set; }
    }

    public class CreateOrUpdateUserDiscordCommandHandler : IRequestHandler<CreateOrUpdateUserDiscordCommand>
    {
        private readonly IMapper _mapper;
        private readonly IUserDiscordRepository _userDiscordRepository;
        private readonly ICurrentUserService _currentUserService;

        public CreateOrUpdateUserDiscordCommandHandler(IMapper mapper, IUserDiscordRepository userDiscordRepository, ICurrentUserService currentUserService)
        {
            _mapper = mapper;
            _userDiscordRepository = userDiscordRepository;
            _currentUserService = currentUserService;
        }

        public async Task<Unit> Handle(CreateOrUpdateUserDiscordCommand request, CancellationToken cancellationToken)
        {
            var userId = _currentUserService.GetUserId();

            var existingItem = await _userDiscordRepository.GetByUserId(userId);

            var userDiscord = _mapper.Map(request, existingItem);
            userDiscord.UserId = userId;

            if (existingItem == null)
            {
                await _userDiscordRepository.Add(userDiscord);
            }
            else
            {
                await _userDiscordRepository.Update(userDiscord);
            }

            return Unit.Value;
        }
    }
}