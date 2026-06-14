# LTC RAID Management Tool

A full-stack RAID (Risks, Assumptions, Issues, Decisions) management tool built for a Lead to Cash enterprise transformation program.

## Tech Stack
- **Frontend**: React 18 + Tailwind CSS + Vite (hosted on Vercel)
- **Backend**: Node.js + Express REST API (hosted on Render)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (JWT, role-based)
- **AI**: OpenAI GPT-4o

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project
- An OpenAI API key

### Setup

1. Clone the repo
2. Run the schema: copy `supabase/schema.sql` into the Supabase SQL editor and execute
3. Configure environment variables (see `.env.example`)
4. Install and run the server: `cd server && npm install && npm run dev`
5. Install and run the client: `cd client && npm install && npm run dev`

## Demo Credentials
- PM: `pm@ltc-demo.com` / `Demo@1234`
- Exec: `exec@ltc-demo.com` / `Demo@1234`
