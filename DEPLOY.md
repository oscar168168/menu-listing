# Deploying MenuOS to GitHub + Firebase App Hosting (Cloud Firestore)

## Prerequisites
1. **Cloud Firestore** enabled in Firebase project `menu-listing` (Standard Edition, `FIRESTORE_NATIVE`).
2. A **Firebase Blaze (pay-as-you-go)** plan for App Hosting:  
   https://console.firebase.google.com/project/menu-listing/overview?purchaseBillingPlan=metered
3. GitHub repository: `oscar168168/menu-listing`

---

## Step 1 — Deploy Firestore Rules & Indexes
```sh
npx -y firebase-tools@latest deploy --only firestore --project menu-listing
```

---

## Step 2 — Set Firebase App Hosting Secret (`AUTH_SECRET`)
No `DATABASE_URL` is needed — `firebase-admin` automatically connects to Cloud Firestore using Firebase App Hosting's built-in Application Default Credentials.

Generate and store a strong HMAC secret for session cookies:
```sh
openssl rand -hex 32
npx -y firebase-tools@latest apphosting:secrets:set AUTH_SECRET --project menu-listing
```

---

## Step 3 — Update `apphosting.yaml`
1. Set `NEXT_PUBLIC_APP_URL` to your deployed App Hosting URL (or custom domain) so generated table QR codes link to your live site.
2. Uncomment `FIREBASE_STORAGE_BUCKET` (`menu-listing.firebasestorage.app`) so uploaded dish photos & venue logos persist in Firebase Storage instead of container disk.
3. Commit and push to `main`.

---

## Step 4 — Connect GitHub to Firebase App Hosting
- **Via Firebase Console:** Open **App Hosting → Get started**, select `oscar168168/menu-listing`, branch `main`, and deploy.
- **Or via CLI:**
  ```sh
  npx -y firebase-tools@latest apphosting:backends:create \
    --project menu-listing \
    --backend menu-listing \
    --primary-region asia-east1
  ```

---

## Step 5 — Seed Initial Restaurants & Accounts in Live Firestore
Download a service account private key once from **Firebase Console → Project settings → Service accounts → Generate new private key**, then run:
```sh
GOOGLE_APPLICATION_CREDENTIALS="/path/to/menu-listing-firebase-adminsdk.json" npm run db:seed
```
(Delete the temporary local key file afterward and change the seeded demo passwords after logging in.)
