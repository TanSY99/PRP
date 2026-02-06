# PRP 09: Export & Import

## Feature Overview
Implement comprehensive data export and import functionality for backup, data transfer, and analysis. Support JSON format for complete backup/restore with all relationships preserved, and CSV format for analysis in spreadsheet applications. JSON import includes intelligent ID remapping, relationship preservation, tag conflict resolution, and validation. Enable users to migrate data between devices, backup before major changes, and analyze productivity in Excel/Google Sheets.

## User Stories
- As a user, I can export all my todos to JSON format for complete backup.
- As a user, I can export todos to CSV format for analysis in spreadsheets.
- As a user, I can import previously exported JSON files to restore my data.
- As a user, the export filename includes the current date for easy organization.
- As a user, import validates data and shows clear errors if file is invalid.
- As a user, imported todos preserve all relationships (tags, subtasks, recurrence).
- As a user, tag name conflicts during import reuse existing tags instead of duplicating.
- As a user, I see success messages with count of imported todos.
- As a user, I can transfer todos between devices by exporting and importing.

## User Flow

### JSON Export
1. User clicks **"Export JSON"** button (green, top-right of page).
2. Browser initiates file download immediately.
3. Filename generated: `todos-YYYY-MM-DD.json` (e.g., `todos-2025-11-02.json`).
4. File contains complete JSON with all todos, tags, tag associations, and subtasks.
5. Success notification: "Exported X todos to JSON".
6. User saves file to desired location.

### CSV Export
1. User clicks **"Export CSV"** button (dark green, top-right).
2. Browser downloads CSV file: `todos-YYYY-MM-DD.csv`.
3. File contains flattened todo data (no subtasks, tags as comma-separated).
4. Success notification: "Exported X todos to CSV".
5. User opens in Excel, Google Sheets, or Numbers for analysis.

### JSON Import
1. User clicks **"Import"** button (blue, top-right).
2. File picker opens (accepts `.json` files only).
3. User selects previously exported JSON file.
4. File uploaded to server.
5. Server validates JSON structure and data.
6. If valid:
   - Todos created with new IDs
   - Tags matched by name (reuse existing) or created
   - Subtasks recreated and linked
   - Todo counts update
   - Success message: "Successfully imported X todos"
7. If invalid:
   - Error message displayed
   - No data imported
   - Specific error reason shown

## Technical Requirements

### Database Schema
**No new tables required** - uses existing:
- `todos` table
- `tags` table
- `todo_tags` junction table
- `subtasks` table

### Type Definitions
```typescript
interface ExportData {
  version: string; // Export format version (e.g., "1.0")
  export_date: string; // ISO timestamp
  user_id: number; // Original user ID (for reference)
  todos: TodoExport[];
  tags: TagExport[];
  todo_tags: TodoTagExport[];
  subtasks: SubtaskExport[];
}

interface TodoExport {
  id: number; // Original ID (remapped on import)
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: 'high' | 'medium' | 'low';
  is_recurring: boolean;
  recurrence_pattern: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  reminder_minutes: number | null;
  created_at: string;
  updated_at: string;
}

interface TagExport {
  id: number; // Original ID
  name: string;
  color: string;
}

interface TodoTagExport {
  todo_id: number; // References TodoExport.id
  tag_id: number; // References TagExport.id
}

interface SubtaskExport {
  id: number; // Original ID
  todo_id: number; // References TodoExport.id
  title: string;
  completed: boolean;
  position: number;
}

interface CSVRow {
  id: number;
  title: string;
  completed: string; // "true" or "false"
  due_date: string;
  priority: string;
  is_recurring: string;
  recurrence_pattern: string;
  reminder_minutes: string;
  tags: string; // Comma-separated tag names
  created_at: string;
}
```

### API Endpoints

#### Export JSON
- `GET /api/todos/export`
- Query params: None (exports all user's todos)
- Response:
  - Content-Type: `application/json`
  - Content-Disposition: `attachment; filename="todos-YYYY-MM-DD.json"`
  - Body: `ExportData`
- Process:
  1. Fetch all todos for authenticated user
  2. Fetch all tags for user
  3. Fetch all todo_tags associations
  4. Fetch all subtasks for user's todos
  5. Build ExportData structure
  6. Return as JSON file download

**Example Export**:
```json
{
  "version": "1.0",
  "export_date": "2025-11-02T15:30:00Z",
  "user_id": 5,
  "todos": [
    {
      "id": 1,
      "title": "Weekly Team Meeting",
      "completed": false,
      "due_date": "2025-11-05T14:00:00",
      "priority": "high",
      "is_recurring": true,
      "recurrence_pattern": "weekly",
      "reminder_minutes": 60,
      "created_at": "2025-11-01T10:00:00",
      "updated_at": "2025-11-01T10:00:00"
    }
  ],
  "tags": [
    { "id": 1, "name": "Work", "color": "#3B82F6" }
  ],
  "todo_tags": [
    { "todo_id": 1, "tag_id": 1 }
  ],
  "subtasks": [
    {
      "id": 1,
      "todo_id": 1,
      "title": "Prepare agenda",
      "completed": false,
      "position": 0
    }
  ]
}
```

#### Export CSV
- `GET /api/todos/export/csv`
- Response:
  - Content-Type: `text/csv`
  - Content-Disposition: `attachment; filename="todos-YYYY-MM-DD.csv"`
  - Body: CSV formatted data
- Process:
  1. Fetch all todos with tags
  2. Flatten to CSV rows
  3. Join tag names with commas
  4. Return as CSV file

**Example CSV**:
```csv
ID,Title,Completed,Due Date,Priority,Recurring,Pattern,Reminder,Tags,Created At
1,"Weekly Team Meeting",false,"2025-11-05T14:00:00","high",true,"weekly",60,"Work, Important","2025-11-01T10:00:00"
2,"Grocery Shopping",false,"2025-11-03T18:00:00","low",false,"",,"Personal","2025-11-02T09:00:00"
```

#### Import JSON
- `POST /api/todos/import`
- Body: Multipart form-data with file
- Content-Type: `multipart/form-data`
- Response: `{ success: true, imported_count: number, message: string }`
- Process:
  1. **Validate file**:
     - Check JSON format
     - Validate version field
     - Check required fields
  2. **ID Remapping**:
     - Create mapping for todos: `oldId -> newId`
     - Create mapping for tags: `oldId -> newId`
     - Create mapping for subtasks: `oldId -> newId`
  3. **Tag Conflict Resolution**:
     - For each tag in import:
       - Check if tag with same name exists for user
       - If exists: Reuse existing tag ID
       - If not: Create new tag, store new ID in mapping
  4. **Create Todos**:
     - Insert todos with new IDs
     - Link to current user
     - Use original metadata
  5. **Create Subtasks**:
     - Insert with new todo_id from mapping
     - Preserve position and title
  6. **Create Tag Associations**:
     - Use remapped todo_id and tag_id
     - Insert into todo_tags table
  7. **Return Results**:
     - Success message with count
     - List of created todo IDs (optional)

### Validation Rules

#### JSON Import Validation
1. **File Format**:
   - Valid JSON syntax
   - File size < 10MB (configurable)
2. **Structure Validation**:
   - Has `version` field (string)
   - Has `todos` array
   - Optional: `tags`, `todo_tags`, `subtasks` arrays
3. **Todo Validation**:
   - Each todo has required fields: `title`, `completed`, `priority`
   - Priority in ['high', 'medium', 'low']
   - Recurrence pattern in ['daily', 'weekly', 'monthly', 'yearly', null]
   - Due dates in valid ISO format
4. **Tag Validation**:
   - Name non-empty
   - Color valid hex format
5. **Relationship Validation**:
   - All `todo_tags.todo_id` references exist in `todos` array
   - All `todo_tags.tag_id` references exist in `tags` array
   - All `subtasks.todo_id` references exist in `todos` array

**Error Responses**:
- 400 Bad Request: Invalid JSON, missing fields, invalid enums
- 413 Payload Too Large: File > 10MB
- 500 Internal Server Error: Database errors

#### CSV Export Format
- **Headers**: Fixed column names
- **Encoding**: UTF-8
- **Line endings**: CRLF (Windows) or LF (Unix)
- **Quotes**: Strings with commas/quotes escaped
- **Empty values**: Empty string for null

### ID Remapping Logic

#### Scenario
Original export:
- Todo ID 1 → Import creates as ID 42
- Tag ID 5 → Reuses existing tag ID 3 (same name)
- Subtask ID 10 → Import creates as ID 67

#### Implementation
```typescript
// Step 1: Create ID mappings
const todoIdMap = new Map<number, number>(); // oldId -> newId
const tagIdMap = new Map<number, number>();
const subtaskIdMap = new Map<number, number>();

// Step 2: Process tags first (resolve conflicts)
for (const tag of exportData.tags) {
  const existingTag = await findTagByNameAndUser(tag.name, currentUserId);
  if (existingTag) {
    tagIdMap.set(tag.id, existingTag.id); // Reuse existing
  } else {
    const newTag = await createTag({ name: tag.name, color: tag.color }, currentUserId);
    tagIdMap.set(tag.id, newTag.id); // New tag created
  }
}

// Step 3: Create todos
for (const todo of exportData.todos) {
  const newTodo = await createTodo({
    title: todo.title,
    completed: todo.completed,
    due_date: todo.due_date,
    priority: todo.priority,
    is_recurring: todo.is_recurring,
    recurrence_pattern: todo.recurrence_pattern,
    reminder_minutes: todo.reminder_minutes
  }, currentUserId);
  todoIdMap.set(todo.id, newTodo.id);
}

// Step 4: Create subtasks with remapped todo_id
for (const subtask of exportData.subtasks) {
  const newTodoId = todoIdMap.get(subtask.todo_id);
  const newSubtask = await createSubtask({
    todo_id: newTodoId,
    title: subtask.title,
    completed: subtask.completed,
    position: subtask.position
  });
  subtaskIdMap.set(subtask.id, newSubtask.id);
}

// Step 5: Create tag associations with remapped IDs
for (const assoc of exportData.todo_tags) {
  const newTodoId = todoIdMap.get(assoc.todo_id);
  const newTagId = tagIdMap.get(assoc.tag_id);
  await createTodoTag(newTodoId, newTagId);
}
```

### Tag Conflict Resolution

#### Scenario 1: Tag Exists
- Import contains tag "Work" with color #3B82F6
- User already has tag "Work" with color #FF0000
- **Resolution**: Reuse existing "Work" tag (ignore color from import)

#### Scenario 2: Tag Doesn't Exist
- Import contains tag "Project Alpha"
- User has no tag named "Project Alpha"
- **Resolution**: Create new tag with name and color from import

#### Scenario 3: Case Sensitivity
- Import: "work"
- Existing: "Work"
- **Resolution**: Treat as case-sensitive (create new "work" tag)
- **Alternative**: Case-insensitive matching (config option)

## UI Components

### Export Buttons
- **Location**: Top-right corner of main page, near "Logout" button
- **Export JSON Button**:
  - Text: "Export JSON"
  - Icon: 📥 or download icon
  - Color: Green background, white text
  - Size: Medium button
- **Export CSV Button**:
  - Text: "Export CSV"
  - Icon: 📊 or spreadsheet icon
  - Color: Dark green background, white text
  - Size: Medium button
- **Layout**: Side by side or stacked based on screen width

### Import Button
- **Location**: Next to export buttons
- **Text**: "Import"
- **Icon**: 📤 or upload icon
- **Color**: Blue background, white text
- **Action**: Opens file picker (accepts .json)

### File Picker
- **Trigger**: Clicking "Import" button
- **Accept**: `.json` files only
- **Behavior**: Native browser file input
- **Multiple**: Not allowed (one file at a time)

### Success Messages
- **Location**: Top of page (toast notification)
- **Types**:
  - "Successfully exported X todos to JSON"
  - "Successfully exported X todos to CSV"
  - "Successfully imported X todos"
- **Duration**: 3 seconds auto-dismiss
- **Color**: Green background

### Error Messages
- **Location**: Top of page (toast notification)
- **Types**:
  - "Failed to import todos. Please check the file format."
  - "Invalid JSON format"
  - "File size exceeds 10MB limit"
  - "Failed to export todos" (network error)
- **Duration**: 5 seconds (or manual dismiss)
- **Color**: Red background

### Import Progress Indicator (Optional)
- **Location**: Modal overlay
- **Content**: "Importing todos... Please wait"
- **Spinner**: Loading animation
- **Purpose**: Show feedback for large imports (>100 todos)

## Edge Cases

### Export
- No todos to export → export empty arrays, show warning
- Very large dataset (>10,000 todos) → warn user, may take time
- Network error during export → show error, retry button
- Special characters in titles → properly escaped in CSV

### Import
- Empty JSON file → validation error
- Missing required fields → specific error message
- Invalid enum values (priority, pattern) → validation error
- Circular tag references (shouldn't happen) → handle gracefully
- Import same file twice → creates duplicate todos (by design)
- Very large import (>1000 todos) → show progress, may take 10+ seconds
- Tag name too long → truncate or show error
- Corrupted JSON → parse error, clear message
- Old export version → attempt migration or show incompatibility error

### Tag Conflicts
- Import tag already exists with different color → reuse existing (ignore color)
- Import tag name matches multiple existing tags (edge case) → use first match
- Tag deleted after export, before import → recreate tag

### Data Integrity
- Import interrupted midway → rollback transaction (if supported) or partial import
- Database constraint violations → rollback and show error
- Duplicate todo IDs in import file → validation error

## Acceptance Criteria

### JSON Export
- ✓ Export button creates JSON file immediately
- ✓ Filename includes current date (YYYY-MM-DD)
- ✓ Export includes all todos, tags, associations, subtasks
- ✓ JSON is valid and properly formatted
- ✓ Success message shows todo count

### CSV Export
- ✓ Export button creates CSV file
- ✓ Filename includes current date
- ✓ CSV has headers and proper formatting
- ✓ Tags joined as comma-separated string
- ✓ Opens correctly in Excel/Google Sheets

### JSON Import
- ✓ Import button opens file picker (.json only)
- ✓ Valid JSON uploads successfully
- ✓ Invalid JSON shows clear error
- ✓ Imported todos appear immediately in list
- ✓ All relationships preserved (tags, subtasks)
- ✓ IDs remapped correctly
- ✓ Existing tags reused (not duplicated)
- ✓ Success message shows imported count

### Error Handling
- ✓ Specific errors for: invalid JSON, missing fields, wrong format
- ✓ File size limit enforced (10MB)
- ✓ Network errors handled gracefully
- ✓ User-friendly error messages

## Testing Requirements

### E2E Tests
- Export todos to JSON
- Export todos to CSV
- Import valid JSON file
- Import invalid JSON (show error)
- Import preserves all todo data
- Import preserves subtasks
- Import preserves tag associations
- Import reuses existing tags
- Import creates new tags
- Import same file twice (creates duplicates)
- Export then import (full roundtrip)

### Unit Tests
- JSON serialization/deserialization
- CSV row formatting (commas, quotes)
- ID remapping logic
- Tag conflict resolution (name matching)
- Validation functions (JSON structure, fields)
- Filename generation with date

### Integration Tests
- Export API returns correct data
- Import API creates todos correctly
- Transaction rollback on error (if supported)

## Out of Scope
- Selective export (export only specific todos)
- Export/import templates separately
- Export/import user settings
- Incremental sync (merge, not replace)
- Import from other todo apps (different formats)
- Automatic backups
- Cloud storage integration
- Export to PDF or other formats

## Success Metrics
- Users export data at least once per month (backup behavior)
- Import success rate >95% (validation catches issues)
- Export/import roundtrip preserves 100% of data
- CSV exports used for analysis (tracking engagement)
- Average export file size <1MB

## Screenshots Reference
- Export/import buttons layout
- File picker for import
- Success notification after export
- Error message for invalid import
- Todo list after import (showing imported data)
