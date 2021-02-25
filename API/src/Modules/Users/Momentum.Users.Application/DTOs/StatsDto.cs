using System;

namespace Momentum.Users.Application.DTOs
{
    public class StatsDto
    {
        public Guid UserId { get; set; }
        public ulong TotalJumps { get; set; }
        public ulong TotalStrafes { get; set; }
        public ushort Level { get; set; } = 1;
        public ulong CosmeticXp { get; set; }
        public uint MapsCompleted { get; set; }
        public uint RunsSubmitted { get; set; }
    }
}