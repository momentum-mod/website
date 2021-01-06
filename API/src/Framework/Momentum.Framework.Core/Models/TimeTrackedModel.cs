using System;

namespace Momentum.Framework.Core.Models
{
    public abstract class TimeTrackedModel
    {
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}