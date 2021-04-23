using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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
