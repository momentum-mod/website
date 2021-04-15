using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Momentum.XpSystems.Application.DTOs;
using Momentum.XpSystems.Core.Models;
using Momentum.XpSystems.Core.Repositories;

namespace Momentum.XpSystems.Application.Commands
{
    public class UpdateXpSystemCommand : IRequest
    {
        public dynamic RankXp { get; set; }
        public dynamic CosmeticXp { get; set; }
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
            var xpSystem = await _xpSystemRepository.Get();

            xpSystem.RankXP = request.RankXp;
            xpSystem.CosmeticXP = request.CosmeticXp;

            await _xpSystemRepository.Update(xpSystem);

            return Unit.Value;
        }
    }
}
