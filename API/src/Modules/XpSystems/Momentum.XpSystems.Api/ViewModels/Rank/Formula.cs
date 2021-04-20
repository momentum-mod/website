using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels
{
    /// <summary>
    /// Variables used in the rank point formula, as defined here: https://docs.google.com/document/d/1Zj8FKrfAMqYSnAHjySJqoqq0vmAEWxYXVcYLi3_u7NA/edit
    /// </summary>
    public class Formula
    {
        /// <summary>
        /// `A` is the scaling constant in the equation [ A / (rank + B) ]
        /// </summary>
        [JsonPropertyName("A")]
        public int A { get; set; }
        /// <summary>
        /// `B` is the smoothing constant in the equation [ A / (rank + B) ]
        /// </summary>
        [JsonPropertyName("B")]
        public int B { get; set; }
    }
}