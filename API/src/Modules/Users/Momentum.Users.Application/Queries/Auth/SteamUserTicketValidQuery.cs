using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Momentum.Framework.Core;
using SteamWebAPI2.Interfaces;
using SteamWebAPI2.Utilities;

namespace Momentum.Users.Application.Queries.Auth
{
    public class SteamUserTicketValidQuery : IRequest<bool>
    {
        /// <summary>
        /// Hex encoded string - if coming from the game, you need to convert from UTF-8
        /// </summary>
        public string Ticket { get; set; }
        public string UserId { get; set; }
    }
    
    public class SteamUserTicketValidQueryHandler : IRequestHandler<SteamUserTicketValidQuery, bool>
    {
        private readonly ISteamWebInterfaceFactory _steamWebInterfaceFactory;
        private readonly HttpClient _httpClient;

        public SteamUserTicketValidQueryHandler(ISteamWebInterfaceFactory steamWebInterfaceFactory, HttpClient httpClient)
        {
            _steamWebInterfaceFactory = steamWebInterfaceFactory;
            _httpClient = httpClient;
        }

        public async Task<bool> Handle(SteamUserTicketValidQuery request, CancellationToken cancellationToken)
        {
            var steamUserAuthInterface = _steamWebInterfaceFactory.CreateSteamWebInterface<SteamUserAuth>(_httpClient);
            var ticketValidResponse = await steamUserAuthInterface.AuthenticateUserTicket(Constants.MomentumModSteamId, request.Ticket);
            
            return ticketValidResponse.Data.Response.Success &&
                   ticketValidResponse.Data.Response.Params.Result == "OK" &&
                   request.UserId == ticketValidResponse.Data.Response.Params.SteamId;
        }
    }
}