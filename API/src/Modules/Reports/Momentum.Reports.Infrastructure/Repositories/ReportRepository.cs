using Marten;
using Momentum.Framework.Infrastructure.Repositories;
using Momentum.Reports.Core.Models;
using Momentum.Reports.Core.Repositories;
using System;
using System.Threading.Tasks;

namespace Momentum.Reports.Infrastructure.Repositories
{
    public class ReportRepository : GenericTimeTrackedRepository<Report>, IReportRepository
    {
        private readonly IDocumentStore _store;

        public ReportRepository(IDocumentStore store) : base(store)
        {
            _store = store;
        }

        public async Task<int> GetTodayReportCount (Guid submitterId)
        {
            using var session = _store.QuerySession();

            var numOfReportsSubmittedToday = await session.Query<Report>().CountAsync(x => x.SubmitterId == submitterId && x.CreatedAt > DateTime.Today);

            return numOfReportsSubmittedToday;
        }
    }
}
