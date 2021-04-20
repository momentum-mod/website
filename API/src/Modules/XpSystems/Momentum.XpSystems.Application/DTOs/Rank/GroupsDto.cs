namespace Momentum.XpSystems.Application.DTOs.Rank
{
    public class GroupsDto
    {
        public int MaxGroups { get; set; }
        public float[] GroupScaleFactors { get; set; }
        public float[] GroupExponents { get; set; }
        public int[] GroupMinimumSizes { get; set; }
        public float[] GroupPointPercentages { get; set; }
    }
}