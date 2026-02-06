# PRP 06: Tag System

## Feature Overview
Implement comprehensive tag/label system with color-coded badges for organizing and categorizing todos. Users can create custom tags with unique names and colors, assign multiple tags to todos, manage tags via dedicated modal, and filter todos by tag. Tags are user-specific with many-to-many relationships to todos and CASCADE delete behavior.

## User Stories
- As a user, I can create custom tags with unique names and colors to categorize my work.
- As a user, I can assign multiple tags to any todo for flexible organization.
- As a user, I can visually identify tags by their custom colors on todo items.
- As a user, I can filter todos by selecting a specific tag.
- As a user, I can edit tag names and colors, with changes reflected across all tagged todos.
- As a user, I can delete tags, which removes them from all associated todos (CASCADE).
- As a user, my tags are private and unique to my account.

## User Flow

### Creating Tags
1. User clicks **"+ Manage Tags"** button near todo form.
2. Tag management modal opens.
3. User enters tag name in text input field.
4. User selects color using color picker or enters hex code.
5. User clicks **"Create Tag"** button.
6. Tag appears in modal's tag list immediately.
7. Modal remains open for creating more tags or closes with X/Close button.

### Editing Tags
1. User opens tag management modal.
2. User clicks **"Edit"** button next to any tag.
3. Tag name and color fields become editable inline or in edit mode.
4. User modifies name and/or color.
5. User clicks **"Update"** button.
6. Changes reflect immediately on all todos using that tag.

### Deleting Tags
1. User opens tag management modal.
2. User clicks **"Delete"** button next to tag.
3. Tag is removed from database.
4. All tag associations with todos are deleted (CASCADE).
5. Tag badges disappear from all affected todos.

### Assigning Tags to Todos
1. User creates new todo or edits existing todo.
2. Tag selection section appears below form (if tags exist).
3. User clicks tag pills to select/deselect.
4. Selected tags show ✓ checkmark, colored background, white text.
5. Unselected tags show gray background, gray border, dark text.
6. User can select multiple tags.
7. User saves todo.
8. Tags display as colored pills on todo item.

### Filtering by Tags
1. User uses **"All Tags"** dropdown in filter section.
2. User selects specific tag.
3. Only todos with that tag are displayed.
4. Tag filter combines with other active filters (search, priority, dates).
5. User selects "All Tags" to clear tag filter.

## Technical Requirements

### Database Schema

#### New Table: `tags`
```sql
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL, -- Hex color code (e.g., #3B82F6)
  created_at TEXT NOT NULL,
  UNIQUE(user_id, name), -- Unique tag names per user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_tags_user_id ON tags(user_id);
```

#### New Table: `todo_tags` (Junction/Join Table)
```sql
CREATE TABLE todo_tags (
  todo_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (todo_id, tag_id),
  FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_todo_tags_todo_id ON todo_tags(todo_id);
CREATE INDEX idx_todo_tags_tag_id ON todo_tags(tag_id);
```

**Schema Notes**:
- **Many-to-many** relationship: One todo can have many tags, one tag can be on many todos
- **CASCADE delete**: Deleting todo removes its tag associations; deleting tag removes all associations
- **Unique constraint**: User cannot create duplicate tag names (case-sensitive)
- **User-scoped**: Tags belong to specific users (user_id foreign key)

### Type Definitions
```typescript
interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string; // Hex code (e.g., "#3B82F6")
  created_at: string;
}

interface TodoWithTags extends Todo {
  tags: Tag[]; // Array of tags assigned to this todo
}

interface TodoTagRequest {
  tag_ids: number[]; // Array of tag IDs to assign
}
```

### API Endpoints

#### Get All Tags (User-Specific)
- `GET /api/tags`
- Returns all tags for authenticated user
- Sorted alphabetically by name
- Response:
  ```typescript
  {
    tags: Tag[]
  }
  ```

#### Create Tag
- `POST /api/tags`
- Body: `{ name: string, color: string }`
- Validates:
  - Name: non-empty, trimmed, unique per user
  - Color: valid hex code format (#RRGGBB)
- Response: `{ tag: Tag }`

#### Update Tag
- `PUT /api/tags/[id]`
- Body: `{ name?: string, color?: string }`
- Validates name uniqueness and color format if provided
- Updates reflected on all todos with this tag
- Response: `{ tag: Tag }`

#### Delete Tag
- `DELETE /api/tags/[id]`
- Removes tag and all associations (CASCADE)
- Response: `{ success: true }`

#### Get Todo with Tags
- `GET /api/todos/[id]`
- Returns todo with `tags` array
- Response:
  ```typescript
  {
    id: 1,
    title: "Project meeting",
    // ... other todo fields
    tags: [
      { id: 1, name: "Work", color: "#3B82F6" },
      { id: 2, name: "Urgent", color: "#EF4444" }
    ]
  }
  ```

#### Get All Todos with Tags
- `GET /api/todos`
- Returns todos with their associated tags
- Used for main todo list view

#### Assign Tags to Todo
- `PUT /api/todos/[id]/tags`
- Body: `{ tag_ids: number[] }`
- Replaces existing tag associations with new set
- Empty array removes all tags from todo
- Response: `{ success: true, tags: Tag[] }`

#### Filter Todos by Tag
- `GET /api/todos?tag_id=[tagId]`
- Returns only todos with specified tag
- Combines with other query params (search, priority, etc.)

### Validation Rules

#### Tag Name
- **Required**: Cannot be empty
- **Trimmed**: Whitespace removed from start/end
- **Unique per user**: Case-sensitive uniqueness
- **Max length**: 50 characters (recommended)
- **Invalid names**: Return 400 error with message

#### Tag Color
- **Format**: Hex code `#RRGGBB` (e.g., "#3B82F6")
- **Default**: `#3B82F6` (blue) if not provided
- **Validation**: Regex `/^#[0-9A-Fa-f]{6}$/`
- **Case**: Convert to uppercase for consistency
- **Invalid format**: Return 400 error

#### Tag Assignment
- Only tags belonging to user can be assigned
- Tag IDs must exist in database
- Invalid tag IDs ignored (or return error - design decision)

### Default Tag Color
- When creating tag without color: `#3B82F6` (Tailwind blue-500)
- Ensures all tags have valid color

## UI Components

### + Manage Tags Button
- **Location**: Near todo form, possibly below priority dropdown
- **Label**: "+ Manage Tags" or "🏷️ Manage Tags"
- **Style**: Secondary button (outlined or muted color)
- **Behavior**: Opens tag management modal

### Tag Management Modal

#### Modal Header
- **Title**: "Manage Tags"
- **Close button**: ✕ in top-right corner

#### Create Tag Section
- **Name input**: Text field with placeholder "Tag name..."
- **Color picker**: HTML `<input type="color">` with hex display
- **Create button**: Blue button labeled "Create Tag"
- **Layout**: Horizontal or vertical depending on space

#### Tag List Section
- **List container**: Scrollable if many tags
- **Empty state**: "No tags yet. Create one above!" if no tags exist

#### Tag Item Row
- **Layout** (left to right):
  1. **Color badge**: Small colored circle showing tag color
  2. **Tag name**: Text label
  3. **Edit button**: Blue button or icon
  4. **Delete button**: Red button or icon
- **Edit mode** (inline editing):
  - Name input replaces label
  - Color picker replaces circle
  - "Update" button and "Cancel" button appear

#### Modal Footer
- **Close button**: "Close" button to dismiss modal

### Tag Selection (Todo Form)

#### Location
- Below todo form fields (title, priority, date)
- Above "Add" or "Update" button
- Appears when 1+ tags exist

#### Visual Layout
- **Label**: "Tags:" (optional)
- **Tag pills**: Horizontal row, wrapping if needed
- **Selected state**:
  - ✓ Checkmark icon
  - Background: Tag's custom color
  - Text: White (high contrast)
  - Border: None or subtle
- **Unselected state**:
  - No checkmark
  - Background: White/gray (light mode) or dark gray (dark mode)
  - Text: Gray
  - Border: Gray
- **Interaction**: Click to toggle selection

### Tag Display on Todos

#### Visual Style
- **Shape**: Rounded pill/badge
- **Background**: Tag's custom color
- **Text**: Tag name in white
- **Size**: Small, compact (similar to priority badge)
- **Font**: Bold or semi-bold for readability
- **Location**: After priority and recurrence badges, before due date

#### Multiple Tags
- Display all tags inline
- Wrap to next line if too many
- Maintain spacing between tags

#### Example Todo with Tags
```
☐ [High] [🔄 weekly] [Work] [Urgent] Project meeting
   Due in 2 hours
   — 3/5 subtasks ————————— 60% ——
   ▶ Subtasks   Edit   Delete
```

### Tag Filter Dropdown

#### Location
- In filter section, near "All Priorities" dropdown
- Labeled: "All Tags"

#### Dropdown Options
- **Default**: "All Tags" (shows all todos)
- **Tag options**: Each tag name (sorted alphabetically)
- **Visual**: Show colored circle/badge next to each tag name

#### Behavior
- Selecting tag filters todo list to show only todos with that tag
- Combines with other filters (AND logic)
- Selected tag highlighted in dropdown
- "Clear All" button clears tag filter too

### Screenshots Reference (UI Alignment)
- `screenshots/Screenshot From 2026-02-06 13-32-38.png` - Shows filter section where tag filter would appear
- Tags are not visible in screenshots but their location can be inferred from existing badge layout

## Edge Cases

### No Tags Created
- Tag selection section hidden in todo form
- "All Tags" dropdown hidden in filters
- "Manage Tags" button always visible to allow tag creation

### Duplicate Tag Names
- API rejects with 400 error
- Frontend shows validation message: "Tag name already exists"
- Case-sensitive: "Work" and "work" are considered the same

### Tag Name Editing to Duplicate
- If editing tag name to match existing tag, reject
- Show error message
- Original name preserved

### Deleting Tag in Use
- Tag removed from database
- All `todo_tags` associations CASCADE deleted
- Tag badges immediately removed from todos in UI
- No confirmation required (or add confirmation - design choice)

### Color Contrast (WCAG Compliance)
- Ensure tag colors meet WCAG AA contrast with white text
- If user selects low-contrast color, either:
  - **Option A**: Warn but allow (let user decide)
  - **Option B**: Auto-adjust text color (black vs white) based on luminance
  - **Option C**: Reject until valid color selected
- Recommended: Option B for best UX

### Tag Color Picker Support
- HTML color input supported in modern browsers
- Fallback: Text input for hex code
- Mobile: Native color picker varies by OS

### Filtering with Multiple Tags
- Current spec: Filter by ONE tag at a time
- Future enhancement: Multi-tag filter (AND/OR logic)
- For MVP: Single tag filter only

### Tag Assignment on New Todo
- Tag selection available on create form
- Tag IDs sent with todo creation request
- After todo created, associations created in `todo_tags` table

### Tag Assignment on Edit
- Existing tags pre-selected in edit modal
- User can add/remove tags
- On save, existing associations deleted and new set created (replace strategy)

### Search with Tags
- Search query does not search tag names (out of scope for this feature)
- Searching "Work" won't find todos with "Work" tag (unless word is in title/subtasks)
- Tag filter is separate from search

### Export/Import with Tags
- Export includes tag IDs (may be different on import)
- Import must handle tag mapping (if importing to different user)
- For MVP: Tags not included in export/import (out of scope here)

## Acceptance Criteria

### Functional
- ✅ Can create tags with custom names and colors
- ✅ Tag names unique per user (case-sensitive)
- ✅ Can edit tag name and color
- ✅ Changes reflected on all todos using the tag
- ✅ Can delete tags (CASCADE removes from todos)
- ✅ Can assign multiple tags to a todo
- ✅ Can remove tags from a todo
- ✅ Tag badge displays on todo with correct color and name
- ✅ Can filter todos by tag
- ✅ Tag filter combines with other filters
- ✅ Hex color validation works correctly

### Visual
- ✅ Tag pills display with custom colors
- ✅ White text on colored background (high contrast)
- ✅ Selected vs unselected states clear in todo form
- ✅ Tag management modal clean and intuitive
- ✅ Color picker functional
- ✅ Multiple tags wrap gracefully
- ✅ Dark mode support for all tag UI elements
- ✅ Tag icons/badges consistent with app design

### Performance
- ✅ Loading tags < 100ms
- ✅ Creating tag < 200ms
- ✅ Filtering by tag < 300ms
- ✅ Assigning tags to todo < 200ms
- ✅ UI updates optimistic (instant feedback)

## Testing Requirements

### E2E Tests

#### Tag Management
1. **Create tag**
   - Open Manage Tags modal
   - Enter name "Work"
   - Select blue color
   - Click Create Tag
   - Verify tag appears in list

2. **Create duplicate tag**
   - Try to create tag with existing name
   - Verify error message displayed
   - Tag not created

3. **Edit tag**
   - Click Edit on existing tag
   - Change name to "Office"
   - Change color to green
   - Click Update
   - Verify changes saved
   - Verify changes reflected on todos using the tag

4. **Delete tag**
   - Click Delete on tag
   - Verify tag removed from modal list
   - Verify tag badges removed from todos

5. **Color validation**
   - Try to enter invalid hex code
   - Verify error or rejection
   - Enter valid hex code
   - Verify accepted

#### Tag Assignment
6. **Assign tags to new todo**
   - Create new todo
   - Select 2 tags from tag pills
   - Save todo
   - Verify both tags displayed on todo item

7. **Assign tags to existing todo**
   - Edit todo
   - Add 1 tag, remove 1 tag
   - Save
   - Verify tag changes reflected

8. **Remove all tags from todo**
   - Edit todo with tags
   - Deselect all tags
   - Save
   - Verify no tags displayed on todo

#### Tag Filtering
9. **Filter by tag**
   - Select tag from "All Tags" dropdown
   - Verify only todos with that tag displayed
   - Verify other todos hidden

10. **Combine tag filter with search**
    - Enter search query
    - Select tag filter
    - Verify results match BOTH criteria (AND logic)

11. **Clear tag filter**
    - Apply tag filter
    - Select "All Tags"
    - Verify all todos displayed again

### Unit Tests

#### Validation
1. **Tag name validation**
   - Test empty name rejected
   - Test whitespace-only rejected
   - Test valid names accepted
   - Test trimming works

2. **Tag color validation**
   - Test valid hex codes accepted (#3B82F6, #FF0000)
   - Test invalid codes rejected (#XYZ, 3B82F6, rgb(255,0,0))
   - Test case-insensitivity (both #abc and #ABC accepted)

3. **Unique name constraint**
   - Test duplicate names rejected
   - Test uniqueness scoped to user_id
   - Test case-sensitivity

#### Database Operations
4. **CASCADE delete**
   - Create tag and assign to todos
   - Delete tag
   - Verify todo_tags associations removed
   - Verify todos still exist

5. **Many-to-many relationship**
   - Assign multiple tags to one todo
   - Assign one tag to multiple todos
   - Query and verify associations correct

6. **Tag filtering query**
   - Test SQL query returns correct todos
   - Test with multiple todos and tags
   - Test empty results when no matches

## Out of Scope

### Feature Exclusions
- ❌ Tag descriptions or notes (name only)
- ❌ Tag categories or groups
- ❌ Tag icons (color only for visual distinction)
- ❌ Tag hierarchy (parent/child tags)
- ❌ Smart tags (auto-tagging based on keywords)
- ❌ Tag suggestions or autocomplete
- ❌ Tag popularity metrics or usage stats
- ❌ Sharing tags between users
- ❌ Public/private tag visibility settings
- ❌ Tag templates or presets
- ❌ Bulk tag operations (apply tag to multiple todos at once)
- ❌ Tag-specific settings (beyond name and color)
- ❌ Tag search (searching within tag names)
- ❌ Multi-tag filtering (filter by multiple tags simultaneously)
  - **MVP**: Single tag filter only
  - **Future**: Add multi-select tag filter with AND/OR logic

### Export/Import Considerations
- Tag import/export handled in PRP 09 (Export & Import)
- This PRP focuses on tag CRUD and assignment only

## Success Metrics

### Adoption
- >60% of users create at least one tag
- Average tags per user: 5-10
- >40% of todos have at least one tag

### Usage
- Tags used for filtering >20% of the time
- Tag edits rare (names/colors stable after creation)
- Low tag deletion rate (users keep tags long-term)

### Performance
- Tag operations complete < 200ms (95th percentile)
- No performance degradation with 50+ tags
- Tag filtering remains fast with 500+ todos

### Quality
- Zero orphaned tag associations (CASCADE integrity)
- Unique constraint violations handled gracefully
- No tag name conflicts within user scope
- Color validation prevents invalid hex codes
