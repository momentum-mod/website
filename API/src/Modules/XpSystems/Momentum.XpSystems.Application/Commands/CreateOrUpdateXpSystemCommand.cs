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
    public class CreateOrUpdateXpSystemCommand : IRequest
    {

        public dynamic RankXp { get; set; }
        public dynamic CosmeticXp { get; set; }
    }

    public class CreateOrUpdateXpSystemCommandHandler : IRequestHandler<CreateOrUpdateXpSystemCommand>
    {
        private readonly IMapper _mapper;
        private readonly IXpSystemRepository _xpSystemRepository;

        public CreateOrUpdateXpSystemCommandHandler(IMapper mapper, IXpSystemRepository xpSystemRepository)
        {
            _mapper = mapper;
            _xpSystemRepository = xpSystemRepository;
        }

        public async Task<Unit> Handle(CreateOrUpdateXpSystemCommand request, CancellationToken cancellationToken)
        {
            //var xpSystem = await _xpSystemRepository.Get();
            var xpSystem = new XpSystem
            {
                RankXP = request.RankXp,
                CosmeticXP = request.CosmeticXp
            };


            await _xpSystemRepository.CreateOrUpdate(xpSystem);

            return Unit.Value;
        }
    }
}
