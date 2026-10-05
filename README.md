# Together — family shopping

A mobile-first Next.js App Router application with React, Tailwind CSS, Lucide icons, and MongoDB Atlas through Mongoose. Family members select their name without authentication.

## Run locally

1. Install Node.js 22.12+ and run `npm install`.
2. Copy `.env.example` to `.env.local`. Replace `MONGODB_URI` with your Atlas connection string, including the database name. URL-encode special characters in the database password.
3. In Atlas, create a database user with read/write access to this database and allow your development IP through Network Access.
4. Run `npm run dev` and open http://localhost:3000.
5. Add family members with the **+** beside the member picker. Create a list, choose your name, and add items.

No database seed is required. An empty database is supported. If the database is unconfigured or unavailable, the app displays a setup/error message with a retry action.

## Features

- Multiple shared lists, archive and restore; archived lists are read-only in the UI.
- Items grouped into six aisles, with separate Yet to buy and Bought tabs.
- Add/edit name, quantity, category, purchase location, optional estimated price, and recurring flag.
- One-tap purchase status with the purchaser and purchase date recorded.
- Buy again creates a new pending item and preserves the original history entry.
- Delete an item or permanently clear bought items after confirmation.
- Name selection is remembered on the current device. Refresh retrieves the latest family changes; there is no realtime subscription.
- Responsive layout, web app manifest, and SVG app icon. This is PWA-ready metadata, with no offline caching or service worker. Shopping requires a connection.

Prices are displayed without a currency symbol because the specification provides no currency field and family members shop in different countries. The specified `buyLocation` field is a nullable **Date** and is used as the purchase timestamp; it does not store a geographic location.

## Directory structure

```text
app/
  api/
    users/route.ts          # create and fetch family members
    lists/route.ts          # create and fetch lists
    lists/[id]/route.ts     # rename/archive/delete lists; clear bought items
    items/route.ts          # fetch a list's items; add items
    items/[id]/route.ts     # edit, set status, delete
  globals.css
  layout.tsx
  manifest.ts
  page.tsx
components/
  ShoppingList.tsx
  ItemRow.tsx
  AddItemForm.tsx
lib/
  api.ts                   # validation/error responses
  mongodb.ts               # cached connection and in-flight promise
  types.ts
  validation.ts
models/index.ts            # User, List, ShoppingItem schemas
public/icon.svg
.env.example
```

## API

All responses are JSON and uncached. Invalid input returns 400, missing records 404, and database/configuration failures 503. Object IDs and editable fields are validated. Items are populated with the adding/purchasing member.

| Method | Endpoint                            | Body / behavior                                                                                                   |
| ------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/users`                        | All members                                                                                                       |
| POST   | `/api/users`                        | `{ "name": "Aama" }`                                                                                              |
| GET    | `/api/lists`                        | All lists, including archived                                                                                     |
| POST   | `/api/lists`                        | `{ "title": "Groceries", "createdBy": "USER_ID" }`                                                                |
| PATCH  | `/api/lists/LIST_ID`                | `title` and/or `isArchived`                                                                                       |
| DELETE | `/api/lists/LIST_ID`                | Delete list and its items                                                                                         |
| DELETE | `/api/lists/LIST_ID?completed=true` | Delete bought items only                                                                                          |
| GET    | `/api/items?listId=LIST_ID`         | All items in a list                                                                                               |
| POST   | `/api/items`                        | `name`, `quantity`, `category`, `listId`, `addedBy`; optional `purchaseLocation`, `estimatedPrice`, `isRecurring` |
| PATCH  | `/api/items/ITEM_ID`                | Editable item fields; status changes require `actorId`                                                            |
| DELETE | `/api/items/ITEM_ID`                | Delete item                                                                                                       |

To mark an item bought, send `{ "status": "BOUGHT", "actorId": "USER_ID" }`. To undo, send `YET_TO_BUY` with the actor; purchaser and timestamp are cleared. Explicit status assignments are safe to retry. Buy again uses POST with the original item's fields and current actor.

## Checks

```sh
npm run typecheck
npm run build
```

Manual integration check with Atlas: create two members and lists, add/edit items in multiple categories, switch members and mark an item bought, verify attribution, undo, buy again and verify the history remains, switch lists, clear bought items, archive/restore, then reload and confirm persistence. Check the same flow at a mobile viewport.

## Vercel

Import this repository into Vercel as a Next.js project. Set `MONGODB_URI` in its environment variables for the required environments, configure Atlas Network Access for your deployment's outbound connectivity, and deploy. API routes use the Node.js runtime. The build script uses Webpack for compatibility with local worker restrictions. Mongoose connections and connection promises are cached per serverless instance, with a small pool and retry after connection failure.

As requested, there is no authentication: anyone with the deployed URL can read and change family data, and member selection is attribution rather than identity verification. Share the URL accordingly.
