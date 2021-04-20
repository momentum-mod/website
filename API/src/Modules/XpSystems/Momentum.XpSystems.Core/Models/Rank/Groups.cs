namespace Momentum.XpSystems.Core.Models.Rank
{
    public class Groups
    {
        public int MaxGroups { get; set; }
        public float[] GroupScaleFactors { get; set; }
        public float[] GroupExponents { get; set; }
        public int[] GroupMinimumSizes { get; set; }
        public float[] GroupPointPcts { get; set; }
    }
}