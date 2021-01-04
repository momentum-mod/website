#See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/aspnet:5.0-buster-slim AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:5.0-buster-slim AS build
WORKDIR /src
COPY ["src/Gateway/Momentum.Gateway.Api/Momentum.Gateway.Api.csproj", "src/Gateway/Momentum.Gateway.Api/"]
COPY ["src/Framework/Momentum.Framework.Core/Momentum.Framework.Core.csproj", "src/Framework/Momentum.Framework.Core/"]
COPY ["src/Modules/Auth/Momentum.Auth.Core/Momentum.Auth.Core.csproj", "src/Modules/Auth/Momentum.Auth.Core/"]
COPY ["src/Modules/Users/Momentum.Users.Application/Momentum.Users.Application.csproj", "src/Modules/Users/Momentum.Users.Application/"]
COPY ["src/Modules/Users/Momentum.Users.Core/Momentum.Users.Core.csproj", "src/Modules/Users/Momentum.Users.Core/"]
COPY ["src/Modules/Auth/Momentum.Auth.Api/Momentum.Auth.Api.csproj", "src/Modules/Auth/Momentum.Auth.Api/"]
COPY ["src/Modules/Auth/Momentum.Auth.Application/Momentum.Auth.Application.csproj", "src/Modules/Auth/Momentum.Auth.Application/"]
RUN dotnet restore "src/Gateway/Momentum.Gateway.Api/Momentum.Gateway.Api.csproj"
COPY . .
WORKDIR "/src/src/Gateway/Momentum.Gateway.Api"
RUN dotnet build "Momentum.Gateway.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Momentum.Gateway.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Momentum.Gateway.Api.dll"]