# PRP 10: Calendar View

## Feature Overview
Add a dedicated monthly calendar view that visualizes todos by due date and shows Singapore public holidays. Users can navigate months, highlight today, and open a modal to view todos on a selected day. All date logic uses Singapore timezone.

## User Stories
- As a user, I can open a calendar view to see my month at a glance.
- As a user, I can see which days have todos due and how many.
- As a user, I can view Singapore public holidays on the calendar.
- As a user, I can navigate between months easily.
- As a user, I can click a day to view that day’s todos in a modal.

## User Flow
1. User clicks the "Calendar" button in the top navigation.
2. Calendar page loads the current month in Singapore timezone.
3. Holidays are displayed on their dates.
4. Days with due todos show a count badge.
5. User clicks prev/next or today to navigate months.
6. User clicks a day to open a modal with all todos due that day.
7. User closes modal or returns to the main todo list.

## Technical Requirements

### Routes
- Page route: `/calendar`
- Back navigation link: "Back to Todos"

### Database
- `holidays` table seeded with Singapore public holidays.
- Todos are read from existing `todos` table.

### API Endpoints
- `GET /api/holidays`
  - Returns all holidays for display on the calendar.

### Calendar Generation
- Display a 7-column grid with Sun–Sat headers.
- Generate weeks for the selected month (including leading/trailing days as needed).
- Use Singapore timezone when determining current date and month boundaries.

### Display Rules
- Current day highlighted.
- Weekends styled distinctively.
- Holidays shown as labeled pills within day cells.
- Todo count badge appears for any day with one or more todos due.
- Clicking a day opens a modal listing that day’s todos.
- URL state supports month navigation via `?month=YYYY-MM`.

## UI Components

### Calendar Page
- Title: "Holiday Calendar"
- Month header (e.g., "February 2026")
- Prev/Next buttons
- Calendar grid with day cells

### Day Cell
- Day number in top-left.
- Holiday tags (red pill).
- Todo count badge if applicable.
- Hover and selected states.

### Modal
- Opens on day click.
- Lists all todos due on that date.
- Close button.

### Screenshots Reference (UI Alignment)
- `screenshots/Screenshot From 2026-02-06 13-35-10.png`

## Edge Cases
- Month starts mid-week: display leading empty days.
- Month ends mid-week: display trailing empty days.
- No todos on a day: no badge, modal can be empty or not open.
- No holidays in a month: calendar still renders cleanly.
- Todos without due date: excluded from calendar display.

## Acceptance Criteria
- Calendar displays current month correctly.
- Singapore holidays appear on correct dates.
- Todos appear on their due dates with correct counts.
- Month navigation works and updates URL state.
- Clicking a day opens a modal showing that day’s todos.
- Today is highlighted.

## Testing Requirements

### E2E Tests
- Calendar loads current month.
- Navigate prev/next month.
- Today button returns to current month.
- Holiday appears on correct date.
- Todo appears on correct date.
- Clicking day opens modal.

### Unit Tests
- Calendar grid generation for month boundaries.
- Holiday mapping to dates.

## Out of Scope
- Drag-and-drop rescheduling.
- Week/agenda views.
- Recurring visualization beyond due-date instances.

## Success Metrics
- Users can visually identify due workload by day.
- Holiday display accuracy verified for Singapore.
