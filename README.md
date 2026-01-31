# Reimbursement System

A full-stack reimbursement management system migrated to Next.js App Router, using Prisma for database management and Supabase for Authentication.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: Supabase Auth (@supabase/ssr)
- **Styling**: Vanilla CSS + Tailwind CSS 4 (PostCSS)
- **Icons**: Lucide React

## Features

- **Personal Reimbursement**: Submit claims for travel, meals, and other expenses.
- **Vendor Payment**: Request payments for registered vendors.
- **Service Payment**: Submit labor service remuneration requests.
- **Approval Workflow**: Multi-stage approval (Department Manager -> Finance).
- **Vendor Management**: Request-based vendor addition and updates.
- **Admin Tools**: User management with role-based permissions.

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Supabase project

### Setup

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   yarn install
   ```
3. **Configure environment variables**:
   Copy `.env.example` to `.env` and fill in your database and Supabase credentials.
4. **Initialize database**:
   ```bash
   yarn prisma generate
   yarn prisma db push
   yarn prisma:seed # If available in package.json
   ```
5. **Run the development server**:
   ```bash
   yarn dev
   ```

## Project Structure

- `src/app`: Next.js App Router (Pages & API Routes)
- `src/app/actions`: Server Actions for data mutations
- `src/components`: UI components
- `src/lib`: Shared library instances (Prisma, etc.)
- `src/types`: TypeScript definitions
- `prisma`: Database schema and migrations
- `legacy-spa`: Older React application (for reference)

## Contributing

Please follow the directory structure and use Server Actions for data mutations. Ensure type safety by running `yarn tsc --noEmit` before submitting changes.
