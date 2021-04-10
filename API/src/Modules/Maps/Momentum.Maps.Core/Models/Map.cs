using System;
using System.Collections.Generic;
using Momentum.Framework.Core.Models;

namespace Momentum.Maps.Core.Models
{
    public class Map : TimeTrackedModel
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public MapType Type { get; set; }
        public MapStatus Status { get; set; }
        public string DownloadUrl { get; set; }
        public string Hash { get; set; }
        public Guid ThumbnailId { get; set; }
        public List<Guid> ImageIds { get; set; }
    }
}