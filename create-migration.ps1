# Same as create-migration.sh but for powershell

Get-Content .env | ForEach-Object {
  $name, $value = $_.split('=')
  if ([string]::IsNullOrWhiteSpace($name) -or $name.Contains('#')) {
    return
  }
  Set-Content env:\$name $value
}

$migration = $args[0]

npx prisma migrate dev --name "$migration" --skip-seed --schema ./libs/db/src/schema.prisma