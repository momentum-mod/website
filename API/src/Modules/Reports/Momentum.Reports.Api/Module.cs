using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Momentum.Framework.Core.DependencyInjection;
using Momentum.Reports.Core.Repositories;
using Momentum.Reports.Infrastructure.Repositories;

namespace Momentum.Reports.Api
{
    public class Module : IModuleInitializer
    {
        public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
        {
            services.AddSingleton<IReportRepository, ReportRepository>();
        }
    }
}