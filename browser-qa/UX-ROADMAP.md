# HPL CRM — UX Roadmap (Phase 6 browser QA)

## 1. Manager workflow (priority 1)

| Problem | Proposal | Components | Regression risk | Done when |
|--------|----------|------------|-----------------|-----------|
| Create lead modal uses hard `bg-white` / `slate-*` | Map to `bg-card`, `text-foreground`, `border-border` on modal shell | `create-lead-modal.tsx` | Low visual | Dark mode parity in modal + Playwright screenshot |
| Qualification + manager note + calculation request on one long page | Sticky stepper or anchored sections with progress | `lead-workspace.tsx` | Medium navigation | Manager completes qualify→note→request without scroll hunt |
| Calculation request errors opaque | Inline field errors + link to HEAD policy | `calculation-request-form.tsx` | Low | Failed submit shows actionable RU/UZ/EN message |

## 2. Head workflow (priority 2)

| Problem | Proposal | Components | Regression risk | Done when |
|--------|----------|------------|-----------------|-----------|
| Submitted request status not obvious | Status chip + timeline (draft→submitted→approved) | `calculation-request-panel.tsx`, `lead-workspace.tsx` | Low | HEAD sees status without opening nested tabs |
| HPL review cramped on laptop | Split pane: inputs left, preview right | Head calculation views | Medium layout | 1280px viewport without horizontal scroll |

## 3. Calculations (priority 3)

| Problem | Proposal | Components | Regression risk | Done when |
|--------|----------|------------|-----------------|-----------|
| Mixed thickness UX relies on error round-trip | Show conflict banner from workspace before calculate | `facade-calculator.tsx` | Low (already partial) | Engineer confirms once; no 409 surprise |
| Installation vs facade tabs unclear | Role-based tab labels + disabled hints | Engineering routes | Low | Engineer knows which calculator applies |

## 4. Quotes (priority 4)

| Problem | Proposal | Components | Regression risk | Done when |
|--------|----------|------------|-----------------|-----------|
| PDF/version flow not discoverable | Primary CTA “Download PDF” + version badge | Quote panels | Medium | Playwright covers generate→reopen |
| Client doc safety (no UUID/cost) | Pre-flight checklist UI before finalize | Quote finalize flow | High business | Automated PDF text scan in QA |

## 5. Navigation (priority 5)

| Problem | Proposal | Components | Regression risk | Done when |
|--------|----------|------------|-----------------|-----------|
| Sidebar dense on mobile | Collapsible groups + active trail | `sidebar.tsx`, `dashboard-shell.tsx` | Medium | Mobile Playwright passes nav smoke |
| No “home” dashboard story | Manager KPI strip + tasks | `(dashboard)/page.tsx` | Low | Dashboard screenshot per locale |

## 6. Visual consistency (priority 6)

| Problem | Proposal | Components | Regression risk | Done when |
|--------|----------|------------|-----------------|-----------|
| Mixed semantic tokens vs slate | Audit `lead-workspace`, filters, tables | Multiple | Medium | Dark contrast AA on tables |
| Tables overflow mobile | Horizontal scroll + sticky first column | Shared table wrappers | Low | Mobile lead list usable |

## 7. Responsiveness (priority 7)

| Problem | Proposal | Components | Regression risk | Done when |
|--------|----------|------------|-----------------|-----------|
| Engineering calculators wide tables | Card stack under `md` breakpoint | `facade-calculator.tsx` | Low | Mobile engineering screenshot clean |
