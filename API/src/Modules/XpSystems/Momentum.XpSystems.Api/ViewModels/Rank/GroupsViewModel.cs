using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels.Rank
{
    public class GroupsViewModel
    {
        [JsonPropertyName("maxGroups")]
        public int MaxGroups { get; set; }
        [JsonPropertyName("groupScaleFactors")]
        public double[] GroupScaleFactors { get; set; }
        [JsonPropertyName("groupExponents")]
        public double[] GroupExponents { get; set; }
        [JsonPropertyName("groupMinimumSizes")]
        public int[] GroupMinimumSizes { get; set; }
        [JsonPropertyName("groupPointPcts")]
        public double[] GroupPointPercentages { get; set; }
    }
}