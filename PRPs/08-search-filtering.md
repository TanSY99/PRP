# PRP 08: Search & Filtering

## Feature Overview
Implement comprehensive real-time search and multi-criteria filtering system for finding todos quickly. Features include text search across titles and subtasks, priority filtering, tag filtering, date range filtering, completion status filtering, AND-logic filter combinations, saved filter presets, and client-side performance optimization for instant results.

## User Stories
- As a user, I can search todos by typing in a search bar to find specific tasks quickly.
- As a user, search matches both todo titles AND subtask titles so I don't miss related items.
- As a user, I can filter todos by priority level to focus on urgent tasks.
- As a user, I can filter by tags to see category-specific todos.
- As a user, I can filter by completion status to review what's done vs pending.
- As a user, I can set date ranges to see todos due in specific periods.
- As a user, I can combine multiple filters (search + priority + tags + dates) for precise results.
- As a user, I can save frequent filter combinations as presets for quick reuse.
- As a user, I can clear all active filters with one click.
- As a user, search results update in real-time as I type without delays.

## User Flow

### Basic Search
1. User sees search bar at top of todo list (below todo form).
2. User types search query (e.g., "meeting").
3. Results filter **instantly** as user types (real-time).
4. Matching todos display in their normal sections (Overdue/Pending/Completed).
5. Search is **case-insensitive**: "Meeting" = "meeting".
6. Search matches **partial words**: "proj" finds "project" and "projection".
7. Clear button (✕) appears in search bar when typing.
8. User clicks ✕ or deletes text to clear search.

### Quick Filters
1. User sees filter row below search bar with dropdowns:
   - **All Priorities** dropdown
   - **All Tags** dropdown (if tags exist)
   - **▶ Advanced** toggle button
2. User selects priority (High/Medium/Low).
3. Only todos with that priority show (combines with search).
4. User selects tag from dropdown.
5. Only todos with that tag show (combines with other filters).
6. **"Clear All"** button appears when any filter active (red).
7. User clicks "Clear All" to reset all filters instantly.

### Advanced Filters
1. User clicks **"▶ Advanced"** button.
2. Advanced panel expands below quick filters showing:
   - **Completion Status** dropdown (All/Incomplete/Completed)
   - **Due Date From** date picker
   - **Due Date To** date picker
   - **Saved Filter Presets** section (if any exist)
3. User selects completion status.
4. User sets date range (from and/or to).
5. Filters combine with search and quick filters (AND logic).
6. Advanced button changes to **"▼ Advanced"** when expanded.
7. User clicks again to collapse advanced panel.

### Saving Filter Presets
1. User applies multiple filters:
   - Search: "report"
   - Priority: High
   - Tag: Work
   - Completion: Incomplete
   - Date range: This week
2. **"💾 Save Filter"** button appears (green, next to "Clear All").
3. User clicks "Save Filter".
4. Save filter modal opens showing:
   - Name input field
   - Current filters preview
5. User enters preset name (e.g., "High Priority Work Reports").
6. User clicks "Save".
7. Preset saved to localStorage.
8. Preset appears in Advanced Filters → Saved Presets section.

### Using Saved Presets
1. User opens Advanced Filters panel.
2. User sees "Saved Filter Presets" section.
3. Presets displayed as clickable pills: `[Preset Name] [✕]`.
4. User clicks preset name.
5. All filters applied instantly.
6. Search bar, dropdowns, and date pickers populate with preset values.
7. User can modify filters after applying preset.
8. User can delete preset by clicking ✕ on pill.

## Technical Requirements

### Database Schema
**No new tables required** - filtering done on existing data:
- Uses `todos` table with priority, completed, due_date
- Uses `tags` and `todo_tags` for tag filtering
- Uses `subtasks` table for subtask search
- All filtering performed via API queries or client-side

### Type Definitions
```typescript
interface FilterState {
  search: string;
  priority: 'all' | 'high' | 'medium' | 'low';
  tag_id: number | null;
  completion: 'all' | 'incomplete' | 'completed';
  date_from: string | null; // YYYY-MM-DD
  date_to: string | null; // YYYY-MM-DD
}

interface FilterPreset {
  id: string; // UUID
  name: string;
  filters: FilterState;
  created_at: string;
}

interface FilterPresetStorage {
  presets: FilterPreset[];
}
```

### API Endpoints

#### Get Filtered Todos
- `GET /api/todos`
- Query parameters:
  - `search` (string, optional) - Case-insensitive search
  - `priority` (string, optional) - 'high' | 'medium' | 'low'
  - `tag_id` (number, optional) - Filter by tag
  - `completed` (boolean, optional) - Filter by completion
  - `date_from` (string, optional) - ISO date string
  - `date_to` (string, optional) - ISO date string
- Returns: `{ todos: TodoWithTagsAndSubtasks[] }`
- **Implementation Options**:
  - **Server-side filtering**: Apply filters in SQL query (better for large datasets)
  - **Client-side filtering**: Fetch all todos, filter in browser (faster for small datasets)

**Example Request**:
```
GET /api/todos?search=meeting&priority=high&tag_id=5&completed=false&date_from=2025-11-01&date_to=2025-11-07
```

**Example Response**:
```json
{
  "todos": [
    {
      "id": 42,
      "title": "Team Meeting Preparation",
      "priority": "high",
      "completed": false,
      "due_date": "2025-11-05T14:00:00",
      "tags": [{ "id": 5, "name": "Work", "color": "#3B82F6" }],
      "subtasks": [{ "id": 1, "title": "Prepare agenda", "completed": false }]
    }
  ]
}
```

### Search Logic

#### Title Search
- **Matches**: Todo title field
- **Case-insensitive**: Convert to lowercase for comparison
- **Partial match**: "proj" matches "My Project" and "Projection meeting"
- **Word boundaries**: Not enforced (substring match anywhere)
- **Implementation**:
  ```sql
  WHERE LOWER(title) LIKE '%' || LOWER(:search) || '%'
  ```

#### Subtask Search (Advanced)
- **Matches**: Subtask titles within todos
- **Behavior**: If subtask matches, show parent todo
- **Implementation**:
  ```sql
  WHERE id IN (
    SELECT DISTINCT todo_id FROM subtasks
    WHERE LOWER(title) LIKE '%' || LOWER(:search) || '%'
  )
  OR LOWER(title) LIKE '%' || LOWER(:search) || '%'
  ```

#### Tag Search (Advanced Mode - Optional)
- **Matches**: Tag names
- **Behavior**: Show todos with matching tag names
- **Example**: Search "work" → shows todos tagged with "Work" tag

### Filter Combination Logic

#### AND Logic
All active filters must match (intersection, not union):
```
Active Filters:
- Search: "meeting"
- Priority: high
- Tag: Work
- Completion: incomplete
- Date: 2025-11-01 to 2025-11-07

Result = Todos WHERE:
  (title LIKE '%meeting%' OR subtask.title LIKE '%meeting%')
  AND priority = 'high'
  AND id IN (SELECT todo_id FROM todo_tags WHERE tag_id = X)
  AND completed = false
  AND due_date >= '2025-11-01'
  AND due_date <= '2025-11-07'
```

#### Filter Application Order
1. Search filter (text match)
2. Priority filter
3. Tag filter
4. Completion filter
5. Date range filter

### Client-Side vs Server-Side Filtering

#### Client-Side Approach (Recommended for <1000 todos)
**Pros**:
- ✅ Instant filtering (no network latency)
- ✅ Simpler implementation
- ✅ Works offline
- ✅ Real-time updates while typing

**Implementation**:
```typescript
const filteredTodos = todos.filter(todo => {
  // Text search
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    const titleMatch = todo.title.toLowerCase().includes(searchLower);
    const subtaskMatch = todo.subtasks?.some(st => 
      st.title.toLowerCase().includes(searchLower)
    );
    if (!titleMatch && !subtaskMatch) return false;
  }
  
  // Priority filter
  if (filters.priority !== 'all' && todo.priority !== filters.priority) {
    return false;
  }
  
  // Tag filter
  if (filters.tag_id && !todo.tags?.some(t => t.id === filters.tag_id)) {
    return false;
  }
  
  // Completion filter
  if (filters.completion === 'completed' && !todo.completed) return false;
  if (filters.completion === 'incomplete' && todo.completed) return false;
  
  // Date range filter
  if (filters.date_from && todo.due_date < filters.date_from) return false;
  if (filters.date_to && todo.due_date > filters.date_to) return false;
  
  return true;
});
```

#### Server-Side Approach (For >1000 todos)
- Build SQL query dynamically based on active filters
- Return only matching todos
- Reduces data transfer
- Use for large datasets

### Performance Optimization

#### Debouncing Search Input
- **Delay**: 300ms after user stops typing
- **Purpose**: Avoid filtering on every keystroke
- **Implementation**:
  ```typescript
  const debouncedSearch = useMemo(
    () => debounce((value: string) => setSearchQuery(value), 300),
    []
  );
  ```

#### Virtual Scrolling (Optional)
- For >500 todo results
- Only render visible todos
- Use libraries like `react-window` or `react-virtual`

#### Memoization
- Memoize filter function results
- Cache filter combinations
- Update only when filters or todos change

### Saved Filter Presets

#### Storage
- **Location**: Browser localStorage
- **Key**: `todo-filter-presets-[userId]`
- **Format**: JSON string
- **Persistence**: Survives page refresh
- **User-specific**: Per browser/device

#### Preset Structure
```json
{
  "presets": [
    {
      "id": "uuid-1234",
      "name": "High Priority Work This Week",
      "filters": {
        "search": "",
        "priority": "high",
        "tag_id": 5,
        "completion": "incomplete",
        "date_from": "2025-11-01",
        "date_to": "2025-11-07"
      },
      "created_at": "2025-11-02T10:30:00"
    }
  ]
}
```

#### CRUD Operations
- **Create**: Add to presets array, save to localStorage
- **Read**: Parse from localStorage on page load
- **Update**: Not supported (delete and recreate)
- **Delete**: Remove from array, save to localStorage

## UI Components

### Search Bar
- **Location**: Top of todo list, below todo form
- **Appearance**:
  - Full-width input field
  - Left icon: 🔍 (search icon)
  - Right icon: ✕ (clear button, appears when text entered)
  - Placeholder: "Search todos and subtasks..."
  - Border: subtle, highlighted on focus
- **Behavior**:
  - Updates filter state on each keystroke
  - Debounced filtering (300ms)
  - Clear button clears search and removes filter

### Quick Filters Row
- **Location**: Below search bar
- **Layout**: Horizontal row with dropdowns
- **Components**:
  1. **Priority Filter Dropdown**
     - Label: "Priority:"
     - Default: "All Priorities"
     - Options: All, High, Medium, Low
     - Colored badges in dropdown
  2. **Tag Filter Dropdown**
     - Label: "Tag:"
     - Default: "All Tags"
     - Options: All + list of user tags
     - Colored badges in dropdown
     - Hidden if no tags exist
  3. **Advanced Toggle Button**
     - Text: "▶ Advanced" (collapsed) / "▼ Advanced" (expanded)
     - Background: gray (inactive) / blue (active)
     - Toggles advanced panel

### Filter Action Buttons
- **Location**: Right side of quick filters row
- **Visibility**: Only when filters active
- **Buttons**:
  1. **"Clear All"** (red background, white text)
     - Resets all filters to default
     - Clears search bar
     - Collapses advanced panel
  2. **"💾 Save Filter"** (green background, white text)
     - Opens save preset modal
     - Only shows with active filters

### Advanced Filters Panel
- **Location**: Below quick filters, expands accordion-style
- **Appearance**: Light gray background, padding
- **Components**:
  1. **Completion Status Dropdown**
     - Label: "Status:"
     - Default: "All Todos"
     - Options: All Todos, Incomplete Only, Completed Only
  2. **Date Range Inputs** (side by side)
     - **Due Date From**: Date input (YYYY-MM-DD)
     - **Due Date To**: Date input (YYYY-MM-DD)
     - Labels above inputs
     - Optional (can use one or both)
  3. **Saved Filter Presets Section**
     - Title: "Saved Presets"
     - Preset pills: `[Name] [✕]`
     - Click name → apply preset
     - Click ✕ → delete preset (with confirm)
     - Empty state: "No saved presets"

### Save Filter Modal
- **Title**: "Save Filter Preset"
- **Content**:
  - **Name Input** (required)
    - Label: "Preset Name"
    - Placeholder: "e.g., High Priority Work This Week"
  - **Current Filters Preview**:
    - Bulleted list showing active filters:
      - • Search: "[query]"
      - • Priority: [level]
      - • Tag: [tag name]
      - • Status: [completion]
      - • Date: [from] to [to]
- **Buttons**:
  - "Save" (primary, blue)
  - "Cancel" (secondary)

### Filter Results Display

#### Section Headers with Counts
- **Overdue (X)**: Count of filtered overdue todos
- **Pending (X)**: Count of filtered pending todos
- **Completed (X)**: Count of filtered completed todos

#### Empty States
- **No matches**: "No todos match your filters. Try adjusting your criteria."
- **Empty section**: Hide section headers with 0 count

#### Active Filter Indicator
- **Badge**: Small colored pill above search bar
- **Text**: "X filters active" (clickable to expand advanced)
- **Color**: Blue background, white text

## Edge Cases

### Search
- Empty search string → show all todos (no filter)
- Search with no matches → show "No todos match" message
- Very long search query (>100 chars) → allow but may not match
- Special characters in search → escape properly
- Search while filters active → combine with AND logic

### Filters
- No priority selected → show all priorities
- Tag filter with deleted tag → handle gracefully, show error
- Date range with FROM > TO → validation error or swap dates
- Date range with no todos → show empty state
- All filters result in 0 todos → clear empty state message

### Presets
- Saving preset with no name → validation error
- Saving preset with duplicate name → allow (no uniqueness constraint)
- Preset with deleted tag → show error when applying, don't crash
- localStorage full → show error, can't save preset
- Corrupted preset data in localStorage → clear and show error

### Performance
- Filtering 1000+ todos → consider server-side filtering
- Typing very fast in search → debouncing prevents lag
- Applying multiple filters rapidly → last filter state wins

## Acceptance Criteria

### Search Functionality
- ✓ Search bar visible and accessible
- ✓ Search is case-insensitive
- ✓ Search matches todo titles
- ✓ Search matches subtask titles (advanced)
- ✓ Search updates in real-time (with debouncing)
- ✓ Clear button removes search filter

### Priority Filtering
- ✓ Priority dropdown shows all levels
- ✓ Selecting priority filters todos immediately
- ✓ Priority filter combines with search (AND logic)
- ✓ "All Priorities" shows all todos

### Tag Filtering
- ✓ Tag dropdown shows all user tags
- ✓ Selecting tag filters todos immediately
- ✓ Tag filter combines with other filters
- ✓ "All Tags" shows all todos

### Date Range Filtering
- ✓ Can set FROM date only
- ✓ Can set TO date only
- ✓ Can set both for range
- ✓ Only shows todos WITH due dates
- ✓ Singapore timezone used for comparisons

### Filter Combinations
- ✓ All filters use AND logic
- ✓ "Clear All" removes all filters
- ✓ Active filter count displayed
- ✓ Empty state shown when no matches

### Saved Presets
- ✓ Can save current filter combination
- ✓ Presets persist across sessions
- ✓ Can apply saved preset
- ✓ Can delete saved preset
- ✓ Preset applies all filters correctly

## Testing Requirements

### E2E Tests
- Search by todo title (partial match)
- Search by subtask title
- Filter by priority (each level)
- Filter by tag
- Filter by completion status
- Filter by date range (FROM, TO, both)
- Combine search + priority + tag + dates
- Clear all filters
- Save filter preset
- Apply saved preset
- Delete saved preset
- Empty state for no results
- Performance test: Filter 1000 todos in <100ms

### Unit Tests
- Case-insensitive search logic
- Partial match algorithm
- AND logic for filter combinations
- Date range validation
- Preset serialization/deserialization
- Debounce function behavior
- Filter state management

## Out of Scope
- Sorting todos (separate feature)
- Full-text search with ranking
- Regex search
- Search history
- Filter suggestions
- Cross-user preset sharing
- OR logic for filters

## Success Metrics
- Search results appear in <100ms (client-side)
- Filters apply instantly on selection
- 90% of users use search within first week
- Average 2-3 filters combined per session
- 30% of users create saved presets

## Screenshots Reference
- Search bar with results filtering
- Quick filters row with dropdowns
- Advanced filters panel expanded
- Saved presets display
- Filter combinations applied
- Empty state for no results
