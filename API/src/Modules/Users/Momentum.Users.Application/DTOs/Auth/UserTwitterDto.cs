using System;

namespace Momentum.Users.Application.DTOs.Auth
{
    public class UserTwitterDto
    {
        public Guid UserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string DisplayName { get; set; }
    }
}