# 🔐 Quick Secrets Setup Guide

This guide will help you set up all your secrets for local development and production deployment.

## 📋 Prerequisites Checklist

Before starting, make sure you have accounts and access to:
- ✅ [Clerk Dashboard](https://dashboard.clerk.com) - for authentication keys
- ✅ [Resend Dashboard](https://resend.com) - for email API keys  
- ✅ [Cloudflare Dashboard](https://dash.cloudflare.com) - for account/database IDs

---

## 🏠 Part 1: Local Development Setup (5 minutes)

### Step 1: Copy the Template

```bash
cd "Optimii Worker"
cp .dev.vars.example .dev.vars
```

### Step 2: Get Your Clerk Secrets

1. Go to https://dashboard.clerk.com
2. Select your application: **Optimii** (or your app name)
3. Click **API Keys** in the left sidebar
4. Copy these values:

```bash
# From the "API Keys" tab:
CLERK_SECRET_KEY=sk_test_...  # Copy "Secret Key"

# From the "Webhooks" tab:
CLERK_WEBHOOK_SECRET=whsec_...  # Copy the webhook signing secret
```

**Paste these into your `.dev.vars` file**

### Step 3: Get Your Resend Secrets

1. Go to https://resend.com/api-keys
2. Create a new API key (or use existing)
3. Copy these values:

```bash
RESEND_API_KEY=re_...  # Your API key
RESEND_FROM_EMAIL=hello@yourdomain.com  # Your verified sender email
```

**Paste these into your `.dev.vars` file**

### Step 4: Get Your Cloudflare Credentials

1. **Account ID:**
   - Go to https://dash.cloudflare.com
   - Your Account ID is visible in the URL or right sidebar
   - Example: `b513605647eaa54fe0290da7c17c7ed6`

2. **Database ID:**
   - Click **Workers & Pages** → **D1**
   - Click on **optimii-db** (your database)
   - Copy the Database ID
   - Example: `f02c7b0d-a73d-41bf-ba82-02d45a91829c`

3. **D1 API Token:**
   - Click your profile icon → **My Profile**
   - Go to **API Tokens**
   - Click **Create Token**
   - Use the **Edit Cloudflare Workers** template
   - Or create a custom token with D1 permissions
   - Copy the token (you'll only see it once!)

```bash
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_DATABASE_ID=your_database_id  
CLOUDFLARE_D1_TOKEN=your_api_token
```

**Paste these into your `.dev.vars` file**

### Step 5: Verify Your Setup

Your `.dev.vars` file should now look like this (with real values):

```bash
# Clerk Authentication
CLERK_SECRET_KEY=sk_test_abc123xyz...
CLERK_WEBHOOK_SECRET=whsec_abc123xyz...

# Resend Email Service
RESEND_API_KEY=re_abc123xyz...
RESEND_FROM_EMAIL=hello@yourdomain.com

# Cloudflare (for Drizzle migrations)
CLOUDFLARE_ACCOUNT_ID=b513605647eaa54fe0290da7c17c7ed6
CLOUDFLARE_DATABASE_ID=f02c7b0d-a73d-41bf-ba82-02d45a91829c
CLOUDFLARE_D1_TOKEN=your_token_here
```

### Step 6: Test It!

```bash
npm run preview
```

Visit http://localhost:8788 and verify authentication works!

---

## ☁️ Part 2: Production Deployment Setup (5 minutes)

Now set your secrets in Cloudflare for production:

```bash
cd "Optimii Worker"

# Set each secret (Wrangler will prompt you to paste the value)
wrangler secret put CLERK_SECRET_KEY
# When prompted, paste your Clerk secret key and press Enter

wrangler secret put CLERK_WEBHOOK_SECRET
# Paste your webhook secret and press Enter

wrangler secret put RESEND_API_KEY
# Paste your Resend API key and press Enter

wrangler secret put RESEND_FROM_EMAIL
# Type your sender email and press Enter
```

### Verify Secrets Are Set

```bash
wrangler secret list
```

You should see:
```
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET  
RESEND_API_KEY
RESEND_FROM_EMAIL
```

### Deploy Your App

```bash
npm run build:cloudflare
npm run deploy
```

---

## 🔄 Updating Secrets Later

### Update Local Secrets
1. Edit `.dev.vars` file
2. Save
3. Restart your dev server: `npm run preview`

### Update Production Secrets
```bash
wrangler secret put SECRET_NAME
# Paste new value when prompted
```

---

## ❓ Troubleshooting

### "Missing webhook secret" error
- Make sure `CLERK_WEBHOOK_SECRET` is set in `.dev.vars` (local) or via `wrangler secret put` (production)

### "RESEND_API_KEY not configured" warning
- Check that `RESEND_API_KEY` is in your `.dev.vars` file
- Verify the key is valid at https://resend.com/api-keys

### Database connection errors
- Verify `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_DATABASE_ID` are correct
- Check that `CLOUDFLARE_D1_TOKEN` has D1 permissions

---

## 🔒 Security Reminders

- ✅ `.dev.vars` is gitignored - it will NEVER commit to GitHub
- ✅ Example files (`.dev.vars.example`) only contain fake placeholder values
- ✅ Production secrets are encrypted in Cloudflare's secure vault
- ❌ Never share your `.dev.vars` file or paste secrets in chat/issues
- ❌ Never commit files containing `sk_`, `re_`, `whsec_` tokens

---

## ✅ Done!

You're all set! Your secrets are now:
- 🏠 Stored locally in `.dev.vars` (gitignored)
- ☁️ Stored securely in Cloudflare (encrypted)
- 🔒 Never exposed in source control

Happy building! 🚀

