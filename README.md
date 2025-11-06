# Mahuti Weekly Task Schedule Platform

A digital scheduling platform designed for daycare managers to create, organize, and print weekly task assignment tables for their staff.

## Features

✅ **Implemented**
- Drag-and-drop task assignment interface
- Weekly schedule grid with colorful, playful design
- Staff member management with color-coded names
- Task library with icons (Lunch 🌳, Dish 🥤, Water 💧, Snack 🍪, Activities 🎨)
- Conflict detection for double-booking prevention
- A4 horizontal print layout with daycare theme
- Print preview with decorative elements (flowers, nature icons)
- RESTful API for data management
- SQLite database for data persistence

🔨 **In Progress / Future Features**
- PDF export functionality
- Template saving and loading
- Schedule history
- Advanced reporting
- Multi-user access with permissions

## Tech Stack

**Frontend:**
- React with Vite
- React DnD for drag-and-drop
- Axios for API calls
- CSS with playful daycare theme

**Backend:**
- Node.js with Express
- SQLite database
- RESTful API architecture

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development servers:
```bash
# Option 1: Run both servers together
npm run dev

# Option 2: Run separately
npm run backend  # Backend API on http://localhost:3001
npm run frontend # Frontend on http://localhost:5173
```

3. Open your browser to `http://localhost:5173`

## Usage

### Creating a Weekly Schedule

1. **View the Schedule Grid**: The main interface shows a 5-day week (Sunday-Thursday) with task rows
2. **Drag Staff Members**: From the left sidebar, drag staff names to the schedule grid cells
3. **Assign Tasks**: Drop staff members on specific day/task combinations
4. **Remove Assignments**: Click the × button to remove an assignment
5. **Print Schedule**: Click "Print Schedule" button to view and print the formatted schedule

### Print Layout

The print view features:
- Horizontal A4 format
- Colorful headers with sunflower decorations
- Clear grid structure with task icons
- Color-coded day names and staff names
- Decorative footer with nature elements (flowers, butterflies, trees)

## Project Structure

```
Mahuti_Tasks/
├── backend/
│   └── src/
│       ├── database.js      # Database schema and initialization
│       └── server.js         # Express API server
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── WeeklySchedule.jsx    # Main schedule grid
│       │   ├── TaskLibrary.jsx       # Staff sidebar
│       │   └── PrintView.jsx         # Print-optimized view
│       ├── App.jsx
│       └── App.css
├── MahutiTasks_PRD.md       # Product Requirements Document
└── README.md
```

## API Endpoints

### Staff
- `GET /api/staff` - Get all staff members
- `POST /api/staff` - Create new staff member
- `PUT /api/staff/:id` - Update staff member
- `DELETE /api/staff/:id` - Delete staff member

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Schedules
- `GET /api/schedules` - Get all schedules
- `GET /api/schedules/:id` - Get schedule with assignments
- `POST /api/schedules` - Create new schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

### Assignments
- `POST /api/assignments` - Create task assignment (with conflict detection)
- `PUT /api/assignments/:id` - Update assignment
- `DELETE /api/assignments/:id` - Delete assignment

### Templates
- `GET /api/templates` - Get all templates
- `POST /api/templates` - Create template
- `DELETE /api/templates/:id` - Delete template

## Design Features

- **Playful Color Scheme**: Bright, child-friendly colors throughout
- **Custom Icons**: Task-specific emojis for quick visual identification
- **Friendly Typography**: Comic Sans MS for approachable, daycare-appropriate feel
- **Responsive Animations**: Subtle hover effects and transitions
- **Print Optimization**: Clean, professional output suitable for posting in staff areas

## Database Schema

- **staff**: Store staff member information with colors
- **tasks**: Task library with icons and categories
- **schedules**: Weekly schedule metadata
- **schedule_assignments**: Individual task assignments linking staff, tasks, and days
- **templates**: Saved schedule templates for reuse

## Sample Data

The system comes pre-loaded with:
- 6 staff members: Rocio, Ruty, Flor, Vivi, Amit, Mayo
- 5 task types: Lunch, Dish, Water, Snack, Activities

## Contributing

This is an internal project. For issues or enhancements, please contact the development team.

## License

Proprietary - All rights reserved
