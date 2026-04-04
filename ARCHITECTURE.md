# ElevateX Mobile Architecture

## Current Setup

ElevateX uses a shared backend architecture:

- web frontend: `/Users/vivaswanshetty/Documents/Projects/ElevateX`
- mobile frontend: `elevatex-mobile/apps/mobile`
- shared backend API: `/Users/vivaswanshetty/Documents/Projects/ElevateX/server`
- shared database: MongoDB used by the shared backend

## Mobile Stack

| Layer | Tech |
|---|---|
| Framework | Expo SDK 52 |
| Routing | Expo Router |
| Server state | TanStack Query |
| Local state | Zustand |
| Auth storage | Expo SecureStore |
| Typography | Inter |
| Language | TypeScript |

## Shared API Surface

The mobile app uses the same web API for:

- auth
- profile
- tasks
- activity
- feed/posts
- wallet transactions
- leaderboard/seasons
- chat/messages

## Why This Is Correct

Web and mobile should share:

- users
- auth
- business logic
- leaderboard state
- wallet state
- messages

That keeps the product consistent and avoids duplicating backend logic.
