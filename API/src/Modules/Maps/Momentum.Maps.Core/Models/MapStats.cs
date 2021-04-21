namespace Momentum.Maps.Core.Models
{
    public class MapStats
    {
        public BaseStats BaseStats { get; set; }
        public uint TotalReview { get; set; }
        public uint TotalDownloads { get; set; }
        public uint TotalSubscriptions { get; set; }
        public uint TotalPlays { get; set; }
        public uint TotalFavorites { get; set; }
        public uint TotalCompletions { get; set; }
        public uint TotalUniqueCompletions { get; set; }
        // TODO: Currently unused in the staging server
        public uint TotalTimePlayed { get; set; }
    }
}