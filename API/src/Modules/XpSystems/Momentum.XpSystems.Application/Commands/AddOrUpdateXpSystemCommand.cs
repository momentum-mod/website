using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Momentum.XpSystems.Core.Repositories;

namespace Momentum.XpSystems.Application.Commands
{
    public class AddOrUpdateXpSystemCommand : IRequest { }

    public class AddOrUpdateXpSystemCommandHandler : IRequestHandler<AddOrUpdateXpSystemCommand>
    {
        private readonly IXpSystemRepository _xpSystemRepository;

        public AddOrUpdateXpSystemCommandHandler(IXpSystemRepository xpSystemRepository)
        {
            _xpSystemRepository = xpSystemRepository;
        }

        public async Task<Unit> Handle(AddOrUpdateXpSystemCommand request, CancellationToken cancellationToken)
        {
            // await _xpSystemRepository.AddOrUpdate();

            return Unit.Value;
        }
    }
}
