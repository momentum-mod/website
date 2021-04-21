using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels.Cosmetic
{
    public class LevelsViewModel
    {
        [JsonPropertyName("maxLevels")]
        public int MaxLevels { get; set; }
        [JsonPropertyName("startingValue")]
        public int StartingValue { get; set; }
        [JsonPropertyName("linearScaleBaseIncrease")]
        public int LinearScaleBaseIncrease { get; set; }
        [JsonPropertyName("linearScaleInterval")]
        public int LinearScaleInterval { get; set; }
        [JsonPropertyName("linearScaleIntervalMultiplier")]
        public double LinearScaleIntervalMultiplier { get; set; }
        [JsonPropertyName("staticScaleStart")]
        public int StaticScaleStart { get; set; }
        [JsonPropertyName("staticScaleBaseMultiplier")]
        public double StaticScaleBaseMultiplier { get; set; }
        [JsonPropertyName("staticScaleInterval")]
        public int StaticScaleInterval { get; set; }
        [JsonPropertyName("staticScaleIntervalMultiplier")]
        public double StaticScaleIntervalMultiplier { get; set; }
    }
}