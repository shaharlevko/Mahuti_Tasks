const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'PrintView.css');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Updating PrintView.css for share dropdown...');

// Replace the old .share-dropdown class with .share-dropdown-container
content = content.replace(
  `.share-dropdown {
  position: relative;
  display: inline-block;
}`,
  `.share-dropdown-container {
  position: relative;
  display: inline-block;
}

.share-dropdown {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  background: white;
  border-radius: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 1000;
  min-width: 180px;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}`
);

// Remove the old .share-menu class if it exists
content = content.replace(
  `.share-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 5px;
  background: white;
  border-radius: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 1000;
  min-width: 150px;
}

`, ''
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('PrintView.css updated successfully!');
console.log('Updated share dropdown styling');
