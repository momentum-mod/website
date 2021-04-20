using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Momentum.XpSystems.Application.DTOs.Cosmetic;
using Momentum.XpSystems.Application.DTOs.Rank;
using Momentum.XpSystems.Core.Models;
using Momentum.XpSystems.Core.Models.Cosmetic;
using Momentum.XpSystems.Core.Models.Rank;
using Momentum.XpSystems.Core.Repositories;

namespace Momentum.XpSystems.Application.Commands
{
    public class CreateOrUpdateXpSystemCommand : IRequest
    {
        public RankXpDto RankXp { get; set; }
        public CosmeticXpDto CosmeticXp { get; set; }
    }

    public class CreateOrUpdateXpSystemCommandHandler : IRequestHandler<CreateOrUpdateXpSystemCommand>
    {
        private readonly IXpSystemRepository _xpSystemRepository;
        private readonly IMapper _mapper;

        public CreateOrUpdateXpSystemCommandHandler(IXpSystemRepository xpSystemRepository, IMapper mapper)
        {
            _xpSystemRepository = xpSystemRepository;
            _mapper = mapper;
        }

        public async Task<Unit> Handle(CreateOrUpdateXpSystemCommand request, CancellationToken cancellationToken)
        {
            var xpSystem = await _xpSystemRepository.SingleOrDefault();

            xpSystem ??= new XpSystem();

            xpSystem.CosmeticXp = _mapper.Map<CosmeticXp>(request.CosmeticXp);
            xpSystem.RankXp = _mapper.Map<RankXp>(request.RankXp);

            await _xpSystemRepository.CreateOrUpdate(xpSystem);

            return Unit.Value;
        }
    }
}
