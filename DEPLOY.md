# Deploying MenuOS to GitHub + Firebase App Hosting

## Prerequisites
1. A **Firebase project on the Blaze (pay-as-you-go) plan**:  
   https://console.firebase.google.com/project/_/overview?purchaseBillingPlan=metered
2. A hosted **PostgreSQL** database (Google Cloud SQL, Neon, or Supabase).
3. A **GitHub repository** containing this project.

---

## Step 1 — Push to GitHub
```sh
git add .
git commit -m "Initial commit: MenuOS platform"
git remote add origin https://github.com/<your-org>/<your-repo>.git
git push -u origin main
```

---

## Step 2 — Set Firebase App Hosting Secrets
```sh
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use <your-firebase-project-id>

# Store hosted PostgreSQL URL and a strong session secret (openssl rand -hex 32)
npx -y firebase-tools@latest apphosting:secrets:set DATABASE_URL
npx -y firebase-tools@latest apphosting:secrets:set AUTH_SECRET
```

---

## Step 3 — Update `apphosting.yaml`
1. Set `NEXT_PUBLIC_APP_URL` to your App Hosting URL (or custom domain) so QR codes encode your live domain.
2. Uncomment `FIREBASE_STORAGE_BUCKET` and set it to your Firebase Storage bucket (e.g. `<project-id>.firebasestorage.app`) so dish photos & venue logos persist across Cloud Run restarts.
3. Grant the App Hosting backend service account the **Storage Object Admin** role on your bucket in GCP IAM (if not already granted).
4. Commit & push `apphosting.yaml`.

---

## Step 4 — Connect GitHub to Firebase App Hosting
- **Via Firebase Console:** Open **App Hosting → Create backend**, connect your GitHub repo and `main` branch, and deploy.
- **Or via CLI:**
  ```sh
  npx -y firebase-tools@latest apphosting:backends:create \
    --backend menu-listing \
    --primary-region asia-east1
  ```

---

## Step 5 — Push Schema & Seed Production Database
Run once against your hosted PostgreSQL database:
```sh
DATABASE_URL="postgresql://..." npx prisma db push
DATABASE_URL="postgresql://..." npm run db:seed
```
(Remember to change the seeded demo passwords after initial login.)
