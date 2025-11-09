const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'WeeklySchedule.css');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Adding CSS for Clear This Week button...');

// Add CSS at the end of the file
const clearButtonCSS = `

/* Clear This Week button */
.schedule-footer {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  padding: 15px;
  background: linear-gradient(135deg, #FFF9F5 0%, #FFFEF8 100%);
  border-radius: 10px;
}

.clear-week-btn {
  padding: 12px 30px;
  background: linear-gradient(135deg, #FFB5A7 0%, #FFC4B0 100%);
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 1.1em;
  font-weight: bold;
  font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive, sans-serif;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 8px rgba(255, 181, 167, 0.3);
}

.clear-week-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(255, 181, 167, 0.4);
}

.clear-week-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(255, 181, 167, 0.3);
}
`;

content += clearButtonCSS;

fs.writeFileSync(filePath, content, 'utf8');

console.log('WeeklySchedule.css updated successfully!');
console.log('Added CSS for Clear This Week button');
