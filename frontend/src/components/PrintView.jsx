import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './PrintView.css';

const DAYS_5 = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const DAYS_6 = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_COLORS = ['#8B4513', '#4169E1', '#2F4F4F', '#FF8C00', '#8B4513', '#DC143C'];

function PrintView({ tasks, staff, assignments, weekStartDate, showDays, onClose, scheduleId }) {
  const printContentRef = useRef(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const DAYS = showDays === 6 ? DAYS_6 : DAYS_5;

  // Calculate week end date
  const weekStart = new Date(weekStartDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + (showDays - 1));

  const weekDateRange = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;

  useEffect(() => {
    // Add print-specific class to body
    document.body.classList.add('print-mode');
    return () => {
      document.body.classList.remove('print-mode');
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const content = printContentRef.current;

      // Capture the content as canvas with higher quality
      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Create PDF in landscape A4 format
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // A4 dimensions in mm: 297 x 210 (landscape)
      const pdfWidth = 297;
      const pdfHeight = 210;

      // Calculate dimensions to fit the content
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // If content is taller than page, scale it down
      let finalWidth = imgWidth;
      let finalHeight = imgHeight;
      if (imgHeight > pdfHeight - 20) {
        finalHeight = pdfHeight - 20;
        finalWidth = (canvas.width * finalHeight) / canvas.height;
      }

      const imgData = canvas.toDataURL('image/png');

      // Center the content
      const xOffset = (pdfWidth - finalWidth) / 2;
      const yOffset = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);

      // Generate filename with current date
      const filename = `Weekly-Schedule-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };


  return (
    <div className="print-view">
      <div className="print-controls no-print">
        <div className="action-buttons">
          <button onClick={handlePrint} className="btn-primary btn-print">
            🖨️ Print
          </button>
          <button onClick={onClose} className="btn-secondary">
            ← Back to edit
          </button>
          <button
            onClick={handleDownloadPDF}
            className="btn-primary"
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? '⏳ Generating...' : '📥 Download'}
          </button>
        </div>
      </div>

      <div className="print-content-wrapper">
        <div className="print-content" ref={printContentRef}>
          {/* Decorative header with flowers */}
          <div className="print-header">
            <div className="title-container">
              <h1 className="print-title">Weekly Task Schedule</h1>
              <p className="week-dates">{weekDateRange}</p>
            </div>
          </div>

          {/* Main schedule table */}
          <div className="print-table-container">
            <table className="print-table">
              <thead>
                <tr>
                  <th className="task-column">Task/Day</th>
                  {DAYS.map((day, index) => (
                    <th key={day} style={{ color: DAY_COLORS[index] }}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td className="task-name-cell">
                      <span className="task-icon">{task.icon}</span>
                      <span className="task-name">{task.name}</span>
                    </td>
                    {DAYS.map((day, dayIndex) => {
                      const key = `${day}-${task.name}`;
                      const assignment = assignments[key];
                      return (
                        <td
                          key={`${task.id}-${dayIndex}`}
                          className="assignment-cell"
                        >
                          {assignment && (
                            <span
                              className="staff-name-print"
                              style={{ color: assignment.staff?.color || '#000' }}
                            >
                              {assignment.staff?.name}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Decorative footer with nature elements */}
          <div className="print-footer">
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrintView;
