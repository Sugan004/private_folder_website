# Zero-Cost Cloud Deployment Guide

This guide explains how to deploy the Secure File Storage stack completely for **free**, permanently, using modern serverless and cloud providers.

## Architecture

*   **Database:** [Neon Database](https://neon.tech/) (Serverless Postgres)
*   **Storage:** [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) (S3-compatible API, 10GB free/mo, zero egress fees)
*   **Backend:** [Render](https://render.com/) (Free Node.js Web Service)
*   **Frontend:** [Vercel](https://vercel.com/) (Free Global CDN for React/Vite)

---

## 1. Prepare your Repository
Make sure all your code is committed and pushed to a GitHub repository. Vercel and Render will pull the code directly from GitHub.

---

## 2. Setup the Database (Neon)
1. Create a free account at [Neon.tech](https://neon.tech/).
2. Create a new Postgres project (select Postgres 16).
3. Once created, copy the **Connection String** from the dashboard. It will look like this: 
   `postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. Keep this string safe; it will be your `DATABASE_URL`.

---

## 3. Setup File Storage (Cloudflare R2)
*Note: You can also use AWS S3 Free Tier (5GB/12 months) or Backblaze B2 (10GB/permanently).*
1. Create a free account at [Cloudflare](https://dash.cloudflare.com/) and navigate to **R2**.
2. Click **Create bucket**, name it `secure-vault-bucket`, and select automatic location.
3. Once created, go back to the R2 overview and click **Manage R2 API Tokens** (top right).
4. Create an API token with **Object Read & Write** permissions.
5. Save the following information:
   - **Access Key ID** (`S3_ACCESS_KEY`)
   - **Secret Access Key** (`S3_SECRET_KEY`)
   - **Endpoint URL** (`S3_ENDPOINT`) - Look for the S3 API endpoint under your bucket settings (e.g., `https://<account_id>.r2.cloudflarestorage.com`)
   - **Region** (`S3_REGION`) - Cloudflare uses `auto`.

---

## 4. Deploy the Backend (Render)
1. Create a free account on [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Render will ask for a **Root Directory**. Type: `backend`
5. Configure the build:
   - **Environment:** `Node`
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npx prisma migrate deploy && node dist/app.js`
   - **Plan:** Select `Free`
6. Scroll down to **Environment Variables** and add:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = *(Paste your Neon connection string here)*
   - `JWT_ACCESS_SECRET` = *(Generate a random long string)*
   - `JWT_REFRESH_SECRET` = *(Generate a different random long string)*
   - `S3_BUCKET` = `secure-vault-bucket`
   - `S3_ENDPOINT` = *(Your R2 API URL)*
   - `S3_REGION` = `auto`
   - `S3_ACCESS_KEY` = *(Your R2 access key)*
   - `S3_SECRET_KEY` = *(Your R2 secret key)*
   - `FRONTEND_URL` = `https://<your-vercel-project-name>.vercel.app` (You can add this later once Vercel is deployed)
7. Click **Create Web Service**. 
   > **Note on Free Tier:** The first build takes ~2-3 minutes. Render free instances "spin down" after 15 minutes of inactivity. The first request to wake it up will take about 30-50 seconds.

---

## 5. Deploy the Frontend (Vercel)
1. Create a free account on [Vercel](https://vercel.com/).
2. Click **Add New Project** and import your GitHub repository.
3. In the project configuration, under **Root Directory**, select `frontend`.
4. Vercel automatically detects it is a Vite/React app and sets the build command (`npm run build`).
5. Open **Environment Variables** and add:
   - `VITE_API_URL` = `https://<your-render-app-name>.onrender.com/api/v1` (Get this URL from your Render dashboard).
6. Click **Deploy**.

---

## 6. Final Wiring
1. Once Vercel finishes deploying, copy the public URL it provides (e.g., `https://my-secure-vault.vercel.app`).
2. Go back to your **Render** dashboard, go to the backend's **Environment** tab, and set `FRONTEND_URL` to your Vercel URL. 
   *(Note: Do not include a trailing slash in the URL)*
3. **Save Changes** in Render. It will automatically restart the backend with the new CORS origin.

**Congratulations!** You now have a fully functional, highly secure, production-grade file storage service hosted entirely on free, scalable cloud infrastructure.
