#See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/aspnet:5.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:5.0 AS build
WORKDIR /src
COPY ["API/src/Gateway/Momentum.Gateway.Api/Momentum.Gateway.Api.csproj", "API/src/Gateway/Momentum.Gateway.Api/"]
COPY ["API/src/Framework/Momentum.Framework.Core/Momentum.Framework.Core.csproj", "API/src/Framework/Momentum.Framework.Core/"]
COPY ["API/src/Modules/Maps/Momentum.Maps.Api/Momentum.Maps.Api.csproj", "API/src/Modules/Maps/Momentum.Maps.Api/"]
COPY ["API/src/Modules/Maps/Momentum.Maps.Application/Momentum.Maps.Application.csproj", "API/src/Modules/Maps/Momentum.Maps.Application/"]
COPY ["API/src/Modules/Maps/Momentum.Maps.Core/Momentum.Maps.Core.csproj", "API/src/Modules/Maps/Momentum.Maps.Core/"]
COPY ["API/src/Modules/Users/Momentum.Users.Api/Momentum.Users.Api.csproj", "API/src/Modules/Users/Momentum.Users.Api/"]
COPY ["API/src/Modules/Users/Momentum.Users.Infrastructure/Momentum.Users.Infrastructure.csproj", "API/src/Modules/Users/Momentum.Users.Infrastructure/"]
COPY ["API/src/Modules/Users/Momentum.Users.Core/Momentum.Users.Core.csproj", "API/src/Modules/Users/Momentum.Users.Core/"]
COPY ["API/src/Framework/Momentum.Framework.Infrastructure/Momentum.Framework.Infrastructure.csproj", "API/src/Framework/Momentum.Framework.Infrastructure/"]
COPY ["API/src/Modules/Users/Momentum.Users.Application/Momentum.Users.Application.csproj", "API/src/Modules/Users/Momentum.Users.Application/"]
COPY ["API/src/Modules/Maps/Momentum.Maps.Infrastructure/Momentum.Maps.Infrastructure.csproj", "API/src/Modules/Maps/Momentum.Maps.Infrastructure/"]
COPY ["API/src/Modules/XpSystems/Momentum.XpSystems.Api/Momentum.XpSystems.Api.csproj", "API/src/Modules/XpSystems/Momentum.XpSystems.Api/"]
COPY ["API/src/Modules/XpSystems/Momentum.XpSystems.Infrastructure/Momentum.XpSystems.Infrastructure.csproj", "API/src/Modules/XpSystems/Momentum.XpSystems.Infrastructure/"]
COPY ["API/src/Modules/XpSystems/Momentum.XpSystems.Core/Momentum.XpSystems.Core.csproj", "API/src/Modules/XpSystems/Momentum.XpSystems.Core/"]
COPY ["API/src/Modules/XpSystems/Momentum.XpSystems.Application/Momentum.XpSystems.Application.csproj", "API/src/Modules/XpSystems/Momentum.XpSystems.Application/"]
RUN dotnet restore "API/src/Gateway/Momentum.Gateway.Api/Momentum.Gateway.Api.csproj"
COPY . .
WORKDIR "/src/API/src/Gateway/Momentum.Gateway.Api"
RUN dotnet build "Momentum.Gateway.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Momentum.Gateway.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Momentum.Gateway.Api.dll"]