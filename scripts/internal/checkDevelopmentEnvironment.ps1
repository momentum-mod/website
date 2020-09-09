echo "Checking if WSL is installed";
echo "";

$enabledString = "Enabled";
$wslString = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux;

if($wslString.State -eq $enabledString)
{
  echo "WSL is installed, continuing.";
}
else
{
  echo "You don't have WSL, please follow this guide on how to install: https://docs.microsoft.com/en-us/windows/wsl/install-win10";
  exit;
}

echo "";

echo "Checking if Docker is running on WSL"

echo "";
docker version;
echo "";


if($?)
{
  echo "Docker for Windows is installed and running, continuing.";
}
else
{
  echo "You don't have Docker for Windows, please follow this guide on how to install: https://docs.docker.com/docker-for-windows/install/";
  exit;
}

echo "";

echo "Checking if Docker Compose is running on WSL"

echo "";
docker-compose version;
echo "";


if($?)
{
  echo "Docker-Compose for Windows is installed and running, continuing.";
}
else
{
  echo "You don't have Docker-Compose for Windows, please follow this guide on how to install: https://docs.docker.com/compose/install/#install-compose-on-windows-desktop-systems";
  exit;
}

echo "";
echo "You have all the required development dependencies!";

