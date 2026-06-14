# CLAUDE.md — LTC RAID Management Tool

## Project overview
A full-stack RAID (Risks, Assumptions, Issues, Decisions) management
tool built specifically for a Lead to Cash (LTC) enterprise
transformation program. This is a professional portfolio/demo project
built by Anuj Bhatia (Project Manager) to showcase program governance
capability during interviews and client engagements.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Tailwind CSS + Vite |
| Backend | Node.js + Express REST API |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT, role-based) |
| AI | OpenAI GPT-4o API |
| Frontend hosting | Vercel |
| Backend hosting | Render |
| Source control | GitHub (monorepo) |

---

## Monorepo structure

```
ltc-raid-tool/
├── CLAUDE.md                  ← you are here
├── README.md
├── .env.example
├── client/                    ← React frontend (Vercel)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── TopBar.jsx
│   │   │   ├── raid/
│   │   │   │   ├── RAIDTable.jsx
│   │   │   │   ├── RAIDForm.jsx
│   │   │   │   ├── RAIDCard.jsx
│   │   │   │   └── AuditLog.jsx
│   │   │   ├── dashboard/
│   │   │   │   ├── MetricCards.jsx
│   │   │   │   ├── PipelineView.jsx
│   │   │   │   ├── RiskHeatmap.jsx
│   │   │   │   ├── PriorityMatrix.jsx
│   │   │   │   └── EscalationTimeline.jsx
│   │   │   └── ai/
│   │   │       ├── ExecBriefing.jsx
│   │   │       └── MitigationSuggest.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── RAIDLog.jsx
│   │   │   ├── Decisions.jsx
│   │   │   └── Reports.jsx
│   │   ├── hooks/
│   │   │   ├── useRAID.js
│   │   │   ├── useAuth.js
│   │   │   └── useAI.js
│   │   ├── lib/
│   │   │   ├── supabase.js
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── server/                    ← Express API (Render)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── raid.js
│   │   │   ├── auth.js
│   │   │   ├── ai.js
│   │   │   └── reports.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── errorHandler.js
│   │   ├── services/
│   │   │   ├── supabase.js
│   │   │   └── openai.js
│   │   └── index.js
│   └── package.json
└── supabase/
    └── schema.sql             ← run once in Supabase SQL editor
```

---

## Database schema (Supabase)

### raid_items
```sql
create table raid_items (
  id uuid primary key default gen_random_uuid(),
  category text check (category in ('R','A','I','D')) not null,
  title text not null,
  description text,
  mitigation text,
  stage text not null,
  workstream text not null,
  owner text not null,
  priority text check (priority in ('Critical','High','Medium','Low')) not null,
  status text check (status in ('Open','In Progress','Escalated','Resolved','Closed')) not null default 'Open',
  likelihood int check (likelihood between 1 and 5) default 3,
  impact_score int check (impact_score between 1 and 5) default 3,
  business_impact text,
  due_date date,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  resolved_at timestamptz,
  audit_log jsonb default '[]'::jsonb
);
```

### comments
```sql
create table comments (
  id uuid primary key default gen_random_uuid(),
  raid_item_id uuid references raid_items(id) on delete cascade,
  user_id uuid references auth.users(id),
  user_name text,
  text text not null,
  created_at timestamptz default now()
);
```

### change_log
```sql
create table change_log (
  id uuid primary key default gen_random_uuid(),
  raid_item_id uuid references raid_items(id) on delete cascade,
  field text,
  old_value text,
  new_value text,
  changed_by text,
  changed_at timestamptz default now()
);
```

### profiles
```sql
create table profiles (
  id uuid primary key references auth.users(id),
  name text,
  role text check (role in ('pm','exec','viewer')) default 'viewer'
);
```

### Row Level Security
```sql
alter table raid_items enable row level security;
alter table comments enable row level security;
alter table change_log enable row level security;
alter table profiles enable row level security;

-- PM and exec can read all
create policy "read_all" on raid_items for select using (true);
create policy "read_all" on comments for select using (true);
create policy "read_all" on change_log for select using (true);
create policy "read_own_profile" on profiles for select using (auth.uid() = id);

-- Only PM role can insert/update/delete
create policy "pm_write" on raid_items for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'pm'));
```

---

## Environment variables

### client/.env
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=https://your-app.onrender.com
```

### server/.env
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
PORT=3001
CLIENT_URL=https://your-app.vercel.app
```

---

## LTC domain constants

### Stages (in order)
1. Quoting
2. CPQ
3. Order Management
4. Fulfilment
5. Billing
6. Collections

### Workstreams
- CPQ
- Order Mgmt
- Billing
- Collections
- Integration
- Data Migration
- Reporting

### RAID categories
- R = Risk
- A = Assumption
- I = Issue
- D = Decision

### Priority levels
- Critical (red)
- High (amber)
- Medium (blue)
- Low (green)

### Status values
- Open
- In Progress
- Escalated
- Resolved
- Closed

---

## User roles

| Role | Access |
|---|---|
| pm | Full CRUD on all RAID items, add comments, view audit log, generate AI reports |
| exec | Read-only dashboard and reports, no editing |
| viewer | Read-only RAID table, no reports |

### Demo login credentials (seed in Supabase Auth)
- PM: `pm@ltc-demo.com` / `Demo@1234`
- Exec: `exec@ltc-demo.com` / `Demo@1234`

---

## API routes (Express)

### RAID
```
GET    /api/raid              — get all items (with filters)
GET    /api/raid/:id          — get single item + comments + changelog
POST   /api/raid              — create item
PUT    /api/raid/:id          — update item (logs change)
DELETE /api/raid/:id          — delete item (pm only)
PATCH  /api/raid/bulk-status  — bulk update status
```

### AI
```
POST   /api/ai/exec-briefing     — generate exec summary from open items
POST   /api/ai/suggest-mitigation — suggest mitigation for a risk
POST   /api/ai/weekly-digest     — generate stakeholder email draft
```

### Reports
```
GET    /api/reports/export-csv   — download all items as CSV
GET    /api/reports/export-pdf   — generate PDF exec summary
```

---

## AI features (OpenAI GPT-4o)

### Exec briefing prompt template
```
You are a senior program manager for a Lead to Cash transformation 
program. Based on the following open RAID items, write a concise 
3-paragraph executive briefing suitable for a steering committee.
Cover: (1) current risk posture, (2) top 3 items needing exec 
decision or action, (3) recommended next steps.
Be direct, business-focused, and avoid technical jargon.
Tone: professional, confident, clear.

RAID DATA:
{json of open critical/high items}
```

### Mitigation suggestion prompt template
```
You are an expert project manager specialising in Lead to Cash 
Salesforce transformations. A new risk has been identified:

Title: {title}
Stage: {stage}
Workstream: {workstream}
Description: {description}

Suggest a practical mitigation strategy in 2-3 sentences. 
Be specific to the LTC domain. No bullet points.
```

### Weekly digest prompt template
```
You are a project manager writing a weekly stakeholder update email
for a Lead to Cash transformation program.

Program status summary:
- Total items: {total}
- Critical/Escalated: {critical}
- Resolved this week: {resolved}
- Upcoming due dates: {due_soon}

Write a professional 3-paragraph update email with subject line.
Tone: confident, transparent, action-oriented.
```

---

## UI design rules

- Dark sidebar (#1e2433) with white icons and text
- Clean white content area
- No gradients, no shadows — flat design
- Font: Inter (Google Fonts)
- Status badges: colour coded pills (red/amber/blue/green/gray)
- Pipeline view: horizontal swimlane, clickable to filter
- Heatmap: 5x5 grid, green → red based on likelihood × impact
- All tables: sortable columns, row hover highlight
- Mobile responsive — sidebar collapses to hamburger on small screens

---

## Deployment checklist

### Supabase
- [ ] Create new project
- [ ] Run supabase/schema.sql in SQL editor
- [ ] Create demo users in Auth > Users
- [ ] Insert demo profile rows with roles
- [ ] Copy URL and anon/service keys to .env files

### GitHub
- [ ] Create repo: ltc-raid-tool
- [ ] Push monorepo
- [ ] Add branch protection on main

### Vercel
- [ ] Import GitHub repo
- [ ] Set root directory to /client
- [ ] Add VITE_* environment variables
- [ ] Deploy

### Render
- [ ] New Web Service from GitHub repo
- [ ] Set root directory to /server
- [ ] Build command: npm install
- [ ] Start command: node src/index.js
- [ ] Add environment variables
- [ ] Deploy

---

## Session instructions for Claude Code

- Always check this CLAUDE.md before starting any task
- Keep client and server concerns strictly separated
- Always log changes to the change_log table when a RAID item is updated
- Never hardcode credentials — always use process.env
- After any schema change, update the schema.sql file
- When adding a new page, add the route to App.jsx and a nav item to Sidebar.jsx
- Use React Query for all data fetching on the frontend
- All API calls go through client/src/lib/api.js — never call Supabase directly from components
- Keep OpenAI calls server-side only — never expose the API key to the client
- When in doubt about LTC domain terminology, refer to the domain constants section above

---

## Current build status

- [ ] Monorepo structure created
- [ ] Supabase schema deployed
- [ ] Express API scaffolded
- [ ] Auth middleware working
- [ ] RAID CRUD endpoints complete
- [ ] React app scaffolded
- [ ] Login page complete
- [ ] Dashboard page complete
- [ ] RAID log page complete
- [ ] Decisions page complete
- [ ] AI briefing feature complete
- [ ] PDF export complete
- [ ] Deployed to Vercel + Render
- [ ] Demo data seeded

Update this checklist as you complete each step.
