const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'main.jsx');

console.log('Adding routing to main.jsx...');

const newContent = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import SharedView from './components/SharedView.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/shared/:scheduleId" element={<SharedView />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
`;

fs.writeFileSync(filePath, newContent, 'utf8');

console.log('main.jsx updated successfully!');
console.log('Added:');
console.log('1. BrowserRouter import');
console.log('2. SharedView import');
console.log('3. Routes configuration');
console.log('4. Route for "/" (main app)');
console.log('5. Route for "/shared/:scheduleId" (shared view)');
