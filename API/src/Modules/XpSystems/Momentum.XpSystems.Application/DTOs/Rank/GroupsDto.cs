namespace Momentum.XpSystems.Application.DTOs.Rank
{
    public class GroupsDto
    {
        public int MaxGroups { get; set; }
        public decimal[] GroupScaleFactors { get; set; }
        public decimal[] GroupExponents { get; set; }
        public int[] GroupMinimumSizes { get; set; }
        public decimal[] GroupPointPercentages { get; set; }
    }
}