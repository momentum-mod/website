namespace Momentum.XpSystems.Application.DTOs.Rank
{
    public class GroupsDto
    {
        public int MaxGroups { get; set; }
        public double[] GroupScaleFactors { get; set; }
        public double[] GroupExponents { get; set; }
        public int[] GroupMinimumSizes { get; set; }
        public double[] GroupPointPercentages { get; set; }
    }
}