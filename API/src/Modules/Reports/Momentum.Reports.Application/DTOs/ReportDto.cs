using Momentum.Users.Application.DTOs;
using System;

namespace Momentum.Reports.Application.DTOs
{
    public class ReportDto
    {
        public Guid Id { get; set; }
        public Guid SubmitterId { get; set; }
        public Guid? ResolverId { get; set; }
        public UserDto? Submitter { get; set; }
        public UserDto? Resolver { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string Data { get; set; }
        public ReportTypeDto Type { get; set; }
        public ReportCategoryDto Category { get; set; }
        public string Message { get; set; }
        public bool Resolved { get; set; }
        public string ResolutionMessage { get; set; }
    }
}
