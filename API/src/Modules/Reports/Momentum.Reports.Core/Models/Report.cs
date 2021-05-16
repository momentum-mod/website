using Momentum.Framework.Core.Models;
using System;

namespace Momentum.Reports.Core.Models
{
    public class Report : TimeTrackedModel
    {
        public Guid Id { get; set; }
        public Guid SubmitterId { get; set; }
        public Guid? ResolverId { get; set; }
        public string Data { get; set; }
        public ReportType Type { get; set; }
        public ReportCategory Category { get; set; }
        public string Message { get; set; }
        public bool Resolved { get; set; } = false;
        public string ResolutionMessage { get; set; }
    }
}
