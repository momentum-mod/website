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

        public async Task<int> GetTodayReportCount(Guid submitterId)
        {
            using var session = _store.QuerySession();

            var numOfReportsSubmittedToday = await session.Query<Report>().CountAsync(x => x.SubmitterId == submitterId && x.CreatedAt > DateTime.Today);

            return numOfReportsSubmittedToday;
        }

        public async Task<int> CountAllReports(bool resolved)
        {
            using var session = _store.QuerySession();

            var numberOfReports = await session.Query<Report>().CountAsync(x => x.Resolved == resolved);

            return numberOfReports;
        }

        public async Task<IReadOnlyList<Report>> GetAllReports(int? limit, uint offset, bool resolved)
        {
            using var session = _store.QuerySession();

            var reports = await session.Query<Report>()
                .Where(x => x.Resolved == resolved)
                .Skip((int)offset)
                .Take(limit ?? 5)
                .ToListAsync();

            return reports;
        }

        public async Task<Report> GetById(Guid id) => await GetSingleOrDefaultAsync(x => x.Id == id);
    }
}
