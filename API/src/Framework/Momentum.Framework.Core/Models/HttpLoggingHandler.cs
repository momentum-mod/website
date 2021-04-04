using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Serilog;

namespace Momentum.Framework.Core.Models
{
    /// <summary>
    /// Used for debug purposes to see the raw HTTP requests/responses of a HttpClient
    /// </summary>
    public class HttpLoggingHandler : DelegatingHandler
    {
        private readonly ILogger _logger;

        public HttpLoggingHandler(HttpMessageHandler innerHandler, ILogger logger)
            : base(innerHandler)
        {
            _logger = logger;
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            _logger.Debug($"HttpRequest: {request}");

            if (request.Content != null)
            {
                _logger.Debug($"HttpRequestContent: {await request.Content.ReadAsStringAsync(cancellationToken)}");
            }

            var response = await base.SendAsync(request, cancellationToken);


            _logger.Debug($"HttpResponse: {response}");
            _logger.Debug($"HttpResponseContent: {await response.Content.ReadAsStringAsync(cancellationToken)}");

            return response;
        }
    }
}