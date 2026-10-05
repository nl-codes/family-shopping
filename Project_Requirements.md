# Context & Specification: Next.js + MongoDB Family Shopping List App

I want to build a full-stack family shopping list application using **Next.js (App Router)** and **MongoDB Atlas**.

The app will be used by family members in both **Nepal and Australia**, so it needs to be clean, mobile-friendly (PWA-ready).

---

## 1. Core Tech Stack

- **Framework:** React
- **Database:** MongoDB Atlas (mongoose)
- **Styling:** Tailwind CSS + Lucide Icons (or Shadcn UI)
- **Authentication:** No Authentication
- **Deployment Target:** Vercel

---

## 2. Key Data Models (MongoDB Schemas)

### User Model

- `_id`: ObjectId
- `name`: String
- `createdAt`: Date

### List Model

- `_id`: ObjectId
- `title`: String
- `createdBy`: ObjectId (Ref: User)
- `isArchived`: Boolean
- `createdAt`: Date

### ShoppingItem Model

- `_id`: ObjectId
- `listId`: ObjectId (Ref: List)
- `name`: String
- `quantity`: String (e.g., "2 kg", "1 pack", "3")
- `category`: Enum ["Produce", "Dairy & Chilled", "Pantry", "Household", "Electronics", "Other"]
- `status`: Enum ["YET_TO_BUY", "BOUGHT"]
- `estimatedPrice`: Number (Optional)
- `addedBy`: ObjectId (Ref: User)
- `boughtBy`: ObjectId (Ref: User, Nullable)
- `buyLocation`: Date (Nullable)
- `isRecurring`: Boolean (default: false — for quick re-adding)
- `createdAt`: Date

---

## 3. Key App Features & Requirements

1. **Dashboard & Views:**
    - **Tabbed View for Items:** Clear division between **"Yet to Buy"** and **"Bought"**.
    - **Multi-List Management:** Switch between different family lists or shared lists.
    - **Categorization:** Group "Yet to Buy" items by aisle/category to make in-store shopping efficient.

2. **Core Shopping Operations:**
    - Quick add item form (Name, Quantity, Category).
    - One-tap toggle to mark item as "Bought" or "Yet to Buy".
    - Clear/Archive completed items.
    - "Buy Again" feature for quick re-adding from shopping history.

3. **Family Nuances:**
    - Show _who_ added the item and _who_ bought it.

4. **UI/UX & Mobile-First Design:**
    - Mobile-first responsive layout (large touch targets for checking off items in supermarkets).
    - Clean, modern UI using Tailwind CSS.

---

## What I Need You To Generate:

Please generate a complete project setup step-by-step:

1. **Project Directory Structure:** Clean Next.js App Router folder tree.
2. **Database Connection:** `lib/mongodb.ts` for safe connection caching in Next.js serverless functions.
3. **Mongoose Schemas:** TypeScript models for Users, Lists, and ShoppingItems.
4. **Server Actions / API Routes:** Full CRUD handlers for:
    - Creating/fetching lists
    - Adding/updating items
    - Toggling item status (`YET_TO_BUY` ↔ `BOUGHT`)
5. **Main UI Components:**
    - `ShoppingList`: Main container with "Yet to Buy" vs "Bought" tabs.
    - `ItemRow`: Row component with status checkmark, quantity, purchaser badge, and delete button.
    - `AddItemModal` / `AddItemForm`: Quick-add form.
