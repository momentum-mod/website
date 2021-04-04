#See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/aspnet:5.0-buster-slim AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:5.0-buster-slim AS build
WORKDIR /src
COPY ["API/src/Gateway/Momentum.Gateway.Api/Momentum.Gateway.Api.csproj", "API/src/Gateway/Momentum.Gateway.Api/"]
COPY ["API/src/Framework/Momentum.Framework.Core/Momentum.Framework.Core.csproj", "API/src/Framework/Momentum.Framework.Core/"]
COPY ["API/src/Modules/Auth/Momentum.Auth.Api/Momentum.Auth.Api.csproj", "API/src/Modules/Auth/Momentum.Auth.Api/"]
COPY ["API/src/Modules/Auth/Momentum.Auth.Application/Momentum.Auth.Application.csproj", "API/src/Modules/Auth/Momentum.Auth.Application/"]
COPY ["API/src/Modules/Auth/Momentum.Auth.Core/Momentum.Auth.Core.csproj", "API/src/Modules/Auth/Momentum.Auth.Core/"]
COPY ["API/src/Modules/Users/Momentum.Users.Application/Momentum.Users.Application.csproj", "API/src/Modules/Users/Momentum.Users.Application/"]
COPY ["API/src/Modules/Users/Momentum.Users.Core/Momentum.Users.Core.csproj", "API/src/Modules/Users/Momentum.Users.Core/"]
COPY ["API/src/Modules/Auth/Momentum.Auth.Infrastructure/Momentum.Auth.Infrastructure.csproj", "API/src/Modules/Auth/Momentum.Auth.Infrastructure/"]
COPY ["API/src/Framework/Momentum.Framework.Infrastructure/Momentum.Framework.Infrastructure.csproj", "API/src/Framework/Momentum.Framework.Infrastructure/"]
COPY ["API/src/Modules/Users/Momentum.Users.Api/Momentum.Users.Api.csproj", "API/src/Modules/Users/Momentum.Users.Api/"]
COPY ["API/src/Modules/Users/Momentum.Users.Infrastructure/Momentum.Users.Infrastructure.csproj", "API/src/Modules/Users/Momentum.Users.Infrastructure/"]
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