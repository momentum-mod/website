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
    public class GetXpSystemQuery : IRequest<XpSystemDto> { }
    
    public class GetXpSystemQueryHandlerHandler : IRequestHandler<GetXpSystemQuery, XpSystemDto>
    {
        private readonly IMapper _mapper;
        private readonly IXpSystemRepository _xpSystemRepository;

        public GetXpSystemQueryHandlerHandler(IMapper mapper, IXpSystemRepository xpSystemRepository)
        {
            _mapper = mapper;
            _xpSystemRepository = xpSystemRepository;
        }
        public async Task<XpSystemDto> Handle(GetXpSystemQuery request, CancellationToken cancellationToken)
        {
            var xpSystem = await _xpSystemRepository.Get();

            return _mapper.Map<XpSystemDto>(xpSystem);
        }
    }
}
