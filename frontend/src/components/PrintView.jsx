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

  // Pinch-to-zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const DAYS = showDays === 6 ? DAYS_6 : DAYS_5;

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Start at zoom 1 - content will be sized via CSS to fit mobile width
      setZoom(1);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Pinch-to-zoom touch handlers
  useEffect(() => {
    const element = printContentRef.current;
    if (!element) return;

    let initialDistance = 0;
    let initialZoom = 1;
    let initialPan = { x: 0, y: 0 };
    let lastTouchCenter = { x: 0, y: 0 };

    const getDistance = (touch1, touch2) => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touch1, touch2) => {
      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        // Two fingers - pinch zoom
        e.preventDefault();
        setIsZooming(true);
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialDistance = getDistance(touch1, touch2);
        initialZoom = zoom;
        lastTouchCenter = getTouchCenter(touch1, touch2);
      } else if (e.touches.length === 1 && zoom !== 1) {
        // One finger + zoomed - pan
        const touch = e.touches[0];
        initialPan = { ...pan };
        lastTouchCenter = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2) {
        // Pinch zoom
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = getDistance(touch1, touch2);

        // Calculate scale change with damping for smoother, less sensitive zoom
        const rawScale = currentDistance / initialDistance;
        const dampedScale = initialZoom + (rawScale - 1) * initialZoom * 0.5; // 50% damping

        // Limit zoom between 0.7x and 1.8x for more controlled zooming
        const newZoom = Math.min(Math.max(dampedScale, 0.7), 1.8);
        setZoom(newZoom);

        // Adjust pan to zoom toward pinch center
        const currentCenter = getTouchCenter(touch1, touch2);
        const deltaX = currentCenter.x - lastTouchCenter.x;
        const deltaY = currentCenter.y - lastTouchCenter.y;

        setPan(prev => ({
          x: prev.x + deltaX * 0.3,
          y: prev.y + deltaY * 0.3
        }));

        lastTouchCenter = currentCenter;
      } else if (e.touches.length === 1 && zoom !== 1) {
        // Pan when zoomed (allow panning at any zoom level)
        e.preventDefault();
        const touch = e.touches[0];
        const deltaX = touch.clientX - lastTouchCenter.x;
        const deltaY = touch.clientY - lastTouchCenter.y;

        // Smoother panning with constraints
        setPan(prev => ({
          x: prev.x + deltaX * 0.8,
          y: prev.y + deltaY * 0.8
        }));

        lastTouchCenter = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        setIsZooming(false);
      }

      // Reset zoom on double-tap
      if (e.touches.length === 0 && zoom !== 1) {
        const now = Date.now();
        const timeSinceLastTap = now - (element.lastTapTime || 0);

        if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
          // Double tap detected - reset zoom
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }

        element.lastTapTime = now;
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [zoom, pan]);

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
            ← Back
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
        <div
          className="print-content"
          ref={printContentRef}
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'top center',
            transition: isZooming ? 'none' : 'transform 0.2s ease-out'
          }}
        >
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
