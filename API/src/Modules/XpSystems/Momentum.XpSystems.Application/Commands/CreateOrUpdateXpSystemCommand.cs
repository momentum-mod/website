using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Momentum.XpSystems.Core.Models;
using Momentum.XpSystems.Core.Repositories;

namespace Momentum.XpSystems.Application.Commands
{
    public class CreateOrUpdateXpSystemCommand : IRequest
    {
        public RankXP RankXP { get; set; }
        public CosXP CosmeticXp { get; set; }
    }

    public class CreateOrUpdateXpSystemCommandHandler : IRequestHandler<CreateOrUpdateXpSystemCommand>
    {
        private readonly IXpSystemRepository _xpSystemRepository;

        public CreateOrUpdateXpSystemCommandHandler(IXpSystemRepository xpSystemRepository)
        {
            _xpSystemRepository = xpSystemRepository;
        }

        public async Task<Unit> Handle(CreateOrUpdateXpSystemCommand request, CancellationToken cancellationToken)
        {
            var xpSystem = new XpSystem();

            try
            {
                xpSystem = await _xpSystemRepository.Get();
            }
            catch (Exception e)
            {
                Console.WriteLine("XpSystem not initialized: " + e.Message);
            }

            xpSystem.RankXP = request.RankXP;
            xpSystem.CosmeticXP = request.CosmeticXp;

            await _xpSystemRepository.CreateOrUpdate(xpSystem);

            return Unit.Value;
        }
    }
}
