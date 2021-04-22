﻿using System;

namespace Momentum.Reports.Application.DTOs
{
    public class ReportDto
    {
        public Guid Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string Data { get; set; }
        public ushort Type { get; set; }
        public uint Category { get; set; }
        public string Messgae { get; set; }
        public bool Resolved { get; set; }
        public string ResolutionMessage { get; set; }
    }
}
