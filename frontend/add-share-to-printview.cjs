const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'PrintView.jsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Adding share functionality to PrintView.jsx...');

// Update function signature to include scheduleId
content = content.replace(
  'function PrintView({ tasks, staff, assignments, weekStartDate, showDays, onClose }) {',
  'function PrintView({ tasks, staff, assignments, weekStartDate, showDays, onClose, scheduleId }) {'
);

// Add state for share dropdown
content = content.replace(
  'const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);',
  `const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);`
);

// Add share methods before handlePrint
const shareMethods = `
  const getShareUrl = () => {
    const baseUrl = window.location.origin;
    return \`\${baseUrl}/shared/\${scheduleId}\`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      alert('Link copied to clipboard!');
      setShowShareDropdown(false);
    } catch (error) {
      console.error('Error copying link:', error);
      alert('Failed to copy link');
    }
  };

  const handleShareWhatsApp = () => {
    const url = getShareUrl();
    const text = \`Check out this weekly schedule: \${url}\`;
    window.open(\`https://wa.me/?text=\${encodeURIComponent(text)}\`, '_blank');
    setShowShareDropdown(false);
  };

  const handleShareEmail = () => {
    const url = getShareUrl();
    const subject = 'Weekly Task Schedule';
    const body = \`I wanted to share this weekly task schedule with you:\\n\\n\${url}\`;
    window.location.href = \`mailto:?subject=\${encodeURIComponent(subject)}&body=\${encodeURIComponent(body)}\`;
    setShowShareDropdown(false);
  };
`;

content = content.replace(
  '  const handlePrint = () => {',
  shareMethods + '\n  const handlePrint = () => {'
);

// Add share button after Download PDF button
const oldButtons = `          <button
            onClick={handleDownloadPDF}
            className="btn-primary"
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? '⏳ Generating...' : '📥 Download PDF'}
          </button>
          <button onClick={onClose} className="btn-secondary">
            ← Back to Editor
          </button>`;

const newButtons = `          <button
            onClick={handleDownloadPDF}
            className="btn-primary"
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? '⏳ Generating...' : '📥 Download PDF'}
          </button>
          <div className="share-dropdown-container">
            <button
              onClick={() => setShowShareDropdown(!showShareDropdown)}
              className="btn-primary"
            >
              📤 Share
            </button>
            {showShareDropdown && (
              <div className="share-dropdown">
                <button onClick={handleCopyLink} className="share-option">
                  🔗 Copy Link
                </button>
                <button onClick={handleShareWhatsApp} className="share-option">
                  💬 WhatsApp
                </button>
                <button onClick={handleShareEmail} className="share-option">
                  ✉️ Email
                </button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="btn-secondary">
            ← Back to Editor
          </button>`;

content = content.replace(oldButtons, newButtons);

fs.writeFileSync(filePath, content, 'utf8');

console.log('PrintView.jsx updated successfully!');
console.log('Added:');
console.log('1. scheduleId prop');
console.log('2. showShareDropdown state');
console.log('3. getShareUrl function');
console.log('4. handleCopyLink, handleShareWhatsApp, handleShareEmail');
console.log('5. Share button with dropdown menu');
