using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Momentum.XpSystems.Core.Models;
using Momentum.XpSystems.Core.Repositories;
using Newtonsoft.Json.Linq;

namespace Momentum.XpSystems.Application.Commands
{
    public class UpdateXpSystemCommand : IRequest
    {
        public JObject RankXP { get; set; }
        public JObject CosmeticXp { get; set; }
    }

    public class UpdateXpSystemCommandHandler : IRequestHandler<UpdateXpSystemCommand>
    {
        private readonly IXpSystemRepository _xpSystemRepository;

        public UpdateXpSystemCommandHandler(IXpSystemRepository xpSystemRepository)
        {
            _xpSystemRepository = xpSystemRepository;
        }

        public async Task<Unit> Handle(UpdateXpSystemCommand request, CancellationToken cancellationToken)
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

            await _xpSystemRepository.Update(xpSystem);

            return Unit.Value;
        }
    }
}
