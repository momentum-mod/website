using System;

namespace Momentum.Maps.Core.Models
{
    [Flags]
    public enum RunFlags
    {
        Backwards = 1 << 0,
        LowGravity = 1 << 1,
        WKeyOnly = 1 << 2,
    }
}