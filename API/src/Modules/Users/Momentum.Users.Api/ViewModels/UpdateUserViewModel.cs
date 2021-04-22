using System.Text.Json.Serialization;

namespace Momentum.Users.Api.ViewModels
{
    public class UpdateUserViewModel
    {
        [JsonPropertyName("alias")]
        public string Alias { get; set; }

        [JsonPropertyName("profile")]
        public UpdateUserProfileViewModel Profile { get; set; }

        public class UpdateUserProfileViewModel
        {
            [JsonPropertyName("bio")]
            public string Bio { get; set; }
        }
    }
}