# Kids Clothes Inventory

A phone-first web app for tracking which clothes you have, in which size, and
where the box is — so when a kid grows out of a size you can see at a glance what
is already waiting in the next size up, and what can be passed on.

Two people, two phones, one shared list. Changes made on one phone show up on the
other without a refresh.

## What is in it

- **By size** — everything grouped by size, with `+` / `−` buttons to adjust a
  count right from the list.
- **Overview** — a category × size grid. This is the view that answers
  "he has outgrown 110, what do we have in 116?". Tap a cell to jump to it.
- **Smallest size still worn** — set it once in the header; everything below it is
  marked *ready to pass on*, with a running count.
- **Photos** — snap a picture when you box something up. Shrunk on the phone
  before upload, so it stays cheap on storage and mobile data.
- **Locations** — free text ("Basement box A"), auto-suggested from what you have
  already used.

## Setup (about 15 minutes, one time)

### 1. Create a Supabase project

Sign up at [supabase.com](https://supabase.com) and create a project. The free
tier is far more than this needs.

### 2. Create the tables

In the Supabase dashboard: **SQL Editor → New query**, paste the whole of
[`supabase/schema.sql`](supabase/schema.sql), and run it. It creates the `items`
and `settings` tables, the private `photos` storage bucket, the access rules, and
turns on live sync. It is safe to run again later.

### 3. Create your two accounts

**Authentication → Users → Add user**, twice — one for you, one for your wife.
Tick *Auto Confirm User* so no confirmation email is needed. There is no sign-up
screen in the app on purpose: only accounts you create here can get in, and every
account sees the same shared inventory.

### 4. Point the app at your project

**Project Settings → API** gives you the project URL and the `anon` public key.

```bash
cp .env.example .env
```

Then fill both values into `.env`.

### 5. Run it

```bash
npm install
npm run dev
```

Vite prints a `Network:` address (something like `http://192.168.1.20:5173`).
Open that on your phone while on the same Wi-Fi to try it out.

### 6. Put it online

Any static host works, since the backend is Supabase. With
[Vercel](https://vercel.com) or [Netlify](https://netlify.com): connect this
repository, keep the detected build command (`npm run build`) and output
directory (`dist`), and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as
environment variables.

### 7. Add it to your home screens

Open the deployed URL on each phone and use **Share → Add to Home Screen**
(iPhone) or **⋮ → Add to home screen** (Android). It then opens full screen, like
an app.

## Day to day

- **Boxing up a size**: hit `+`, pick the type and size, count the pile, name the
  box, take a photo.
- **A kid moves up a size**: change *Smallest size still worn* in the header. Tap
  the "ready to pass on" count to see exactly what can leave the house.
- **Before buying anything**: open **Overview** and look down the column for the
  next size.

## Making it yours

- Categories and sizes live in [`src/lib/constants.ts`](src/lib/constants.ts).
  The sizes are the EU/Swiss ones (50–164); the order of that array is what
  "bigger" and "smaller" mean throughout the app. Categories can also be typed
  ad hoc in the form via *Something else…*, so edit the list only if you want a
  different default set.
- Colours are CSS variables at the top of [`src/styles.css`](src/styles.css).
  Light and dark mode both follow the phone's setting.
- After changing the icon in `public/icon.svg`, regenerate the PNGs with
  `npm run icons`.

## Notes

- Photos live in a **private** bucket; the app fetches short-lived signed URLs, so
  the images are not publicly reachable by URL.
- Everyone signed in can read and edit everything. That is deliberate — it is a
  household list, not a multi-tenant app.
