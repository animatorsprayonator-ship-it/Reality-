# PixelVerse — Final project package

A 2D side-view multiplayer mining game foundation built with Node.js, Express, Socket.IO and a JSON data store.

## Run locally
1. Install Node.js 20 or newer.
2. Extract this folder.
3. Open a terminal in the `PixelVerse_Final` folder.
4. Run `npm install`.
5. Run `npm start`.
6. Open `http://localhost:3000`.

## Deploy to Render
1. Upload the complete folder to a GitHub repository. Keep `server.js`, `package.json`, `render.yaml`, and `public/` at the repository root.
2. In Render, choose **New → Blueprint** and select the repository.
3. Render reads `render.yaml`, installs dependencies and starts the server.
4. Keep the persistent disk mounted at `/opt/render/project/src/data`.
5. Set a strong secret environment variable named `JWT_SECRET` if Render has not generated one.
6. Keep one server instance for this JSON-backed version.

## Implemented in this package
- Account registration and login; username is permanent.
- Password hashing and signed login tokens.
- Separate public regional worlds for Asia, Europe, North America, South America, Oceania and Africa.
- 2D side-view canvas, movement, basic mobile touch buttons and keyboard movement.
- Plains, Hell and Space; Hell costs 5,000 coins and Space costs 50,000 coins.
- Server-validated mining, backpack capacity, resource selling, coins and XP/levels.
- Shop catalog with pickaxes, swords, armor, backpacks and permanent boosts.
- Equipment ownership and equipping.
- Nine boss definitions (three per dimension), shared regional boss health, co-op damage visibility.
- Basic friends requests and friend list.
- Basic auction listing, bidding and Buy Now endpoint.
- Two-confirmation trade endpoint.

## Important: production readiness
This is a playable full-stack starter, **not a finished commercial MMO**. Before opening it publicly to large numbers of players, commission testing and hardening:
- Replace JSON persistence with PostgreSQL and transactional database operations.
- Add robust rate limits, moderation, abuse reporting, chat filters, password reset, email verification and account recovery.
- Add proper trade UI, second-confirmation UI, bid escrow/refunds, auction expiry/settlement and seller payout transactions.
- Implement friend JOIN routing, online status reconciliation and safe disconnect recovery.
- Add per-boss encounter lifecycle, rewards-once protection, combat range/cooldowns and authoritative player positions.
- Add proper terrain generation, collision, mining animation, block respawn rules, player sprites/skins and full mobile controls.
- Add single-player mode with an independent save slot.
- Add backups, monitoring, load tests and security review.

The JSON database is intended for a small test deployment with a single server instance. Do not run multiple instances against the same JSON file. Never publish `.env`, secrets, database files or user data.

## Game rules included
- No normal PvE enemies. Boss fights are Player vs Boss only.
- Three dimensions and exactly three bosses per dimension.
- No crafting. Resources are mined, sold, auctioned or traded.
- Armor increases maximum HP; swords increase damage.
- Coins are the only currency.
- Eight rarity labels are used: Common, Uncommon, Rare, Epic, Legendary, Mythic, Divine and Cosmic.
- Alien Blaster is listed immediately before Cosmic Blade.
