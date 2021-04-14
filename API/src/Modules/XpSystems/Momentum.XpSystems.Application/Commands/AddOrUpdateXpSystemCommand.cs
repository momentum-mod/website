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
    public class AddOrUpdateXpSystemCommand : IRequest
    {
        public Func<Task<XpSystemDto>> BuildXpSystemDto { get; set; }
    }

    public class AddOrUpdateXpSystemCommandHandler : IRequestHandler<AddOrUpdateXpSystemCommand>
    {
        private readonly IMapper _mapper;
        private readonly IXpSystemRepository _xpSystemRepository;

        public AddOrUpdateXpSystemCommandHandler(IMapper mapper, IXpSystemRepository xpSystemRepository)
        {
            _mapper = mapper;
            _xpSystemRepository = xpSystemRepository;
        }

        public async Task<Unit> Handle(AddOrUpdateXpSystemCommand request, CancellationToken cancellationToken)
        {
            var xpSystem = _mapper.Map<XpSystem>(await request.BuildXpSystemDto.Invoke());

            await _xpSystemRepository.AddOrUpdate(xpSystem);

            return Unit.Value;
        }
    }
}
