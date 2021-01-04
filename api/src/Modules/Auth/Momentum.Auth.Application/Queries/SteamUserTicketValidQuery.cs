using System.Data.Common;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Momentum.Framework.Core;
using Newtonsoft.Json;
using SteamWebAPI2.Interfaces;
using SteamWebAPI2.Utilities;

namespace Momentum.Auth.Application.Queries
{
    public class SteamUserTicketValidQuery : IRequest<bool>
    {
        public string Ticket { get; set; }
        public string UserId { get; set; }
    }
    
    public class SteamUserTicketValidQueryHandler : IRequestHandler<SteamUserTicketValidQuery, bool>
    {
        private readonly SteamWebInterfaceFactory _steamWebInterfaceFactory;
        private readonly HttpClient _httpClient;

        public SteamUserTicketValidQueryHandler(SteamWebInterfaceFactory steamWebInterfaceFactory, HttpClient httpClient)
        {
            _steamWebInterfaceFactory = steamWebInterfaceFactory;
            _httpClient = httpClient;
        }

        public async Task<bool> Handle(SteamUserTicketValidQuery request, CancellationToken cancellationToken)
        {
            var steamUserAuthInterface = _steamWebInterfaceFactory.CreateSteamWebInterface<SteamUserAuth>(_httpClient);
            var ticketValidResponse = await steamUserAuthInterface.AuthenticateUserTicket(Constants.MomentumModSteamId, request.Ticket);
            
            // TODO: Submit a PR making this an object and not resorting to dynamic objects
            return (string)ticketValidResponse.Data.response.@params.result == "OK" && 
                   request.UserId == (string)ticketValidResponse.Data.response.@params.steamid;
        }
    }
}