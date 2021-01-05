![Momentum Mod Logo](Frontend/src/assets/images/site.png)

> *Momentum Mod is a standalone game built on the Source Engine, aiming to centralize movement gametypes found in CS:S, CS:GO, and TF2.*

This is the repository for the main Momentum Mod website, which acts as the central hub for and an extension to the [game client](https://github.com/momentum-mod/game). 

The frontend of Momentum's main site acts as the extension to the game, allowing players to log in via Steam (via OpenID), where they can find a dashboard that shows statistics, maps, players, and runs. The frontend runs on [Angular](https://angular.io) and utilizes the [Nebular](https://github.com/akveo/nebular) framework. More info about it and instructions to run it can be found in the [client/](client/) folder.

The backend of the website is the core of the interactive functionality of the game and handles things like map uploads/downloads, run submission/viewing, and stats congregation/filtering. The backend runs on [NodeJS](https://nodejs.org/) and utilizes the [Express](https://expressjs.com/) framework. More info about it and instructions to run it can be found in the [server/](server/) folder.

## *Something wrong with the site?*  
[Submit an issue](https://github.com/momentum-mod/website/issues/new) with some pictures and/or web console error output!

## *Want to help out?*
[Join our Discord](https://discord.gg/wQWkRb6) and let us know! We also accept pull requests, *but make sure the issue/feature isn't already assigned to someone!*

## Looking for our documentation site?
Our documentation site uses different technology and can be found on [our docs repository](https://github.com/momentum-mod/docs).