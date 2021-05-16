using Momentum.Framework.Core.Repositories;
using Momentum.Reports.Core.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Momentum.Reports.Core.Repositories
{
    public interface IReportRepository : IGenericRepository<Report>
    {
        Task<int> GetTodayReportCount(Guid submitterId);
        Task<int> CountAllReports(bool resolved);
        Task<IReadOnlyList<Report>> GetAllReports(uint offset, bool resolved, int limit = 5);
        Task<Report> GetById(Guid id);
    }
}
