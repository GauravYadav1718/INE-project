# INE Price Tracker

Hey there! Welcome to the INE Price Tracker. This is a full-stack web app I built to track product prices from `https://demo.inelabteamdev.com/`. 

## What's in the box?
* **Frontend:** React + Vite + TailwindCSS (hosted on Vercel)
* **Backend:** Node.js + Express + Playwright + Cheerio (running on Render)
* **Database:** Supabase PostgreSQL

## Getting Started Locally

Want to run this on your own machine? It's pretty straightforward.

### 1. Database Setup
First, you'll need a database.
1. Spin up a new project on [Supabase](https://supabase.com).
2. Head over to the SQL Editor in your dashboard and run everything inside the `schema.sql` file.
3. Grab your **Project URL** and **Service Role Key** from the settings (Settings > API). You'll need these in a minute!

### 2. Setting Up Environment Variables
You'll need a `.env` file in both the `backend` and `frontend` folders. 

**`backend/.env`**
```env
PORT=3001
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
CRON_SECRET=make_up_a_super_secret_password_here
TARGET_BASE_URL=https://demo.inelabteamdev.com
HEADLESS=true
```

**`frontend/.env`**
```env
VITE_API_BASE_URL=http://localhost:3001
```

### 3. Installation
Let's get the dependencies installed. Open your terminal and run:

```bash
# Get the backend ready
cd backend
npm install

# Get the frontend ready
cd ../frontend
npm install
```

### 4. Fire it up!
You'll need two terminal windows open:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

### Testing the Scraper
If you want to actually *see* the browser open up and scrape a product (it's pretty cool to watch), you can run it in "headed" mode:
```bash
cd backend
npm run scrape:headed
```

## How to Deploy to Production

Deploying this stack is super easy, here's how I did it:

1. **Backend (Render):** Hook up your GitHub repo and deploy the `backend` folder as a Web Service. Make sure your "Root Directory" is set to `backend`, your Build Command is `npm install && PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium`, and your Start Command is `npm start`. Add your environment variables in the dashboard (including `PLAYWRIGHT_BROWSERS_PATH=0`!).
2. **Frontend (Vercel):** Connect your repo, point it to the `frontend` folder, and deploy. Don't forget to add `VITE_API_BASE_URL` in the Vercel settings so it knows where your Render backend lives.
3. **Automating the Scraper (cron-job.org):** 
    * Set up a free cron job pointing to `https://<your-render-url>.onrender.com/api/cron/scrape` using the `POST` method.
    * Add an authorization header using the secret password you created earlier (`Authorization: Bearer your_super_secret_password_here`).
    * Set it to run every few hours and you're good to go!
