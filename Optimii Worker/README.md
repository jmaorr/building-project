# Optimii

A modern project tracker for home builds and renovations. Track progress, manage files, and coordinate with your building team in one place.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Auth:** Clerk
- **Database:** Cloudflare D1 (via Drizzle ORM)
- **Deployment:** Cloudflare Pages (via OpenNext)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- A [Clerk](https://clerk.com) account (for authentication)
- A [Cloudflare](https://cloudflare.com) account (for deployment)

### Installation

1. Clone the repository and install dependencies:

```bash
cd optimii
npm install
```

2. Set up your local development secrets:

```bash
# Copy the example file
cp .dev.vars.example .dev.vars

# Edit .dev.vars with your actual secret values (see Secrets Management section below)
```

3. Start the development server:

```bash
npm run preview  # For Cloudflare Workers preview (recommended)
# or
npm run dev      # For Next.js dev server
```

4. Open [http://localhost:8788](http://localhost:8788) (Wrangler preview) or [http://localhost:3000](http://localhost:3000) (Next.js dev) in your browser.

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Clerk auth pages (sign-in, sign-up)
│   ├── (dashboard)/         # Authenticated app shell
│   │   ├── layout.tsx       # AppShell wrapper
│   │   ├── page.tsx         # Dashboard home
│   │   ├── projects/        # Projects pages
│   │   ├── contacts/        # Contacts pages
│   │   └── settings/        # Settings pages
│   ├── globals.css          # Design tokens + Tailwind
│   └── layout.tsx           # Root (providers)
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── layout/              # AppShell, Sidebar, Header
│   ├── providers/           # Theme, Brand, Clerk providers
│   ├── command-palette.tsx  # ⌘K global search/actions
│   └── theme-toggle.tsx     # Light/dark mode toggle
├── lib/
│   ├── db/                  # Drizzle schema + client
│   └── utils.ts             # cn() helper
└── middleware.ts            # Clerk route protection
```

## Design System

### Theming

The app supports light and dark themes with system preference detection:

- Toggle using the sun/moon icon in the header
- Press `⌘K` to open command palette and switch themes
- Themes persist via localStorage

### Custom Branding

Organizations can customize their accent color:

```tsx
// Set brand color programmatically
import { useBrand } from "@/components/providers";

const { setBrand } = useBrand();
setBrand({ accentColor: "#5e6ad2" });
```

### CSS Variables

Key design tokens in `globals.css`:

| Token | Light | Dark |
|-------|-------|------|
| `--background` | `#ffffff` | `#0d0d0d` |
| `--foreground` | `#171717` | `#ededed` |
| `--brand` | `#5e6ad2` | `#5e6ad2` |

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint

# Cloudflare deployment
npm run build:cloudflare  # Build for Cloudflare Pages
npm run preview           # Preview with Wrangler
npm run deploy            # Deploy to Cloudflare

# Database
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio
```

## Secrets Management

### Local Development

All sensitive credentials are stored in `.dev.vars` (gitignored) for local development:

1. **Copy the template:**
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. **Get your secrets from each service:**
   - **Clerk:** https://dashboard.clerk.com → Your App → API Keys
     - `CLERK_SECRET_KEY` (starts with `sk_test_` or `sk_live_`)
     - `CLERK_WEBHOOK_SECRET` (in Webhooks tab, starts with `whsec_`)
   - **Resend:** https://resend.com/api-keys
     - `RESEND_API_KEY` (starts with `re_`)
     - `RESEND_FROM_EMAIL` (your verified sender email)
   - **Cloudflare:** https://dash.cloudflare.com
     - `CLOUDFLARE_ACCOUNT_ID` (in URL or right sidebar)
     - `CLOUDFLARE_DATABASE_ID` (Workers & Pages → D1 → your database)
     - `CLOUDFLARE_D1_TOKEN` (My Profile → API Tokens → Create Token)

3. **Edit `.dev.vars`** and paste your actual secret values

4. **Run the preview server:**
   ```bash
   npm run preview
   ```

### Production Deployment

For production, secrets are stored securely in Cloudflare (not in files or git):

1. **Set each secret using Wrangler CLI:**
   ```bash
   wrangler secret put CLERK_SECRET_KEY
   # Wrangler will prompt: "Enter a secret value:" - paste your secret
   
   wrangler secret put CLERK_WEBHOOK_SECRET
   wrangler secret put RESEND_API_KEY
   wrangler secret put RESEND_FROM_EMAIL
   ```

2. **Verify secrets are set:**
   ```bash
   wrangler secret list
   ```

3. **Deploy your app:**
   ```bash
   npm run build:cloudflare
   npm run deploy
   ```

### Updating Secrets

- **Local:** Edit `.dev.vars` and restart your dev server
- **Production:** Run `wrangler secret put SECRET_NAME` again with the new value

### Security Notes

- ✅ `.dev.vars` is gitignored and never committed
- ✅ Production secrets are encrypted in Cloudflare
- ✅ Publishable keys (in `wrangler.toml`) are safe to commit
- ❌ Never commit secret keys (those starting with `sk_`, `re_`, `whsec_`, etc.)

## Deployment to Cloudflare

1. Create a D1 database:

```bash
npx wrangler d1 create optimii-db
```

2. Update `wrangler.toml` with your database ID.

3. Set production secrets (see Secrets Management section above).

4. Deploy:

```bash
npm run build:cloudflare
npm run deploy
```

## Development Notes

- Authentication is bypassed in development mode for easier testing
- The sidebar is visible on screens ≥1024px (lg breakpoint)
- Command palette opens with `⌘K` (or `Ctrl+K` on Windows)

## Future Development

- [ ] Database schema for projects/phases/users
- [ ] File upload functionality (Cloudflare R2)
- [ ] Contact/invitation system
- [ ] Permissions and role management
- [ ] Project CRUD operations

## License

Private - All rights reserved.
