# PRP 04: Reminders & Notifications

## Feature Overview
Implement browser-based notification system that alerts users before todo due dates. Users can set customizable reminder timings (15 minutes to 1 week before), enable/disable notifications via permission flow, and receive persistent browser notifications with polling mechanism. All timing calculations use Singapore timezone.

## User Stories
- As a user, I can enable browser notifications so I receive reminders for my todos.
- As a user, I can set reminder timing when creating/editing todos with due dates.
- As a user, I can see a visual indicator (🔔 badge) on todos with reminders.
- As a user, I receive browser notifications at the specified time before due date.
- As a user, each reminder is sent only once to avoid notification spam.
- As a user, I can disable notifications if I no longer want them.

## User Flow
1. User clicks **"🔔 Enable Notifications"** button (orange badge, top-right of page).
2. Browser prompts for notification permission.
3. User grants permission.
4. Button changes to **"🔔 Notifications On"** (green badge).
5. When creating/editing a todo with a due date, user selects reminder timing from dropdown.
6. Reminder options: None, 15 minutes before, 30 minutes before, 1 hour before, 2 hours before, 1 day before, 2 days before, 1 week before.
7. Todo displays **🔔 badge** with abbreviated timing (e.g., "🔔 15m", "🔔 2d").
8. System polls every minute to check for pending reminders.
9. When reminder time arrives (based on Singapore timezone), browser notification is sent.
10. Notification persists until user acknowledges it.
11. System tracks `last_notification_sent` to prevent duplicates.

## Technical Requirements

### Database Schema

#### Add to `todos` table:
- `reminder_minutes` (INTEGER, nullable)
  - Minutes before due date to send notification
  - Values: NULL (no reminder), 15, 30, 60, 120, 1440 (1 day), 2880 (2 days), 10080 (1 week)
- `last_notification_sent` (TEXT/ISO string, nullable)
  - Timestamp of last notification sent
  - Prevents duplicate notifications
  - Updated when notification is sent

### Type Definitions
```typescript
type ReminderMinutes = 15 | 30 | 60 | 120 | 1440 | 2880 | 10080 | null;

interface Todo {
  // ... existing fields
  reminder_minutes: ReminderMinutes;
  last_notification_sent: string | null;
}

interface ReminderOption {
  label: string;
  value: ReminderMinutes;
  abbreviation: string; // For badge display
}
```

### Reminder Options
```typescript
const REMINDER_OPTIONS: ReminderOption[] = [
  { label: 'None', value: null, abbreviation: '' },
  { label: '15 minutes before', value: 15, abbreviation: '15m' },
  { label: '30 minutes before', value: 30, abbreviation: '30m' },
  { label: '1 hour before', value: 60, abbreviation: '1h' },
  { label: '2 hours before', value: 120, abbreviation: '2h' },
  { label: '1 day before', value: 1440, abbreviation: '1d' },
  { label: '2 days before', value: 2880, abbreviation: '2d' },
  { label: '1 week before', value: 10080, abbreviation: '1w' },
];
```

### API Endpoints

#### Check Pending Reminders
- `GET /api/reminders/check`
- Called every minute by client-side polling
- Returns todos where:
  - `due_date` is set
  - `reminder_minutes` is not null
  - `completed` is false
  - Current Singapore time >= (due_date - reminder_minutes)
  - `last_notification_sent` is null OR significantly old (to handle edge cases)
- Response:
  ```typescript
  {
    reminders: Array<{
      id: number;
      title: string;
      due_date: string;
      reminder_minutes: number;
    }>
  }
  ```

#### Mark Reminder as Sent
- `POST /api/reminders/[id]/sent`
- Updates `last_notification_sent` to current Singapore time
- Prevents duplicate notifications
- Response: `{ success: true }`

### Notification Permission Flow

#### Client-Side (React)
```typescript
// State for notification permission
const [notificationsEnabled, setNotificationsEnabled] = useState(false);

// Check permission on mount
useEffect(() => {
  if ('Notification' in window) {
    setNotificationsEnabled(Notification.permission === 'granted');
  }
}, []);

// Request permission
const enableNotifications = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
  }
};
```

#### Polling Mechanism
```typescript
// Poll every 60 seconds
useEffect(() => {
  if (!notificationsEnabled) return;

  const checkReminders = async () => {
    const response = await fetch('/api/reminders/check');
    const { reminders } = await response.json();

    reminders.forEach((reminder: any) => {
      new Notification('Todo Reminder', {
        body: `${reminder.title} is due soon!`,
        icon: '/icon.png', // Optional app icon
        tag: `todo-${reminder.id}`, // Prevents duplicate notifications
      });

      // Mark as sent
      fetch(`/api/reminders/${reminder.id}/sent`, { method: 'POST' });
    });
  };

  const interval = setInterval(checkReminders, 60000); // Every minute
  checkReminders(); // Check immediately

  return () => clearInterval(interval);
}, [notificationsEnabled]);
```

### Timezone Handling
- All reminder calculations use Singapore timezone (Asia/Singapore)
- Due date and current time must be compared in Singapore timezone
- `reminder_time = due_date - reminder_minutes`
- Notification sent when `current_singapore_time >= reminder_time`

### Validation Rules
- Reminder can only be set if `due_date` is not null
- Reminder dropdown should be disabled if no due date selected
- Reminder must be one of allowed values (15, 30, 60, 120, 1440, 2880, 10080, null)
- Due date must be far enough in future to accommodate reminder
  - Example: If due date is 10 minutes away, cannot set "1 day before" reminder

## UI Components

### Enable Notifications Button
- **Location**: Top-right navigation area
- **States**:
  - Not enabled: **"🔔 Enable Notifications"** (orange badge)
  - Enabled: **"🔔 Notifications On"** (green badge)
- **Behavior**: Clicking requests browser notification permission
- **Visibility**: Always visible to allow re-enabling if disabled

### Reminder Dropdown (Todo Form)
- **Location**: Advanced Options section of todo create/edit form
- **Label**: "Reminder:"
- **Options**: See REMINDER_OPTIONS above
- **Default**: "None"
- **Disabled state**: Grayed out when no due date is selected
- **Helper text** (when disabled): "Set a due date to enable reminders"

### Reminder Badge (Todo Display)
- **Visual**: 🔔 icon followed by abbreviated timing
- **Examples**: "🔔 15m", "🔔 1h", "🔔 2d", "🔔 1w"
- **Location**: Inline with priority badge, before tags
- **Color**: Blue background with white text
- **Visibility**: Only shown when `reminder_minutes` is not null

### Screenshots Reference (UI Alignment)
- `screenshots/Screenshot From 2026-02-06 13-32-38.png` - Shows reminder dropdown in advanced options

## Edge Cases

### Permission Denied
- If user denies notification permission, button shows "Enable Notifications" but remains disabled
- Show helpful error message: "Notifications blocked. Please enable them in browser settings."
- Polling does not run if permission is denied

### Due Date Changed
- If due date is edited to be sooner than reminder time, adjust or remove reminder
- Example: Todo due in 30 minutes, but has "1 day before" reminder -> auto-adjust to "15 minutes before" or prompt user

### Due Date Removed
- If due date is cleared, automatically set `reminder_minutes` to NULL
- Remove reminder badge from display

### Overdue Todos
- Do not send reminders for overdue todos
- Reminder check should exclude todos where `due_date < current_singapore_time`

### Completed Todos
- Do not send reminders for completed todos
- Polling query filters out `completed = true`

### Browser Tab in Background
- Browser notifications work even if tab is in background
- Service Worker not required for basic notifications (modern browsers)

### Notification Suppression
- Use `tag` property to prevent duplicate notifications if multiple checks occur
- Track `last_notification_sent` to prevent re-sending

### Recurring Todos
- When recurring todo is completed and new instance created, copy `reminder_minutes` to new instance
- Reset `last_notification_sent` to NULL for new instance

### Clock Changes (DST)
- Singapore has no DST, so no special handling needed
- But polling should always use fresh `Date.now()` in Singapore timezone

## Acceptance Criteria

### Functional
- ✅ Enable notifications button requests and tracks permission
- ✅ Reminder dropdown appears in todo form
- ✅ Reminder dropdown is disabled when no due date is set
- ✅ Reminder options include all specified timings
- ✅ 🔔 badge displays correctly with abbreviation
- ✅ Polling runs every minute when notifications enabled
- ✅ Browser notifications sent at correct time (Singapore timezone)
- ✅ Each reminder sent only once (tracked via `last_notification_sent`)
- ✅ Notifications work even if tab is in background
- ✅ Reminders not sent for completed or overdue todos

### Visual
- ✅ Enable button is orange when disabled, green when enabled
- ✅ Reminder badge is blue with white text
- ✅ Badge shows correct abbreviation (15m, 1h, 2d, etc.)
- ✅ Dropdown styling matches app design
- ✅ Dark mode support for all notification UI elements

### Validation
- ✅ Invalid reminder values rejected by API
- ✅ Reminder automatically cleared if due date removed
- ✅ Cannot set reminder without due date (UI prevents it)

## Testing Requirements

### E2E Tests
1. **Enable notifications flow**
   - Navigate to app
   - Click "Enable Notifications"
   - Grant permission
   - Verify button changes to "Notifications On"

2. **Set reminder on new todo**
   - Create todo with due date 1 hour in future
   - Select "30 minutes before" from reminder dropdown
   - Verify 🔔 30m badge appears
   - Verify `reminder_minutes = 30` in database

3. **Set reminder on existing todo**
   - Edit todo
   - Set due date
   - Select "1 hour before" reminder
   - Save
   - Verify badge updates

4. **Reminder disabled without due date**
   - Create new todo without due date
   - Verify reminder dropdown is disabled
   - Set due date
   - Verify reminder dropdown becomes enabled

5. **Remove reminder**
   - Edit todo with reminder
   - Select "None" from dropdown
   - Save
   - Verify badge disappears
   - Verify `reminder_minutes = NULL` in database

6. **Notification delivery** (mock time)
   - Create todo due in 20 minutes
   - Set reminder to 15 minutes before
   - Fast-forward time to 5 minutes before due
   - Verify notification appears
   - Verify `last_notification_sent` is updated

7. **No duplicate notifications**
   - Send notification for todo
   - Poll again within same minute
   - Verify notification not re-sent

8. **Recurring todo reminder inheritance**
   - Create recurring todo with reminder
   - Complete it
   - Verify new instance has same `reminder_minutes`
   - Verify new instance has `last_notification_sent = NULL`

### Unit Tests
1. **Reminder time calculation**
   - Test: Due date - reminder_minutes = reminder time
   - Edge case: Reminder time in past (should not send)

2. **Validation logic**
   - Test valid reminder values accepted
   - Test invalid values rejected
   - Test NULL allowed

3. **Permission state management**
   - Test permission granted updates state
   - Test permission denied updates state
   - Test permission prompt cancelled

4. **Polling query logic**
   - Test only returns todos meeting all criteria
   - Test excludes completed todos
   - Test excludes overdue todos
   - Test excludes todos without due dates
   - Test excludes todos with NULL reminder_minutes

## Out of Scope
- Email notifications (browser notifications only)
- SMS notifications
- Push notifications (native mobile apps)
- Custom notification sounds
- Snooze functionality (user must handle via todo edit)
- Multiple reminders per todo (only one reminder timing allowed)
- Reminder history/logs
- Desktop notifications for users without browser permission (no workaround)

## Success Metrics
- Users successfully enable notifications (>80% grant permission)
- Reminders sent within 1 minute of scheduled time (polling interval)
- No duplicate notifications reported
- Notification delivery rate: 100% for users with permission granted
- Low false positive rate (notifications sent for wrong todos)
- Feature adoption: >50% of todos with due dates have reminders set
