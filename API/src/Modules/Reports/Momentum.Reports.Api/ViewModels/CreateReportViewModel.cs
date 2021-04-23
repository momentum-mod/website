using System.ComponentModel.DataAnnotations;

namespace Momentum.Reports.Api.ViewModels
{
    public class CreateReportViewModel
    {
        public string Data { get; set; }
        public ushort Type { get; set; }
        public uint Category { get; set; }
        [StringLength(1000)]
        public string Message { get; set; }
    }
}
