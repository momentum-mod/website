using System.Text.Json.Serialization;

namespace Momentum.Auth.Api.ViewModels
{
    public class GameAccessTokenViewModel
    {
        public GameAccessTokenViewModel(string accessToken)
        {
            AccessToken = accessToken;
            Length = AccessToken.Length;
        }
        
        [JsonPropertyName("token")]
        public string AccessToken { get;  }
        [JsonPropertyName("length")]
        public int Length { get;  }
    }
}