using System;

namespace Momentum.Users.Application.DTOs
{
    public class UserProfileDto
    {
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public Guid UserId { get; set; }
        public string Bio { get; set; }
    }
}