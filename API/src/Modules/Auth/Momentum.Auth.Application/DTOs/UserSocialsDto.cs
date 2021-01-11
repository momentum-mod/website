namespace Momentum.Auth.Application.DTOs
{
    public class UserSocialsDto
    {
        public UserDiscordDto UserDiscord { get; set; }
        public UserTwitchDto UserTwitch { get; set; }
        public UserTwitterDto UserTwitter { get; set; }
    }
}