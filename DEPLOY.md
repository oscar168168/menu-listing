# Deploying MenuOS (100% Free Plan: Firebase Spark + Vercel Hobby)

This setup uses **no paid plans** and **no credit card**:
- **Database & Built-in Image Storage:** Firebase **Spark (free)** Cloud Firestore (Singapore `asia-southeast1`)
- **Next.js SSR & API Hosting:** **Vercel Hobby (free)** pinned to `sin1` (Singapore via [`vercel.json`](vercel.json)) so functions sit in the same region as Firestore
- **External Image CDN (optional):** **Cloudinary Free Tier** (only needed if you want external CDN hosting; built-in Firestore media storage works automatically with zero setup)

---

## Step 1 — Deploy Firestore Rules & Indexes (Free on Spark)
Deploy `firestore.rules` and `firestore.indexes.json` before production traffic so indexed queries (such as homepage active venue ordering) run at full speed:
```sh
npx -y firebase-tools@latest deploy --only firestore --project menu-listing
```

---

## Step 2 — Seed Initial Restaurants & Accounts in Cloud Firestore
Download a service account JSON key from **Firebase Console → Project settings → Service accounts → Generate new private key**, then run:
```sh
GOOGLE_APPLICATION_CREDENTIALS="/path/to/menu-listing-firebase-adminsdk.json" npm run db:seed
```
*(Keep that downloaded JSON file safe locally or delete it after Step 4; `.gitignore` already excludes `*-firebase-adminsdk-*.json`.)*

---

## Step 3 — Deploy Next.js to Vercel Hobby (Free)
1. Push your latest commit to GitHub (`oscar168168/menu-listing`).
2. Go to [vercel.com/new](https://vercel.com/new), import `oscar168168/menu-listing` under your **Hobby (free)** account.
3. Add the following **Environment Variables** in Vercel Project Settings:
   - `FIREBASE_PROJECT_ID` = `menu-listing`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = base64-encoded (recommended) or single-line contents of your downloaded service account JSON file:
     ```sh
     base64 -i /path/to/menu-listing-firebase-adminsdk.json | tr -d '\n'
     ```
   - `AUTH_SECRET` = output of `openssl rand -hex 32`
   - `NEXT_PUBLIC_APP_URL` = your Vercel deployment URL (e.g. `https://menu-listing.vercel.app`)
   - *(Optional)* `FIRESTORE_ENABLE_TRACING` = `off` (defaulted to `off` in `src/lib/firestore.ts` to avoid OpenTelemetry tracing overhead on serverless cold starts)
   - *(Optional)* `CLOUDINARY_URL` = `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`
4. Click **Deploy**. (`vercel.json` pins serverless functions to `sin1` Singapore next to `asia-southeast1` Firestore.)

---

## Step 4 — Security Cleanup
- Delete your temporary local `*-firebase-adminsdk-*.json` file once `FIREBASE_SERVICE_ACCOUNT_JSON` is saved in Vercel.
- Sign in to `/login` and update the seeded demo passwords (`admin@menuos.app`, `owner@soraseafood.com`, `chef@kepbaykitchen.com`).
