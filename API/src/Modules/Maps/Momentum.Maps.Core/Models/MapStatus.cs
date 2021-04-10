namespace Momentum.Maps.Core.Models
{
    public enum MapStatus
    {
        Approved = 0,
        Pending = 1,
        NeedsRevision = 2,
        PrivateTesting = 3,
        PublicTesting  = 4,
        ReadyForRelease = 5,
        Rejected = 6,
        Removed = 7
    }
}