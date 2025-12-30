# Same as create-migration.sh but for powershell

Get-Content .env | ForEach-Object {
  $vals = $_.split('=')
  $name = $vals[0]
  $value = $vals[1..($vals.Count-1)] -join '='
  if ([string]::IsNullOrWhiteSpace($name) -or $name.Contains('#')) {
    return
  }
  Set-Content env:\$name $value
}

$migration = $args[0]

npx prisma migrate dev --name "$migration" --skip-seed --schema ./libs/db/src/schema.prisma