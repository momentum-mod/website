using Marten;
using Momentum.Framework.Infrastructure.Repositories;
using Momentum.Reports.Core.Models;
using Momentum.Reports.Core.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
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

        public async Task<IReadOnlyList<Report>> GetAllReport() // When you pass the queryParams here, provide some defaults
        {
            using var session = _store.QuerySession();

            var reports = await session.Query<Report>()
                .Skip(10) // Offset
                .Take(20) // Limit
                .ToListAsync();

            return reports;
        }
    }
}
