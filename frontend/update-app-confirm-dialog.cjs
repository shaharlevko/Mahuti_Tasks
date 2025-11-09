const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Updating App.jsx to use custom confirm dialog...');

// Add import for ConfirmDialog
content = content.replace(
  "import PrintView from './components/PrintView';",
  "import PrintView from './components/PrintView';\nimport ConfirmDialog from './components/ConfirmDialog';"
);

// Add state for confirmation dialog after showDays state
content = content.replace(
  "const [showDays, setShowDays] = useState(5);",
  "const [showDays, setShowDays] = useState(5);\n  const [showConfirmDialog, setShowConfirmDialog] = useState(false);"
);

// Replace handleClearWeek function
const oldHandleClearWeek = `  const handleClearWeek = async () => {
    if (!currentSchedule) return;

    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to clear this week?');

    if (!confirmed) {
      return; // User clicked "No" - cancel the operation
    }

    try {
      // User clicked "Yes" - proceed with clearing
      await axios.delete(\`\${API_URL}/schedules/\${currentSchedule.id}/assignments\`);

      // Clear local state
      setAssignments({});

      alert('Week cleared successfully!');
    } catch (error) {
      console.error('Error clearing week:', error);
      alert('Failed to clear week. Please try again.');
    }
  };`;

const newHandleClearWeek = `  const handleClearWeek = () => {
    if (!currentSchedule) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmClear = async () => {
    setShowConfirmDialog(false);

    try {
      await axios.delete(\`\${API_URL}/schedules/\${currentSchedule.id}/assignments\`);
      setAssignments({});
    } catch (error) {
      console.error('Error clearing week:', error);
      alert('Failed to clear week. Please try again.');
    }
  };

  const handleCancelClear = () => {
    setShowConfirmDialog(false);
  };`;

content = content.replace(oldHandleClearWeek, newHandleClearWeek);

// Add ConfirmDialog component before closing DndProvider
const oldClosingDiv = `        </div>
      </div>
    </DndProvider>
  );
}`;

const newClosingDiv = `        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        message="Are you sure you want to clear this week?"
        onConfirm={handleConfirmClear}
        onCancel={handleCancelClear}
      />
    </DndProvider>
  );
}`;

content = content.replace(oldClosingDiv, newClosingDiv);

fs.writeFileSync(filePath, content, 'utf8');

console.log('App.jsx updated successfully!');
console.log('Changes:');
console.log('1. Added ConfirmDialog import');
console.log('2. Added showConfirmDialog state');
console.log('3. Updated handleClearWeek to use custom dialog');
console.log('4. Added handleConfirmClear and handleCancelClear');
console.log('5. Added ConfirmDialog component to render');
