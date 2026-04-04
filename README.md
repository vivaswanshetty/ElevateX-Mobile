# ElevateX Mobile

This repo contains the Expo mobile client for ElevateX.

The mobile app does not use a separate product backend anymore. It shares the same backend and MongoDB database as the web app.

- mobile app: `elevatex-mobile/apps/mobile`
- shared backend: `/Users/vivaswanshetty/Documents/Projects/ElevateX/server`
- shared database: MongoDB used by that backend

## Development

From `elevatex-mobile/`:

```bash
bun install
bun run dev:all
```

That starts:

- the shared backend on port `5001`
- the Expo mobile dev server

You can also run them separately:

```bash
bun run dev:backend
bun run dev:mobile
```

If you want one command that also asks Expo to launch Android:

```bash
bun run dev:android
```

## Android Emulator

The app is configured to reach the backend at:

```text
http://10.0.2.2:5001
```

`bun run dev:android` will try to open the app on an available Android emulator/device. If no emulator is running yet, Expo may still prompt you to start one first depending on your local Android setup.
It now keeps Expo attached to your terminal, so prompts like the Expo Go version update can be answered normally.

## Notes

- auth/data flow is JWT + Mongo-backed web API
- restart Expo after env or font changes so Metro picks them up
