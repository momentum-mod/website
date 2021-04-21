namespace Momentum.XpSystems.Core.Models.Rank
{
    public class Groups
    {
        public int MaxGroups { get; set; }
        public decimal[] GroupScaleFactors { get; set; }
        public decimal[] GroupExponents { get; set; }
        public int[] GroupMinimumSizes { get; set; }
        public decimal[] GroupPointPercentages { get; set; }
    }
}