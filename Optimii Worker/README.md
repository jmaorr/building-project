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

2. Set up environment variables. Create a `.env.local` file:

```bash
# Clerk Authentication
# Get these from https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

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

## Deployment to Cloudflare

1. Create a D1 database:

```bash
npx wrangler d1 create optimii-db
```

2. Update `wrangler.toml` with your database ID.

3. Set environment variables in Cloudflare dashboard:
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

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
