# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mahuti Weekly Task Schedule Platform - A daycare staff scheduling application with drag-and-drop task assignment, designed for A4 horizontal print output with a playful, pastel-themed design.

**Target Users:** Daycare managers creating weekly staff schedules
**Key Feature:** Drag staff members to assign tasks across a 5-day weekly grid, then print professional A4 schedules

## Development Commands

```bash
# Install dependencies (run from root)
npm install

# Start both servers (recommended)
npm run dev

# Start servers separately
npm run backend   # Express API on http://localhost:3001
npm run frontend  # Vite dev server on http://localhost:5173

# Frontend only (from frontend/ directory)
cd frontend
npm run dev       # Development server
npm run build     # Production build
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

## Architecture

### Full-Stack Structure

This is a **monorepo** containing both frontend and backend:

```
Mahuti_Tasks/
├── backend/
│   ├── src/
│   │   ├── database.js      # SQLite schema + initialization
│   │   └── server.js         # Express REST API
│   ├── cleanup-duplicates.js # Utility to remove duplicate data
│   ├── update-colors.js      # Utility to update to pastel colors
│   └── mahuti_tasks.db       # SQLite database (auto-created)
├── frontend/                 # Separate Vite/React app
│   ├── src/
│   │   ├── components/
│   │   │   ├── WeeklySchedule.jsx  # Main drag-drop grid
│   │   │   ├── TaskLibrary.jsx     # Staff sidebar with add/delete
│   │   │   └── PrintView.jsx       # A4 horizontal print layout
│   │   ├── App.jsx           # Root component with state management
│   │   └── App.css           # Global pastel theme
│   └── package.json          # Separate frontend dependencies
└── package.json              # Root scripts only (no deps)
```

### Data Flow Pattern

**Assignment Creation Flow:**
1. User drags staff member from `TaskLibrary` onto `WeeklySchedule` grid cell
2. `App.jsx` calls `handleTaskDrop(taskId, day, staffId)`
3. POST to `/api/assignments` with conflict detection
4. Backend validates no double-booking for same staff/day/time_slot
5. Returns 409 if conflict, else creates assignment
6. Frontend updates local state and re-renders grid

**State Management:** All state lives in `App.jsx` (staff, tasks, assignments, currentSchedule). Components receive props and callbacks only.

### Database Schema

SQLite with 5 tables:
- **staff**: Unique names (UNIQUE constraint), pastel colors
- **tasks**: Unique names (UNIQUE constraint), emoji icons, categories
- **schedules**: Weekly metadata (week_start, week_end)
- **schedule_assignments**: Links staff + task + day_of_week + time_slot
- **templates**: Saved schedule patterns (future feature)

**Important:** `database.js` only inserts sample data if `staff` table is empty (prevents duplicates on restart).

### API Architecture

RESTful CRUD for each entity:
- `/api/staff` - GET, POST, PUT/:id, DELETE/:id
- `/api/tasks` - GET, POST, PUT/:id, DELETE/:id
- `/api/schedules` - GET, GET/:id (with assignments), POST, PUT/:id, DELETE/:id
- `/api/assignments` - POST (with conflict check), PUT/:id, DELETE/:id
- `/api/templates` - GET, POST, DELETE/:id

**Conflict Detection:** POST `/api/assignments` queries for existing `(schedule_id, staff_id, day_of_week, time_slot)` before inserting.

## Design System

### Pastel Color Palette

Referenced in `TaskLibrary.jsx` and `database.js`:
```javascript
const PASTEL_COLORS = [
  '#FFB5A7',  // Coral
  '#F4B8D4',  // Pink
  '#B4D7E8',  // Blue
  '#FFF4A3',  // Yellow
  '#C7ECDE',  // Green
  '#D8BFD8',  // Lavender
  '#FFCBA4',  // Orange
  '#FFD1DC',  // Rose
  '#A8D8EA'   // Cyan
];
```

### Typography & Theme

- **Font:** Comic Sans MS for playful, daycare-appropriate feel
- **Print Layout:** A4 horizontal (landscape) via `@media print` in `PrintView.css`
- **Decorations:** Sunflower (🌻) headers, flower/butterfly footer elements

## Critical Implementation Details

### Drag-and-Drop

Uses `react-dnd` with HTML5 backend:
- **Draggable:** Staff items in `TaskLibrary` (type: 'STAFF')
- **Drop Targets:** Each cell in `WeeklySchedule` grid
- **Drop Handler:** Extracts `staffId` from drag item, passes to `onTaskDrop(taskId, day, staffId)`

### Print Optimization

`PrintView.jsx` features:
- `.no-print` class hides controls
- `@page { size: A4 landscape; margin: 10mm; }`
- WYSIWYG: Screen preview matches printed output
- Decorative elements scale for print

### Database Initialization Behavior

`database.js` checks if staff table is empty before inserting sample data. This prevents duplicate entries on every server restart. If you need to reset the database:

```bash
# Stop backend, delete database, restart
cd backend
rm mahuti_tasks.db
cd ..
npm run backend  # Will recreate with fresh sample data
```

**Cleanup Scripts:**
- `backend/cleanup-duplicates.js` - Removes duplicate staff/tasks by name
- `backend/update-colors.js` - Updates existing records to pastel colors

## Testing & Debugging

**Database Inspection:**
```bash
# View current staff
curl http://localhost:3001/api/staff

# View current tasks
curl http://localhost:3001/api/tasks
```

**Common Issues:**
- **Duplicates on restart:** Database initialization was modified to prevent this. If still occurring, check `database.js` line 82-95.
- **Print layout broken:** Ensure browser supports `@media print` and A4 landscape sizing. Test in Chrome/Edge for best results.
- **Drag-drop not working:** Verify `DndProvider` wraps app in `App.jsx` and `react-dnd-html5-backend` is installed.

## Future Development Notes

**Planned Features (from PRD):**
- Template saving/loading (database table exists, UI pending)
- PDF export (currently browser print only)
- Schedule history browsing
- Multi-user authentication
- Bulk task operations

**Architecture Considerations:**
- Currently single schedule per session (created on app load in `App.jsx`)
- No schedule selection UI (would need schedule picker component)
- No user authentication (all data accessible to all users)
