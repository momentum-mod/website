using System.ComponentModel.DataAnnotations;

namespace Momentum.Reports.Api.ViewModels
{
    public class CreateReportViewModel
    {
        public string Data { get; set; }
        /// <summary>
        /// USER_PROFILE_REPORT: 0, MAP_REPORT: 1, MAP_COMMENT_REPORT: 2,
        /// </summary>
        public ushort Type { get; set; }
        /// <summary>
        /// INAPPROPRIATE_CONTENT: 1, PLAGIARSIM: 2, SPAM: 3, OTHER: 0,
        /// </summary>
        public uint Category { get; set; }
        [StringLength(1000)]
        public string Message { get; set; }
    }
}
