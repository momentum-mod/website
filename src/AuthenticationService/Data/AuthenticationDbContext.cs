using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AuthenticationService.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthenticationService.Data
{
    public class AuthenticationDbContext : DbContext
    {
        public DbSet<UserAuthentication> UserAuthentications { get; set; }
        public AuthenticationDbContext(DbContextOptions<AuthenticationDbContext> options) : base(options) { }
    }
}
