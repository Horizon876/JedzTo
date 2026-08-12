# JedzTo Multi-Vendor API

GraphQL + MongoDB with role-based Multi-Vendor architecture.

## Roles

| Role | Access |
|---|---|
| `SUPER_ADMIN` | Full platform |
| `RESTAURANT_OWNER` | Own restaurants / orders only |
| `CUSTOMER` | Browse + place orders |

## Start

```bash
npm install
npm start
```

API: `http://localhost:8001/graphql`

Jeśli lokalne MongoDB (`mongodb://127.0.0.1:27017/jedzto`) nie działa, API startuje
**trwały lokalny Mongo** w katalogu `.data/mongodb` (dane przeżywają restart procesu).

Na produkcji ustaw prawdziwy `MONGODB_URI` (np. Atlas) i `ALLOW_MEMORY_MONGO=0`.

Aby wyzerować lokalne dane: usuń katalog `jedzto-local-api/.data/mongodb` i zrestartuj API.


## Seed accounts

| Role | Email | Password |
|---|---|---|
| SUPER_ADMIN | `admin@jedzto.local` | `admin1234` |
| RESTAURANT_OWNER | `owner1@jedzto.local` | `owner1234` |
| RESTAURANT_OWNER | `owner2@jedzto.local` | `owner1234` |
| CUSTOMER | `demo@jedzto.local` | `demo1234` |
| OTP | — | `123456` |

Force re-seed: wipe MongoDB collection `jedzto` or delete users and restart with `SEED_ON_START=1`.
