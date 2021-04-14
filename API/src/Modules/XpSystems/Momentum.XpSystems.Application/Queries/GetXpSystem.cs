using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Momentum.XpSystems.Application.DTOs;
using Momentum.XpSystems.Core.Repositories;

namespace Momentum.XpSystems.Application.Queries
{
    public class GetXpSystemQuery : IRequest<XpSystemDTO> { }
    
    public class GetXpSystemHandlerHandler : IRequestHandler<GetXpSystemQuery, XpSystemDTO>
    {
        private readonly IMapper _mapper;
        private readonly IXpSystemRepository _xpSystemRepository;

        public async Task<XpSystemDTO> Handle(GetXpSystemQuery request, CancellationToken cancellationToken)
        {
            var xpSystem = await _xpSystemRepository.Get();

            return _mapper.Map<XpSystemDTO>(xpSystem);
        }
    }
}
