const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'TaskLibrary.jsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing import in TaskLibrary.jsx...');

// Fix the import to include useDrop
content = content.replace(
  "import { useDrag } from 'react-dnd';",
  "import { useDrag, useDrop } from 'react-dnd';"
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('Fixed! Added useDrop to imports.');
