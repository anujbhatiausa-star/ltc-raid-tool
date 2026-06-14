-- =============================================================
-- LTC RAID Management Tool — Supabase schema
-- Run once in the Supabase SQL editor (idempotent via IF NOT EXISTS)
-- =============================================================

-- =============================================================
-- TABLES
-- =============================================================

create table if not exists raid_items (
  id            uuid        primary key default gen_random_uuid(),
  category      text        not null check (category in ('R','A','I','D')),
  title         text        not null,
  description   text,
  mitigation    text,
  stage         text        not null check (stage in ('Quoting','CPQ','Order Management','Fulfilment','Billing','Collections')),
  workstream    text        not null check (workstream in ('CPQ','Order Mgmt','Billing','Collections','Integration','Data Migration','Reporting')),
  owner         text        not null,
  priority      text        not null check (priority in ('Critical','High','Medium','Low')),
  status        text        not null default 'Open' check (status in ('Open','In Progress','Escalated','Resolved','Closed')),
  likelihood    int         default 3 check (likelihood between 1 and 5),
  impact_score  int         default 3 check (impact_score between 1 and 5),
  business_impact text,
  due_date      date,
  created_by    uuid        references auth.users(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  resolved_at   timestamptz,
  audit_log     jsonb       default '[]'::jsonb
);

create table if not exists comments (
  id            uuid        primary key default gen_random_uuid(),
  raid_item_id  uuid        not null references raid_items(id) on delete cascade,
  user_id       uuid        references auth.users(id),
  user_name     text,
  text          text        not null,
  created_at    timestamptz default now()
);

create table if not exists change_log (
  id            uuid        primary key default gen_random_uuid(),
  raid_item_id  uuid        not null references raid_items(id) on delete cascade,
  field         text,
  old_value     text,
  new_value     text,
  changed_by    text,
  changed_at    timestamptz default now()
);

create table if not exists profiles (
  id   uuid primary key references auth.users(id),
  name text,
  role text default 'viewer' check (role in ('pm','exec','viewer'))
);


-- =============================================================
-- INDEXES
-- =============================================================

-- Primary filter axes
create index if not exists idx_raid_items_category    on raid_items (category);
create index if not exists idx_raid_items_stage       on raid_items (stage);
create index if not exists idx_raid_items_workstream  on raid_items (workstream);
create index if not exists idx_raid_items_priority    on raid_items (priority);
create index if not exists idx_raid_items_status      on raid_items (status);

-- Dashboard heatmap and matrix queries
create index if not exists idx_raid_items_likelihood  on raid_items (likelihood);
create index if not exists idx_raid_items_impact      on raid_items (impact_score);

-- Due-date timeline and escalation sorts
create index if not exists idx_raid_items_due_date    on raid_items (due_date);
create index if not exists idx_raid_items_created_at  on raid_items (created_at desc);

-- FK lookups for comments and change log
create index if not exists idx_comments_raid_item_id  on comments (raid_item_id);
create index if not exists idx_change_log_raid_item   on change_log (raid_item_id);
create index if not exists idx_change_log_changed_at  on change_log (changed_at desc);


-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

alter table raid_items  enable row level security;
alter table comments    enable row level security;
alter table change_log  enable row level security;
alter table profiles    enable row level security;

-- raid_items -------------------------------------------------------
create policy "raid_select_all"
  on raid_items for select using (true);

create policy "raid_insert_pm"
  on raid_items for insert
  with check (exists (
    select 1 from profiles where id = auth.uid() and role = 'pm'
  ));

create policy "raid_update_pm"
  on raid_items for update
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'pm'
  ));

create policy "raid_delete_pm"
  on raid_items for delete
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'pm'
  ));

-- comments ---------------------------------------------------------
create policy "comments_select_all"
  on comments for select using (true);

create policy "comments_insert_pm"
  on comments for insert
  with check (exists (
    select 1 from profiles where id = auth.uid() and role = 'pm'
  ));

-- change_log -------------------------------------------------------
create policy "change_log_select_all"
  on change_log for select using (true);

-- change_log written by service-role key only; no direct client writes

-- profiles ---------------------------------------------------------
create policy "profiles_select_own"
  on profiles for select using (auth.uid() = id);

create policy "profiles_update_own"
  on profiles for update using (auth.uid() = id);


-- =============================================================
-- TRIGGER — auto-update updated_at
-- =============================================================

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on raid_items;
create trigger set_updated_at
  before update on raid_items
  for each row execute function update_updated_at();


-- =============================================================
-- SEED DATA — 18 realistic LTC RAID items
-- Covers all 6 stages, all 4 categories (R/A/I/D),
-- varied priorities (Critical/High/Medium/Low) and statuses
-- =============================================================

insert into raid_items (
  id, category, title, description, mitigation,
  stage, workstream, owner, priority, status,
  likelihood, impact_score, business_impact, due_date,
  created_at, updated_at, resolved_at, audit_log
) values

-- ── QUOTING (3 items) ────────────────────────────────────────

(
  'a1000001-0000-0000-0000-000000000001',
  'R',
  'Legacy quoting data migration completeness risk',
  'Over 120,000 historical quotes exist in the legacy Oracle system. Initial data profiling shows 18% have missing product codes or corrupt pricing tiers that will not map cleanly to Salesforce CPQ price books. A failed migration could block go-live.',
  'Engage Data Migration workstream to run a full data quality assessment by end of Sprint 4. Establish a data cleansing backlog with clear ownership. Define a cut-off date for legacy quote migration and agree with business on handling of in-flight quotes.',
  'Quoting', 'Data Migration', 'Priya Nair',
  'Critical', 'Escalated',
  4, 5,
  'Go-live delay of 6–8 weeks and $2M in rework costs if data migration fails. Revenue recognition impact on open quotes.',
  '2026-07-15',
  '2026-05-10 09:00:00+00', '2026-06-01 14:30:00+00', null,
  '[{"action":"status_changed","from":"Open","to":"Escalated","by":"Anuj Bhatia","at":"2026-06-01T14:30:00Z"}]'
),

(
  'a1000001-0000-0000-0000-000000000002',
  'A',
  'Product catalog is clean and fully attributed prior to CPQ configuration',
  'The programme is assuming the product catalog handed over from the business will have complete, accurate attributes (pricing, eligibility rules, bundling logic) before CPQ configuration begins in Sprint 3.',
  'Schedule a product catalog review workshop with Product Management and Pricing teams before Sprint 3 kick-off. Document any gaps as formal requirements. Do not begin CPQ configuration until catalog sign-off is received.',
  'Quoting', 'CPQ', 'James Whitfield',
  'High', 'Open',
  3, 4,
  'Incomplete catalog will force CPQ reconfiguration mid-sprint, adding 3–4 weeks to the CPQ workstream.',
  '2026-06-30',
  '2026-05-12 10:00:00+00', '2026-05-12 10:00:00+00', null,
  '[]'
),

(
  'a1000001-0000-0000-0000-000000000003',
  'D',
  'Decision: Adopt Salesforce CPQ over bespoke quoting engine',
  'Steering committee evaluated three options: (1) extend the legacy Oracle quoting engine, (2) build a custom quoting microservice, (3) adopt Salesforce CPQ. A decision is required to unlock CPQ licensing and begin vendor configuration.',
  null,
  'Quoting', 'CPQ', 'Anuj Bhatia',
  'High', 'Resolved',
  null, null,
  'Delay in decision blocks CPQ workstream start and compresses the overall delivery timeline by up to 6 weeks.',
  '2026-05-01',
  '2026-04-20 08:00:00+00', '2026-04-30 16:00:00+00', '2026-04-30 16:00:00+00',
  '[{"action":"status_changed","from":"Open","to":"Resolved","by":"Steering Committee","at":"2026-04-30T16:00:00Z","note":"Decision approved: Salesforce CPQ selected. Licences to be procured by 2026-05-07."}]'
),

-- ── CPQ (3 items) ─────────────────────────────────────────────

(
  'a1000001-0000-0000-0000-000000000004',
  'R',
  'CPQ pricing rule complexity significantly underestimated',
  'Discovery revealed 340 active discount schedules, 27 partner tiers, and 14 regional pricing overrides that must be replicated in Salesforce CPQ. The original estimate assumed fewer than 100 pricing rules. Current velocity suggests this workstream will overrun by 3 sprints.',
  'Re-baseline the CPQ workstream plan. Prioritise rules by revenue volume — top 80% of revenue covered by approximately 40 rules. Defer long-tail rules to Phase 2. Bring in a second CPQ consultant to absorb capacity.',
  'CPQ', 'CPQ', 'Sandra Okafor',
  'High', 'In Progress',
  4, 4,
  'CPQ overrun delays downstream Order Management and Billing configuration. Estimated $800K additional delivery cost.',
  '2026-07-31',
  '2026-05-20 11:00:00+00', '2026-06-05 09:15:00+00', null,
  '[{"action":"priority_changed","from":"Medium","to":"High","by":"Anuj Bhatia","at":"2026-06-05T09:15:00Z"}]'
),

(
  'a1000001-0000-0000-0000-000000000005',
  'I',
  'CPQ full sandbox environment unavailable — blocking parallel configuration tracks',
  'The Salesforce CPQ full sandbox has been unavailable since 2026-05-28 due to an org refresh failure. Three configuration workstreams (pricing rules, guided selling, approval workflows) are blocked. Salesforce Support ticket #SF-4421987 raised, SLA breach confirmed.',
  'Escalate to Salesforce account executive immediately. Use partial sandbox for non-CPQ config tracks in the interim. Reschedule blocked CPQ sprints to avoid compressing testing phase. Document all delayed tasks for sprint recovery plan.',
  'CPQ', 'CPQ', 'Ravi Subramaniam',
  'Critical', 'Escalated',
  5, 5,
  'Every day of sandbox unavailability delays 3 parallel workstreams. At current rate, 10 days lost = 3-week schedule impact.',
  '2026-06-20',
  '2026-05-28 14:00:00+00', '2026-06-03 08:00:00+00', null,
  '[{"action":"status_changed","from":"Open","to":"Escalated","by":"Anuj Bhatia","at":"2026-06-03T08:00:00Z"},{"action":"comment_added","by":"Ravi Subramaniam","at":"2026-06-04T10:00:00Z","note":"Salesforce SE engaged. Refresh expected by 2026-06-10."}]'
),

(
  'a1000001-0000-0000-0000-000000000006',
  'A',
  'Discount approval workflow in Salesforce CPQ mirrors current delegated authority matrix',
  'Programme assumes the existing four-tier discount approval matrix (Sales Rep → Sales Manager → Regional VP → CFO) will be replicated as-is in the CPQ approval workflow, with no changes to thresholds or approvers.',
  'Obtain written sign-off from Sales Operations and Finance on the approval matrix before CPQ workflow build begins. Flag any proposed changes as a scope change request.',
  'CPQ', 'CPQ', 'James Whitfield',
  'Low', 'Open',
  2, 2,
  'If approval matrix changes mid-build, CPQ workflow will require rework estimated at 1–2 sprints.',
  '2026-06-25',
  '2026-05-15 09:30:00+00', '2026-05-15 09:30:00+00', null,
  '[]'
),

-- ── ORDER MANAGEMENT (3 items) ────────────────────────────────

(
  'a1000001-0000-0000-0000-000000000007',
  'R',
  'Order routing exception logic not fully mapped — 47 undocumented edge cases identified',
  'Process mapping workshops have surfaced 47 order routing edge cases (split shipments, partial fulfilment, multi-currency orders, regulatory holds) that are not covered by the standard Salesforce Order Management routing rules. Each requires bespoke configuration.',
  'Convene a 2-day exception mapping workshop with Order Management SMEs. Categorise edge cases by frequency and revenue impact. Configure top-priority cases in current sprint; raise change request for remainder. Target zero undocumented exceptions before SIT.',
  'Order Management', 'Order Mgmt', 'Claire Hennessy',
  'High', 'Open',
  3, 4,
  'Unhandled exceptions will cause manual order processing post-go-live, increasing cost-to-serve and SLA breach risk.',
  '2026-07-20',
  '2026-05-25 13:00:00+00', '2026-05-25 13:00:00+00', null,
  '[]'
),

(
  'a1000001-0000-0000-0000-000000000008',
  'I',
  'Order status sync between Salesforce OMS and SAP ERP failing intermittently',
  'Integration testing has identified that order status updates from SAP ERP are not reliably propagating back to Salesforce Order Management. Failure rate is approximately 12% in the current integration test environment. Root cause suspected to be message queue timeout under load.',
  'Integration team to conduct load testing to reproduce failure threshold. Review message queue timeout settings in MuleSoft integration layer. Implement dead-letter queue with automatic retry and alerting. Retest with 500 concurrent order updates.',
  'Order Management', 'Integration', 'Marcus Tan',
  'High', 'In Progress',
  4, 5,
  'A 12% sync failure rate in production would result in incorrect order statuses, customer complaints, and fulfilment delays affecting ~$4M of monthly order volume.',
  '2026-07-05',
  '2026-06-01 10:00:00+00', '2026-06-08 15:00:00+00', null,
  '[{"action":"status_changed","from":"Open","to":"In Progress","by":"Marcus Tan","at":"2026-06-08T15:00:00Z"}]'
),

(
  'a1000001-0000-0000-0000-000000000009',
  'D',
  'Decision: Use standard Salesforce Order object vs custom Order entity',
  'Architecture review identified that the standard Salesforce Order object lacks fields required for multi-line, multi-currency enterprise orders. Three options evaluated: (1) use standard Order with custom fields, (2) build a custom Order__c object, (3) use a managed package. Decision required before Order Management build begins.',
  null,
  'Order Management', 'Order Mgmt', 'Anuj Bhatia',
  'Medium', 'Resolved',
  null, null,
  'Wrong decision locks in technical debt or requires full rebuild. Estimated rebuild cost: $600K.',
  '2026-05-15',
  '2026-04-28 09:00:00+00', '2026-05-14 17:00:00+00', '2026-05-14 17:00:00+00',
  '[{"action":"status_changed","from":"Open","to":"Resolved","by":"Architecture Board","at":"2026-05-14T17:00:00Z","note":"Decision: Standard Order object with custom fields. Custom fields approved by Salesforce CoE. Architecture decision record filed."}]'
),

-- ── FULFILMENT (3 items) ──────────────────────────────────────

(
  'a1000001-0000-0000-0000-000000000010',
  'R',
  'Third-party fulfilment partner API delivery timeline at risk',
  'LogiTech Partners (third-party fulfilment provider) has indicated their API documentation will not be available until 2026-07-01, four weeks later than agreed in the contract. This compresses integration build and testing time for the Fulfilment workstream.',
  'Issue formal notice to LogiTech Partners citing contractual obligation. Engage legal to review SLA penalties. Begin API stub development to allow parallel integration testing. Escalate to Programme Sponsor if delivery date is not confirmed within 5 business days.',
  'Fulfilment', 'Integration', 'Claire Hennessy',
  'Medium', 'Open',
  3, 3,
  '4-week API delay reduces integration testing window from 6 weeks to 2 weeks, increasing defect escape risk at go-live.',
  '2026-07-10',
  '2026-06-02 11:00:00+00', '2026-06-02 11:00:00+00', null,
  '[]'
),

(
  'a1000001-0000-0000-0000-000000000011',
  'A',
  'Post-go-live fulfilment SLAs remain unchanged from current state',
  'The programme is operating on the assumption that current fulfilment SLAs (next-day for Priority, 3-day for Standard, 5-day for Economy) will remain in force post-go-live and do not need to be reconfigured in the new system.',
  'Obtain formal written confirmation from Operations Director that SLAs are unchanged. If any SLA changes are planned (e.g. due to new carrier contracts), raise as a scope change to ensure Salesforce configuration captures them.',
  'Fulfilment', 'Order Mgmt', 'Sandra Okafor',
  'High', 'Open',
  2, 4,
  'Incorrect SLA configuration will trigger automated breach alerts and penalties under customer contracts totalling ~$1.5M annually.',
  '2026-06-28',
  '2026-05-18 14:00:00+00', '2026-05-18 14:00:00+00', null,
  '[]'
),

(
  'a1000001-0000-0000-0000-000000000012',
  'I',
  'Fulfilment confirmation webhook not triggering order closure in Salesforce',
  'During SIT Round 1, fulfilment confirmation events sent by the warehouse management system (WMS) via webhook are not closing the corresponding Salesforce Order records. 100% failure rate observed across 45 test scenarios. Order records remain in "Activated" status indefinitely.',
  'Debug webhook payload mapping in MuleSoft. Confirm event schema matches Salesforce Order closure field triggers. Add end-to-end tracing to webhook pipeline. Rerun full SIT suite once fix is deployed to integration environment.',
  'Fulfilment', 'Integration', 'Marcus Tan',
  'Critical', 'In Progress',
  5, 5,
  'In production, unclosed orders block billing and revenue recognition. Could affect 100% of fulfilment transactions at go-live.',
  '2026-06-25',
  '2026-06-05 09:00:00+00', '2026-06-09 11:30:00+00', null,
  '[{"action":"status_changed","from":"Open","to":"In Progress","by":"Marcus Tan","at":"2026-06-09T11:30:00Z"},{"action":"comment_added","by":"Ravi Subramaniam","at":"2026-06-10T08:00:00Z","note":"Root cause identified: field mapping mismatch on fulfilment_status enum. Fix in dev, promoting to INT today."}]'
),

-- ── BILLING (3 items) ─────────────────────────────────────────

(
  'a1000001-0000-0000-0000-000000000013',
  'R',
  'Revenue recognition logic for multi-element arrangements not modelled in Salesforce Billing',
  'The company sells bundled arrangements (hardware + software + professional services) that require allocation of transaction price across performance obligations under IFRS 15. Salesforce Billing out-of-the-box does not support multi-element revenue recognition; a custom solution or ISV add-on is required.',
  'Engage Finance and external auditors to document all multi-element arrangement types. Evaluate Salesforce Revenue Cloud as a replacement. If Revenue Cloud is out of scope, define a manual recognition process as a bridge solution and raise a Phase 2 backlog item.',
  'Billing', 'Billing', 'Priya Nair',
  'Critical', 'Open',
  4, 5,
  'Non-compliant revenue recognition exposes the company to audit risk and potential restatement. Finance has flagged this as a hard blocker for go-live sign-off.',
  '2026-07-01',
  '2026-05-22 10:00:00+00', '2026-05-22 10:00:00+00', null,
  '[]'
),

(
  'a1000001-0000-0000-0000-000000000014',
  'I',
  'Invoice generation failing for bundle products in Salesforce Billing',
  'Salesforce Billing is failing to generate invoices for order lines that contain bundle products (parent + child product lines). Error: "Null reference on BillingSchedule.ProductId" observed in debug logs. Affects approximately 35% of order volume based on product mix analysis.',
  'Salesforce Support escalated to Tier 3 engineering (case #SF-4419023). Workaround: manually flatten bundle lines before billing run. Configure bundle product billing treatment as flat-rate on parent line. Retest with representative bundle catalogue.',
  'Billing', 'Billing', 'Sandra Okafor',
  'High', 'Escalated',
  5, 4,
  '35% invoice failure rate blocks month-end close and delays cash collection by at least 30 days, impacting working capital.',
  '2026-06-18',
  '2026-06-03 14:30:00+00', '2026-06-07 09:00:00+00', null,
  '[{"action":"status_changed","from":"Open","to":"Escalated","by":"Anuj Bhatia","at":"2026-06-07T09:00:00Z"},{"action":"comment_added","by":"Sandra Okafor","at":"2026-06-08T10:00:00Z","note":"Salesforce confirmed bug in CPQ-Billing bundle pass-through. Patch expected in next managed package release (v242.6)."}]'
),

(
  'a1000001-0000-0000-0000-000000000015',
  'D',
  'Decision required: consolidated vs itemised billing format for enterprise accounts',
  'Enterprise accounts (>$1M ARR) have requested consolidated invoices that aggregate all order lines across a billing period into a single document. Current Salesforce Billing configuration generates one invoice per order. Both approaches are technically feasible but require different data models. A decision is needed before billing configuration is finalised.',
  null,
  'Billing', 'Billing', 'Anuj Bhatia',
  'High', 'Open',
  null, null,
  'Choosing the wrong format requires a billing data model change post-go-live, affecting all invoice templates and reporting. Estimated rework: 4 weeks.',
  '2026-06-20',
  '2026-06-01 08:00:00+00', '2026-06-01 08:00:00+00', null,
  '[]'
),

-- ── COLLECTIONS (3 items) ─────────────────────────────────────

(
  'a1000001-0000-0000-0000-000000000016',
  'R',
  'Collections dunning sequence not aligned with legal requirements in UK, Germany, and Australia',
  'The configured dunning sequence (Day 1, Day 7, Day 14, Day 30 — final demand) does not comply with statutory notice periods for late payment in the UK (Late Payment of Commercial Debts Act), Germany (BGB § 286), and Australia (PPSA). Legal review flagged this in Sprint 8.',
  'Engage in-country legal counsel for UK, Germany, and Australia to confirm compliant dunning schedules. Configure region-specific dunning plans in Salesforce Billing Collections. Do not execute live dunning runs until legal sign-off is received for each region.',
  'Collections', 'Collections', 'Claire Hennessy',
  'Medium', 'In Progress',
  3, 4,
  'Non-compliant dunning could expose the company to legal challenges, void debt collection actions, and regulatory fines in affected jurisdictions.',
  '2026-07-08',
  '2026-05-30 11:00:00+00', '2026-06-06 14:00:00+00', null,
  '[{"action":"status_changed","from":"Open","to":"In Progress","by":"Claire Hennessy","at":"2026-06-06T14:00:00Z"}]'
),

(
  'a1000001-0000-0000-0000-000000000017',
  'A',
  'Payment gateway integration (Stripe) is in scope for Phase 1',
  'The programme plan includes automated payment collection via Stripe integration with Salesforce Billing. However, the original scope document references "payment gateway TBD" and no Stripe contract has been signed. The assumption is that Stripe will be confirmed as the gateway and integration will be delivered in Phase 1.',
  'Obtain written confirmation from CFO and Procurement that Stripe is the selected gateway and that the contract will be executed by 2026-06-15. If gateway selection is delayed past this date, defer automated collections to Phase 2 and plan for manual payment processing at go-live.',
  'Collections', 'Billing', 'Priya Nair',
  'Medium', 'Open',
  3, 3,
  'If gateway is deferred to Phase 2, manual collections processing will be required for an estimated 3–4 months, adding operational cost and increasing DSO.',
  '2026-06-15',
  '2026-05-28 09:00:00+00', '2026-05-28 09:00:00+00', null,
  '[]'
),

(
  'a1000001-0000-0000-0000-000000000018',
  'I',
  'Collections team Salesforce permission set incorrectly scoped — UAT access issues resolved',
  'During UAT, the Collections team (12 users) could not access the Debt Management console due to a missing object-level permission on the "Collections Case" custom object in the Collections_Agent permission set. All affected users were blocked for 2 days.',
  'Permission set updated to include Read/Edit/Create on Collections_Case and related objects. All 12 users re-tested and confirmed access restored. Root cause: permission set was cloned from a Billing Agent template that predated the Collections module build.',
  'Collections', 'Collections', 'Ravi Subramaniam',
  'Low', 'Closed',
  null, null,
  'Resolved. No production impact. UAT timeline recovered within same sprint.',
  null,
  '2026-06-04 15:00:00+00', '2026-06-06 10:00:00+00', '2026-06-06 10:00:00+00',
  '[{"action":"status_changed","from":"Open","to":"Closed","by":"Ravi Subramaniam","at":"2026-06-06T10:00:00Z","note":"Access confirmed for all 12 Collections UAT users. Permission set updated and pushed to UAT org."}]'
);


-- =============================================================
-- SEED — sample change_log entries for traceability demo
-- =============================================================

insert into change_log (id, raid_item_id, field, old_value, new_value, changed_by, changed_at) values
(
  'b2000001-0000-0000-0000-000000000001',
  'a1000001-0000-0000-0000-000000000001',
  'status', 'Open', 'Escalated', 'Anuj Bhatia', '2026-06-01 14:30:00+00'
),
(
  'b2000001-0000-0000-0000-000000000002',
  'a1000001-0000-0000-0000-000000000004',
  'priority', 'Medium', 'High', 'Anuj Bhatia', '2026-06-05 09:15:00+00'
),
(
  'b2000001-0000-0000-0000-000000000003',
  'a1000001-0000-0000-0000-000000000005',
  'status', 'Open', 'Escalated', 'Anuj Bhatia', '2026-06-03 08:00:00+00'
),
(
  'b2000001-0000-0000-0000-000000000004',
  'a1000001-0000-0000-0000-000000000008',
  'status', 'Open', 'In Progress', 'Marcus Tan', '2026-06-08 15:00:00+00'
),
(
  'b2000001-0000-0000-0000-000000000005',
  'a1000001-0000-0000-0000-000000000012',
  'status', 'Open', 'In Progress', 'Marcus Tan', '2026-06-09 11:30:00+00'
),
(
  'b2000001-0000-0000-0000-000000000006',
  'a1000001-0000-0000-0000-000000000014',
  'status', 'Open', 'Escalated', 'Anuj Bhatia', '2026-06-07 09:00:00+00'
),
(
  'b2000001-0000-0000-0000-000000000007',
  'a1000001-0000-0000-0000-000000000016',
  'status', 'Open', 'In Progress', 'Claire Hennessy', '2026-06-06 14:00:00+00'
),
(
  'b2000001-0000-0000-0000-000000000008',
  'a1000001-0000-0000-0000-000000000018',
  'status', 'Open', 'Closed', 'Ravi Subramaniam', '2026-06-06 10:00:00+00'
);


-- =============================================================
-- SEED — sample comments for three high-visibility items
-- =============================================================

-- =============================================================
-- DEPENDENCIES — which items must be resolved before this one
-- =============================================================
ALTER TABLE raid_items ADD COLUMN IF NOT EXISTS depends_on uuid[] DEFAULT '{}';


-- =============================================================
-- SEED — sample comments for three high-visibility items
-- =============================================================

insert into comments (id, raid_item_id, user_name, text, created_at) values
(
  'c3000001-0000-0000-0000-000000000001',
  'a1000001-0000-0000-0000-000000000001',
  'Anuj Bhatia',
  'Escalated to Steering Committee. Data Migration lead to present remediation plan at next programme board on 2026-06-12.',
  '2026-06-01 14:35:00+00'
),
(
  'c3000001-0000-0000-0000-000000000002',
  'a1000001-0000-0000-0000-000000000005',
  'Ravi Subramaniam',
  'Salesforce SE has been engaged directly. Sandbox refresh is scheduled for 2026-06-10 at 06:00 UTC. All blocked tasks will resume immediately after validation.',
  '2026-06-04 10:00:00+00'
),
(
  'c3000001-0000-0000-0000-000000000003',
  'a1000001-0000-0000-0000-000000000012',
  'Marcus Tan',
  'Root cause confirmed: fulfilment_status enum mismatch between WMS webhook payload ("FULFILLED") and Salesforce expected value ("Fulfilled"). Fix deployed to INT environment. Regression test running now.',
  '2026-06-10 08:00:00+00'
),
(
  'c3000001-0000-0000-0000-000000000004',
  'a1000001-0000-0000-0000-000000000013',
  'Priya Nair',
  'External auditors (KPMG) have confirmed this is a hard gate for go-live. Revenue Cloud evaluation to begin 2026-06-16. Interim manual recognition process documented and approved by Finance Controller.',
  '2026-06-08 11:00:00+00'
),
(
  'c3000001-0000-0000-0000-000000000005',
  'a1000001-0000-0000-0000-000000000014',
  'Sandra Okafor',
  'Salesforce confirmed this is a known bug in CPQ-Billing bundle pass-through (Known Issue KI-201847). Patch included in managed package v242.6, expected release 2026-06-17. Workaround of flattening bundles pre-billing run is in place for UAT.',
  '2026-06-08 10:00:00+00'
);
