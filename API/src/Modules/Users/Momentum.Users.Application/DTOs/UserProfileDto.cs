using System;

namespace Momentum.Users.Application.DTOs
{
    public class UserProfileDto
    {
        public Guid UserId { get; set; }
        public string Bio { get; set; }
    }
}