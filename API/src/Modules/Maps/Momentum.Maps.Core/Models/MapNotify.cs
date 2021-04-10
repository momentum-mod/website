using System;
using Momentum.Framework.Core.Models;

namespace Momentum.Maps.Core.Models
{
    public class MapNotify : TimeTrackedModel
    {
        public Guid Id { get; set; }
        public Guid FolloweeUserId { get; set; }
        public Guid MapId { get; set; }
    }
}