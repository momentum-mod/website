using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace AuthenticationService.Data.Models
{
    public class UserAuthentication
    {
        [Key]
        public uint UserId { get; set; }
        [MaxLength(255)]
        public string RefreshToken { get; set; }
        [Required]
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
