# PRP 07: Template System

## Feature Overview
Implement comprehensive template system for saving and reusing todo patterns. Users can save frequently used todo configurations as templates with all metadata (priority, recurrence, reminders, subtasks), organize them by category, and instantly create new todos from saved templates. Templates preserve all settings except specific due dates and tags.

## User Stories
- As a user, I can save the current todo form configuration as a reusable template to avoid repetitive data entry.
- As a user, I can organize templates by category (Work, Personal, Finance, etc.) for better organization.
- As a user, I can create todos instantly from templates with one click.
- As a user, I can view all my saved templates in a dedicated template manager modal.
- As a user, I can edit template names, descriptions, and categories.
- As a user, I can delete templates I no longer need.
- As a user, templates preserve priority, recurrence settings, reminder timing, and subtasks.

## User Flow

### Creating Templates
1. User fills out todo form with desired configuration:
   - Title (used as template title_template)
   - Priority level
   - Recurrence settings (if applicable)
   - Reminder timing (if applicable)
2. User clicks **"💾 Save as Template"** button (appears when title is filled).
3. Save template modal opens with:
   - Name input (required, for template identification)
   - Description textarea (optional, explains template purpose)
   - Category input (optional, for organizing templates)
4. User fills template metadata and clicks **"Save Template"**.
5. Template saved to database, linked to current user.
6. Modal closes, success message displays.
7. User can continue creating the todo or clear the form.

### Using Templates from Dropdown
1. User opens todo form.
2. User finds **"Use Template"** dropdown above form.
3. Dropdown shows all templates with format: `"Template Name (Category)"`.
4. User selects a template from dropdown.
5. Todo created **instantly** with template settings.
6. Form resets to default state.
7. New todo appears in appropriate section (Overdue/Pending).

### Using Templates from Manager
1. User clicks **"📋 Templates"** button (top navigation).
2. Template manager modal opens showing all saved templates.
3. Each template displays:
   - Name (bold, prominent)
   - Description (if provided)
   - Category badge (if provided, color-coded)
   - Priority badge (color-coded)
   - 🔄 badge if recurring with pattern name
   - 🔔 badge if reminder set with timing
4. User clicks **"Use"** button on any template.
5. Todo created immediately from template.
6. Modal closes automatically.
7. New todo appears in todo list.

### Managing Templates
1. User opens template manager modal.
2. User can:
   - Browse all templates
   - Preview template settings
   - Edit template (name, description, category)
   - Delete template (with confirmation)
3. Changes to templates take effect immediately.
4. **Important**: Editing/deleting templates does NOT affect existing todos created from them.

## Technical Requirements

### Database Schema

#### New Table: `templates`
```sql
CREATE TABLE templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL, -- Template identifier
  description TEXT, -- Optional purpose/details
  category TEXT, -- Optional grouping (Work, Personal, etc.)
  title_template TEXT NOT NULL, -- The todo title to use
  priority TEXT DEFAULT 'medium', -- high/medium/low
  is_recurring INTEGER DEFAULT 0, -- Boolean
  recurrence_pattern TEXT, -- daily/weekly/monthly/yearly
  reminder_minutes INTEGER, -- Minutes before due date
  subtasks_json TEXT, -- JSON serialized subtasks array
  due_date_offset_days INTEGER, -- Days from "now" for due date
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_category ON templates(category);
```

**Schema Notes**:
- **User-scoped**: Each template belongs to specific user
- **Subtasks serialization**: Stored as JSON string array: `["Subtask 1", "Subtask 2"]`
- **Due date handling**: `due_date_offset_days` calculates due date from current time (e.g., 7 = 1 week from now)
- **Metadata preservation**: Saves priority, recurrence, reminder settings
- **No tag storage**: Tags selected when creating from template
- **CASCADE delete**: Deleting user removes their templates

### Type Definitions
```typescript
interface Template {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  category: string | null;
  title_template: string;
  priority: 'high' | 'medium' | 'low';
  is_recurring: boolean;
  recurrence_pattern: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  reminder_minutes: number | null;
  subtasks_json: string | null; // JSON array as string
  due_date_offset_days: number | null;
  created_at: string;
  updated_at: string;
}

interface TemplateRequest {
  name: string;
  description?: string;
  category?: string;
  title_template: string;
  priority?: 'high' | 'medium' | 'low';
  is_recurring?: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  reminder_minutes?: number;
  subtasks_json?: string; // JSON string
  due_date_offset_days?: number;
}

interface TemplateWithDetails extends Template {
  subtasks?: string[]; // Parsed from subtasks_json
}
```

### API Endpoints

#### Get All Templates (User-Specific)
- `GET /api/templates`
- Returns all templates for authenticated user
- Sorted by category then name
- Response:
  ```json
  {
    "templates": [
      {
        "id": 1,
        "name": "Weekly Team Meeting",
        "description": "Recurring standup with team",
        "category": "Work",
        "title_template": "Team Standup",
        "priority": "medium",
        "is_recurring": true,
        "recurrence_pattern": "weekly",
        "reminder_minutes": 60,
        "subtasks_json": "[\"Prepare agenda\",\"Review action items\"]",
        "due_date_offset_days": null
      }
    ]
  }
  ```

#### Create Template
- `POST /api/templates`
- Body: `TemplateRequest`
- Validates:
  - Name: non-empty, trimmed
  - Title template: non-empty, trimmed
  - Priority: valid enum value
  - Recurrence pattern: valid enum if recurring
  - Subtasks JSON: valid JSON array if provided
- Response: `{ template: Template }`

#### Update Template
- `PUT /api/templates/[id]`
- Body: `Partial<TemplateRequest>`
- Validates ownership (user_id matches authenticated user)
- Updates `updated_at` timestamp
- Response: `{ template: Template }`

#### Delete Template
- `DELETE /api/templates/[id]`
- Validates ownership
- Removes template (does NOT affect todos created from it)
- Response: `{ success: true }`

#### Use Template (Create Todo from Template)
- `POST /api/templates/[id]/use`
- Optional body: `{ due_date?: string, tag_ids?: number[] }`
- Process:
  1. Fetch template
  2. Create new todo with template settings
  3. Calculate due date:
     - If `due_date` provided in request: use it
     - If `due_date_offset_days` set: calculate from now
     - Otherwise: null (no due date)
  4. Parse `subtasks_json` and create subtasks
  5. Assign tags if `tag_ids` provided
  6. Return created todo with relationships
- Response: `{ todo: TodoWithSubtasksAndTags }`

### Validation Rules

#### Template Name
- **Required**: Cannot be empty or whitespace
- **Trimmed**: Leading/trailing whitespace removed
- **Max length**: 100 characters (recommended)
- **Uniqueness**: Not enforced (users can have duplicate names)

#### Title Template
- **Required**: Cannot be empty
- **Trimmed**: Leading/trailing whitespace removed
- **Max length**: 500 characters

#### Description
- **Optional**: Can be null or empty
- **Max length**: 1000 characters (recommended)

#### Category
- **Optional**: Can be null
- **Trimmed**: If provided
- **Common values**: Work, Personal, Finance, Health, Education
- **Custom allowed**: Users can enter any category

#### Subtasks JSON
- **Format**: JSON array of strings `["Task 1", "Task 2"]`
- **Validation**: Must parse as valid JSON array
- **Empty array allowed**: `[]`
- **Null allowed**: No subtasks

#### Due Date Offset
- **Optional**: Can be null (no automatic due date)
- **Range**: 0 to 365 days recommended
- **Calculation**: Added to current Singapore time when template used

### Subtasks Handling

#### Saving Subtasks to Template
1. User creates todo with subtasks in form (if subtask feature exists).
2. User clicks "Save as Template".
3. Client serializes subtasks array to JSON string:
   ```javascript
   const subtasksJson = JSON.stringify(["Subtask 1", "Subtask 2"]);
   ```
4. Send in template creation request.

#### Creating Subtasks from Template
1. User uses template.
2. Server creates todo first.
3. Parse `subtasks_json`:
   ```javascript
   const subtasks = JSON.parse(template.subtasks_json || "[]");
   ```
4. For each subtask title:
   - Create subtask with `todo_id` = new todo ID
   - Set position based on array index
   - Set `completed = false`
5. Return todo with subtasks array.

## UI Components

### Save as Template Button
- **Location**: Below todo form, next to "Add" button
- **Text**: "💾 Save as Template"
- **Appearance**: 
  - Only visible when title field is filled
  - Secondary button style (outlined, not primary)
  - Green accent color
- **Action**: Opens save template modal

### Save Template Modal
- **Title**: "Save as Template"
- **Fields**:
  1. **Name** (text input, required)
     - Label: "Template Name"
     - Placeholder: "e.g., Weekly Report"
  2. **Description** (textarea, optional)
     - Label: "Description (optional)"
     - Placeholder: "What is this template for?"
  3. **Category** (text input, optional)
     - Label: "Category (optional)"
     - Placeholder: "e.g., Work, Personal, Finance"
- **Preview Section**: Shows what will be saved
  - Todo title
  - Priority badge
  - Recurrence badge (if set)
  - Reminder badge (if set)
  - Subtasks count (if any)
- **Buttons**:
  - "Save Template" (primary, green)
  - "Cancel" (secondary)

### Use Template Dropdown
- **Location**: Above todo form, below search/filter section
- **Label**: "Quick Create from Template:"
- **Dropdown**:
  - Placeholder: "Select a template..."
  - Options format: `"Template Name (Category)"` or just `"Template Name"` if no category
  - Grouped by category if many templates
  - Sorted alphabetically within groups
- **Behavior**:
  - On select: Immediately create todo
  - Show loading indicator briefly
  - Success message: "Created from template: [name]"
  - Dropdown resets to placeholder

### Templates Manager Button
- **Location**: Top navigation bar, near "Manage Tags" button
- **Text**: "📋 Templates"
- **Style**: Secondary button, blue accent
- **Action**: Opens template manager modal

### Template Manager Modal
- **Title**: "My Templates"
- **Header**: Shows template count: "X templates"
- **Template List**:
  - Each template shows:
    - **Name** (bold, 18px font)
    - **Description** (if set, gray text, 14px)
    - **Category** badge (if set, colored pill)
    - **Priority** badge (colored: red/yellow/blue)
    - **Recurring** indicator: "🔄 [pattern]" if applicable
    - **Reminder** indicator: "🔔 [X] minutes before" if set
    - **Action buttons**:
      - "Use" (primary, blue)
      - "Edit" (secondary, gray)
      - "Delete" (secondary, red)
  - Empty state: "No templates yet. Save your first template from the todo form!"
- **Filters** (if many templates):
  - Category filter dropdown
  - Search by name
- **Close Button**: X in top-right corner

### Edit Template Modal
- **Title**: "Edit Template"
- **Same fields** as Save Template Modal
- **Pre-filled** with current values
- **Buttons**:
  - "Update" (primary)
  - "Cancel" (secondary)

## Edge Cases

### Template Creation
- Creating template with empty title → error, prevent save
- Creating template with invalid JSON for subtasks → error, validate first
- Creating template with no priority set → default to 'medium'
- Creating template from recurring todo without due date → allow (user sets offset)

### Template Usage
- Using template with `due_date_offset_days` = 0 → due date = now (validation may reject)
- Using template when offset results in past date → validation error
- Using deleted template from dropdown (race condition) → show error, refresh list
- Network error during template usage → show error, don't clear form

### Template Management
- Editing template used by 100 todos → only template updated, todos unchanged
- Deleting template while someone uses it (race condition) → 404 error on use
- Very long template names → truncate in dropdown with ellipsis
- Many templates (>50) → implement pagination or virtual scrolling

## Acceptance Criteria

### Template Creation
- ✓ Can save todo form configuration as template
- ✓ Template name is required, description/category optional
- ✓ Template preserves: title, priority, recurrence, reminder, subtasks
- ✓ Template does NOT save: specific due dates, tags, todo ID
- ✓ Save template modal shows preview of what's being saved
- ✓ Success message after template creation

### Template Usage
- ✓ Can create todo from template via dropdown (instant creation)
- ✓ Can create todo from template via manager modal
- ✓ Template dropdown shows all templates with categories
- ✓ Created todo has all template settings applied
- ✓ Subtasks created from JSON in correct order
- ✓ Due date calculated from offset if set
- ✓ User can add tags when creating from template

### Template Management
- ✓ Template manager shows all user templates
- ✓ Can edit template name, description, category
- ✓ Can delete templates with confirmation
- ✓ Templates organized by category
- ✓ Empty state displayed when no templates exist
- ✓ Changes to templates don't affect existing todos

## Testing Requirements

### E2E Tests
- Create template from filled todo form
- Create todo from template via dropdown
- Create todo from template via manager
- Template preserves priority, recurrence, reminder
- Subtasks created from template JSON
- Edit template name and description
- Delete template
- Template usage with due date offset
- Error handling for invalid template data

### Unit Tests
- Subtasks JSON serialization and parsing
- Due date offset calculation (Singapore timezone)
- Template validation (name, title, JSON format)
- Category filtering logic
- Template sorting (category then name)

## Out of Scope
- Template sharing between users (future feature)
- Template versioning/history
- Template import/export separately from main export
- Template scheduling (auto-create at intervals)
- Template suggestions based on patterns

## Success Metrics
- Users can create templates in <5 clicks
- Template usage creates todo in <1 second
- Template manager loads <100ms for 50 templates
- 90% of users with 10+ todos create at least 1 template
- Template reuse rate >3x per template on average

## Screenshots Reference
- Save template button and modal flow
- Template dropdown integration in todo form
- Template manager modal layout
- Template preview with all metadata displayed
