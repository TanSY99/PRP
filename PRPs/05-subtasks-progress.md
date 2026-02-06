# PRP 05: Subtasks & Progress Tracking

## Feature Overview
Implement comprehensive subtask/checklist system allowing users to break down complex todos into smaller, manageable steps with real-time progress tracking. Subtasks display in expandable/collapsible lists with completion checkboxes, visual progress bars showing percentage completion, and "X/Y subtasks" text indicators. All subtasks are searchable and cascade-deleted when parent todo is removed.

## User Stories
- As a user, I can add unlimited subtasks to any todo to break down complex work.
- As a user, I can mark subtasks complete/incomplete with checkboxes.
- As a user, I can see real-time progress (percentage and X/Y format) as I complete subtasks.
- As a user, I can see progress even when subtask list is collapsed.
- As a user, I can delete individual subtasks.
- As a user, I can search both todo titles and subtask titles.
- As a user, subtasks are automatically deleted when I delete the parent todo (CASCADE).
- As a user, subtasks maintain their order in the list.

## User Flow
1. User creates or views an existing todo.
2. User clicks **"▶ Subtasks"** button to expand subtask section.
3. Button changes to **"▼ Subtasks"** and subtask list + input field appear.
4. User types subtask title in input field and presses Enter or clicks "Add".
5. Subtask appears in list below with checkbox and delete button.
6. Progress bar and "0/1 subtasks" indicator appear below todo title.
7. User checks subtask checkbox to mark complete.
8. Progress updates to "1/1 subtasks" and progress bar shows 100%.
9. User can uncheck to mark incomplete.
10. User can click ✕ button to delete individual subtask.
11. User clicks **"▼ Subtasks"** button to collapse (progress remains visible).
12. When searching, results include todos with matching subtask titles.

## Technical Requirements

### Database Schema

#### New Table: `subtasks`
```sql
CREATE TABLE subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  todo_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER DEFAULT 0, -- 0 = false, 1 = true
  position INTEGER NOT NULL, -- For maintaining order
  created_at TEXT NOT NULL,
  FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
);

CREATE INDEX idx_subtasks_todo_id ON subtasks(todo_id);
CREATE INDEX idx_subtasks_position ON subtasks(todo_id, position);
```

**Field Descriptions**:
- `id`: Unique identifier for subtask
- `todo_id`: Foreign key to parent todo (CASCADE delete)
- `title`: Subtask text (trimmed, non-empty)
- `completed`: Boolean stored as INTEGER (SQLite convention)
- `position`: Integer for maintaining subtask order (0-indexed)
- `created_at`: ISO timestamp in Singapore timezone

### Type Definitions
```typescript
interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

interface TodoWithSubtasks extends Todo {
  subtasks: Subtask[];
  subtask_progress: {
    completed: number;
    total: number;
    percentage: number; // 0-100
  };
}
```

### API Endpoints

#### Get Todo with Subtasks
- `GET /api/todos/[id]`
- Returns todo with `subtasks` array sorted by `position`
- Includes calculated `subtask_progress`
- Response:
  ```typescript
  {
    id: 1,
    title: "Project Alpha",
    // ... other todo fields
    subtasks: [
      { id: 1, todo_id: 1, title: "Research phase", completed: true, position: 0 },
      { id: 2, todo_id: 1, title: "Design mockups", completed: false, position: 1 }
    ],
    subtask_progress: {
      completed: 1,
      total: 2,
      percentage: 50
    }
  }
  ```

#### Get All Todos with Subtasks
- `GET /api/todos`
- Returns array of todos, each with subtasks and progress
- Used for main todo list view

#### Create Subtask
- `POST /api/todos/[todoId]/subtasks`
- Body: `{ title: string }`
- Validates title (non-empty, trimmed)
- Automatically assigns next position (max(position) + 1)
- Returns created subtask
- Response: `{ subtask: Subtask }`

#### Update Subtask
- `PUT /api/subtasks/[id]`
- Body: `{ title?: string, completed?: boolean }`
- Title validation if provided
- Returns updated subtask
- Response: `{ subtask: Subtask }`

#### Delete Subtask
- `DELETE /api/subtasks/[id]`
- Deletes single subtask
- Recalculates positions for remaining subtasks (optional: can leave gaps)
- Returns success
- Response: `{ success: true }`

### Progress Calculation Logic
```typescript
function calculateProgress(subtasks: Subtask[]) {
  const total = subtasks.length;
  const completed = subtasks.filter(s => s.completed).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  
  return { completed, total, percentage };
}
```

### Position Management
- New subtasks get `position = max(existing_positions) + 1`
- When deleting, either:
  - **Option A**: Recalculate all positions (0, 1, 2, ...) for consistency
  - **Option B**: Leave gaps (simpler, still maintains order)
- When creating first subtask, `position = 0`
- Subtasks always queried with `ORDER BY position ASC`

### Cascade Delete Behavior
- When parent todo is deleted, all subtasks automatically deleted via `ON DELETE CASCADE`
- No manual deletion of subtasks required in API endpoint
- Database handles referential integrity

### Search Integration
- Search query must check both:
  - `todos.title` for match
  - `subtasks.title` for match (via JOIN)
- If subtask matches, display parent todo in results
- Highlight matching subtask in expanded view (optional enhancement)

Example query:
```sql
SELECT DISTINCT todos.* 
FROM todos
LEFT JOIN subtasks ON subtasks.todo_id = todos.id
WHERE todos.title LIKE '%search%' OR subtasks.title LIKE '%search%';
```

## UI Components

### Subtasks Toggle Button
- **Location**: Right side of todo row, before Edit/Delete buttons
- **States**:
  - Collapsed: **"▶ Subtasks"** (right-pointing arrow)
  - Expanded: **"▼ Subtasks"** (down-pointing arrow)
- **Badge counter** (optional): Show count like "▶ Subtasks (3)"
- **Behavior**: Click to toggle expansion
- **Visibility**: Always visible on all todos

### Progress Indicator (Always Visible)
- **Location**: Below todo title, above badges
- **Components**:
  1. **Text**: "X/Y subtasks" in gray text (e.g., "3/7 subtasks")
  2. **Progress Bar**: 
     - Blue filled portion representing percentage
     - Gray background for unfilled portion
     - Full width of todo content area
     - Height: 4-6px
     - Rounded corners
- **Visibility**: Only shown when subtasks exist (total > 0)
- **Update**: Real-time as subtasks are created/completed/deleted

### Subtask List (Expandable Section)
- **Location**: Below progress indicator, above todo action buttons
- **Visibility**: Only when expanded via toggle button
- **Background**: Slightly different shade to distinguish from main todo
- **Padding**: Indented from left to show hierarchy

### Subtask Input Field
- **Location**: Top of expanded subtask section
- **Components**:
  1. Text input with placeholder: "Add a subtask..."
  2. "Add" button (blue) or Enter key to submit
- **Behavior**:
  - Enter or click Add to create
  - Input clears after creation
  - Auto-focus after expanding section
- **Validation**: Disable Add button if empty/whitespace

### Subtask Row
- **Layout** (left to right):
  1. **Checkbox**: Toggle completion
  2. **Title**: Subtask text, with strikethrough if completed
  3. **Delete button** (✕): Red, right-aligned
- **Styling**:
  - Completed subtasks: Gray text + strikethrough
  - Incomplete subtasks: Normal text
  - Hover effects on checkbox and delete button
- **Spacing**: Compact but touchable (mobile-friendly)

### Progress Bar Visual
```
[=========>                    ] 3/7 subtasks (43%)
```
- Smooth animations when progress changes (optional)
- Color: Primary blue (#3B82F6 or theme color)
- Accessible: Include text percentage for screen readers

### Screenshots Reference (UI Alignment)
- `screenshots/Screenshot From 2026-02-06 13-32-38.png` - Shows "0" subtask indicator on todos
- `screenshots/Screenshot From 2026-02-06 13-33-19.png` - Shows subtask display on todos

## Edge Cases

### No Subtasks
- Progress indicator not displayed (or show "0/0 subtasks" grayed out - decided by design)
- Subtask list shows only input field when expanded
- Toggle button still visible and functional

### All Subtasks Completed
- Progress bar shows 100% (fully blue)
- Text shows "X/X subtasks" (e.g., "7/7 subtasks")
- Parent todo completion NOT automatically triggered (independent)

### Parent Todo Completed
- Subtasks remain visible and editable
- User can still add/complete/delete subtasks on completed parent
- Progress continues to calculate normally

### Deleting Last Subtask
- Progress indicator disappears
- Subtask section remains expanded with empty list + input

### Creating Subtask on Newly Created Todo
- Ensure todo is saved to database first (has valid ID)
- Optimistic UI should wait for todo creation confirmation
- Then allow subtask creation immediately

### Subtask Title Validation
- Empty or whitespace-only titles rejected
- API returns 400 error
- UI shows validation message
- Frontend trims whitespace before sending

### Position Gaps
- If using Option B (leave gaps), ensure ORDER BY position still works
- Gaps don't affect display order
- Positions don't need to be sequential, just ordered

### Concurrent Updates
- If two users edit same todo's subtasks (future multi-user scenario), last write wins
- Optimistic UI may need refresh on conflict
- For MVP, assume single-user local database

### Search Result Display
- If subtask matches search, show parent todo
- Optionally auto-expand subtasks when viewing search results
- Highlight matching subtask text (enhancement)

### Deleting Parent Todo
- Confirm deletion (if confirmation implemented)
- All subtasks automatically deleted via CASCADE
- No orphaned subtasks in database

## Acceptance Criteria

### Functional
- ✅ Can create unlimited subtasks per todo
- ✅ Subtasks maintain order (by position)
- ✅ Can mark subtask complete/incomplete with checkbox
- ✅ Can delete individual subtasks
- ✅ Progress bar calculates correctly (0-100%)
- ✅ "X/Y subtasks" text displays correctly
- ✅ Progress updates in real-time on any change
- ✅ Subtask list expands/collapses with toggle button
- ✅ Progress visible even when collapsed
- ✅ Search includes subtask titles
- ✅ CASCADE delete works when parent todo deleted
- ✅ Empty/whitespace subtask titles rejected

### Visual
- ✅ Progress bar displays correctly with blue fill
- ✅ Completed subtasks show strikethrough
- ✅ Subtask section indented/styled to show hierarchy
- ✅ Toggle button shows correct arrow direction (▶/▼)
- ✅ Smooth UI updates (no flashing/jumping)
- ✅ Dark mode support for all subtask UI elements
- ✅ Mobile-friendly touch targets (min 44x44px)

### Performance
- ✅ Loading todos with many subtasks < 500ms
- ✅ Progress calculation < 10ms
- ✅ Subtask creation optimistic UI (instant feedback)
- ✅ No lag when toggling expansion on todos with 20+ subtasks

## Testing Requirements

### E2E Tests
1. **Create subtasks**
   - Expand subtask section
   - Add 3 subtasks
   - Verify all appear in list
   - Verify progress shows "0/3 subtasks"

2. **Complete subtasks**
   - Check first subtask
   - Verify progress updates to "1/3 subtasks" and ~33%
   - Check remaining two
   - Verify progress shows "3/3 subtasks" and 100%

3. **Uncomplete subtasks**
   - Uncheck a completed subtask
   - Verify progress decreases
   - Verify strikethrough removed

4. **Delete subtasks**
   - Delete one subtask
   - Verify removed from list
   - Verify progress recalculates to "2/2 subtasks"

5. **Collapse/expand**
   - Collapse subtask section
   - Verify list hidden but progress still visible
   - Expand again
   - Verify list reappears with same state

6. **Subtask validation**
   - Try to create empty subtask
   - Verify error or disabled Add button
   - Try whitespace-only
   - Verify rejected

7. **Search subtasks**
   - Create todo "Project" with subtask "Design mockups"
   - Search for "mockups"
   - Verify "Project" todo appears in results

8. **CASCADE delete**
   - Create todo with 3 subtasks
   - Delete parent todo
   - Query database to verify subtasks deleted
   - Verify no orphaned records

9. **Progress persistence**
   - Create todo with subtasks
   - Complete some subtasks
   - Refresh page
   - Verify progress persists correctly

### Unit Tests
1. **Progress calculation**
   - Test 0/0 = 0%
   - Test 1/3 = 33%
   - Test 3/3 = 100%
   - Test 2/7 = 29%
   - Test rounding logic

2. **Position assignment**
   - Test first subtask gets position 0
   - Test second subtask gets position 1
   - Test position after deletion (if recalculating)

3. **Validation logic**
   - Test empty string rejected
   - Test whitespace-only rejected
   - Test valid titles accepted
   - Test trimming whitespace

4. **Search query**
   - Test todo title match returns todo
   - Test subtask title match returns parent todo
   - Test no match returns empty
   - Test multiple matches

## Out of Scope
- Drag-and-drop reordering of subtasks (position is creation-order only)
- Nested subtasks (sub-subtasks) - only one level of hierarchy
- Subtask due dates (inherit parent's due date)
- Subtask priorities (inherit parent's priority)
- Separate completion tracking for overdue subtasks
- Subtask-specific reminders or tags
- Bulk operations (complete all, delete all)
- Subtask templates (included in todo templates via JSON serialization)
- Subtask notes or descriptions (title only)
- Subtask assignment to different users (single-user app)

## Success Metrics
- Users create subtasks on >30% of todos (adoption)
- Average subtasks per todo: 3-5
- Progress tracking used to completion (not abandoned)
- Search with subtask matches returns expected results
- Zero orphaned subtasks in database (CASCADE integrity)
- Performance: Subtask operations < 200ms server time
- UI responsiveness: Real-time progress updates feel instantaneous
