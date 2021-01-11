using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Momentum.Auth.Application.DTOs;
using Momentum.Auth.Core.Models;
using Momentum.Auth.Core.Repositories;
using Momentum.Framework.Application.Services;

namespace Momentum.Auth.Application.Commands
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