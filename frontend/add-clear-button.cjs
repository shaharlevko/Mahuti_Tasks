const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'WeeklySchedule.jsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Adding Clear This Week button to WeeklySchedule...');

// Add onClearWeek to function parameters
content = content.replace(
  `function WeeklySchedule({
  tasks,
  staff,
  assignments,
  weekStartDate,
  showDays,
  onNavigateWeek,
  onShowDaysChange,
  onTaskDrop,
  onRemoveAssignment,
  onMoveAssignment
}) {`,
  `function WeeklySchedule({
  tasks,
  staff,
  assignments,
  weekStartDate,
  showDays,
  onNavigateWeek,
  onShowDaysChange,
  onTaskDrop,
  onRemoveAssignment,
  onMoveAssignment,
  onClearWeek
}) {`
);

// Add button after the table
content = content.replace(
  `      </table>
    </div>
  );
}`,
  `      </table>

      <div className="schedule-footer">
        <button
          className="clear-week-btn"
          onClick={onClearWeek}
          title="Clear all assignments for this week"
        >
          🗑️ Clear This Week
        </button>
      </div>
    </div>
  );
}`
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('WeeklySchedule.jsx updated successfully!');
console.log('Added:');
console.log('1. onClearWeek prop');
console.log('2. Clear This Week button at bottom');
