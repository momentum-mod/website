using System.ComponentModel.DataAnnotations;

namespace Momentum.Reports.Api.ViewModels
{
    public class UpdateReportViewModel
    {
        public bool Resolved { get; set; }
        [StringLength(1000)]
        public string ResolutionMessage { get; set; }
    }
}
