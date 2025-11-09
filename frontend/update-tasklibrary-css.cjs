const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'TaskLibrary.css');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Updating TaskLibrary.css...');

// Add drag styles for task items
const dragStyles = `
.task-info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: linear-gradient(135deg, #FFF9F0 0%, #FFFEF8 100%);
  border-radius: 8px;
  border-left: 4px solid #FFCBA4;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: move;
}

.task-info-item:hover {
  transform: translateX(3px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}

.task-info-item.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.task-info-item.drag-over {
  border-top: 3px solid #FFD700;
  background: linear-gradient(135deg, #FFF9E6 0%, #FFFEF8 100%);
}`;

content = content.replace(
  `.task-info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: linear-gradient(135deg, #FFF9F0 0%, #FFFEF8 100%);
  border-radius: 8px;
  border-left: 4px solid #FFCBA4;
  transition: transform 0.2s, box-shadow 0.2s;
}

.task-info-item:hover {
  transform: translateX(3px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}`,
  dragStyles
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('TaskLibrary.css updated successfully!');
console.log('Added drag and drop styles for task reordering');
