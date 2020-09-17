FROM mcr.microsoft.com/dotnet/core/aspnet:3.1-buster-slim AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/core/sdk:3.1-buster AS build
WORKDIR /src
COPY ["src/ClientService/ClientService.csproj", "src/ClientService/"]
RUN dotnet restore "src/ClientService/ClientService.csproj"
COPY . .
WORKDIR "/src/src/ClientService"
RUN dotnet build "ClientService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "ClientService.csproj" -c Release -o /app/publish

FROM node:12 as client

WORKDIR /app/client

COPY src/ClientService/ClientApp/. .

RUN npm install -g @angular/cli && yarn install && npm run build:prod

FROM base AS final
WORKDIR /app
COPY --from=client /app/client/dist/ /app/ClientApp/dist/
COPY --from=publish /app/publish .

RUN apt-get update && \
apt-get install -qy nodejs npm && \
npm install npm@latest -g

ENTRYPOINT ["dotnet", "ClientService.dll"]