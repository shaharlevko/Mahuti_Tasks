import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './PrintView.css';
import { useDialog } from '../hooks/useDialog';
import ConfirmDialog from './ConfirmDialog';

const DAYS_5 = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const DAYS_6 = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_COLORS = ['#8B4513', '#4169E1', '#2F4F4F', '#FF8C00', '#8B4513', '#DC143C'];

// Design theme configurations
const DESIGN_THEMES = {
  garden: {
    name: "Garden Party",
    colors: {
      tableHeader: "linear-gradient(135deg, #C7ECDE 0%, #D5F4E6 100%)",
      tableBorder: "#B4E7CE",
      taskColumn: "linear-gradient(135deg, #FFF4E0 0%, #FFFEF0 100%)",
      titleColor: "#2D5F4B",
      dayColors: ['#8B4513', '#4169E1', '#2F4F4F', '#FF8C00', '#8B4513', '#DC143C']
    },
    decorations: {
      headerLeft: "🌸🌼",
      headerRight: "🌻🌸",
      footer: ["🌱", "🌿", "🍃", "🌿", "🌱"]
    }
  },
  ocean: {
    name: "Ocean Adventure",
    colors: {
      tableHeader: "linear-gradient(135deg, #A8D8EA 0%, #B4E7E8 100%)",
      tableBorder: "#4A90A4",
      taskColumn: "linear-gradient(135deg, #FFF9E3 0%, #FFFEF5 100%)",
      titleColor: "#1E6B7F",
      dayColors: ['#1E6B7F', '#2596BE', '#4A90A4', '#00A8CC', '#0077B6', '#1E6B7F']
    },
    decorations: {
      headerLeft: "🌊🐠",
      headerRight: "🐡🌊",
      footer: ["🐚", "⭐", "🦀", "🐟", "🐠"]
    }
  },
  sunny: {
    name: "Sunny Meadow",
    colors: {
      tableHeader: "linear-gradient(135deg, #FFF4A3 0%, #FFECB3 100%)",
      tableBorder: "#FFB347",
      taskColumn: "linear-gradient(135deg, #FFFEF5 0%, #FFFEF8 100%)",
      titleColor: "#E67E22",
      dayColors: ['#E67E22', '#F39C12', '#F4D03F', '#F39C12', '#E67E22', '#D35400']
    },
    decorations: {
      headerLeft: "☀️🌈",
      headerRight: "☁️☀️",
      footer: ["🦋", "🐝", "🐞", "🦋", "🐝"]
    }
  },
  woodland: {
    name: "Woodland Friends",
    colors: {
      tableHeader: "linear-gradient(135deg, #C7E8C7 0%, #B4D4B4 100%)",
      tableBorder: "#8B7355",
      taskColumn: "linear-gradient(135deg, #FFF8F0 0%, #FFFEF8 100%)",
      titleColor: "#5D4037",
      dayColors: ['#5D4037', '#6B4423', '#7B5D3F', '#8B6F47', '#6B4423', '#5D4037']
    },
    decorations: {
      headerLeft: "🌲🍄",
      headerRight: "🌳🌲",
      footer: ["🦊", "🐿️", "🦝", "🦌", "🐻"]
    }
  }
};

function PrintView({ tasks, staff, assignments, weekStartDate, showDays, onClose, scheduleId }) {
  const printContentRef = useRef(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState('garden');
  const { dialogState, showAlert } = useDialog();

  const DAYS = showDays === 6 ? DAYS_6 : DAYS_5;
  const currentTheme = DESIGN_THEMES[selectedDesign];

  // Calculate week end date
  const weekStart = new Date(weekStartDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + (showDays - 1));

  const weekDateRange = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;

  // Helper function for dynamic font sizing
  const adjustFontSizes = () => {
    const table = printContentRef.current?.querySelector('.print-table');
    if (!table) return;

    // Adjust staff names in cells
    const staffCells = table.querySelectorAll('.staff-name-print');
    staffCells.forEach(cell => {
      const parent = cell.parentElement;
      if (!parent) return;

      // Reset font size to default
      cell.style.fontSize = '';

      // Check if text overflows
      const maxWidth = parent.clientWidth - 8; // Account for padding
      let fontSize = parseFloat(window.getComputedStyle(cell).fontSize);

      while (cell.scrollWidth > maxWidth && fontSize > 8) {
        fontSize -= 0.5;
        cell.style.fontSize = `${fontSize}px`;
      }
    });

    // Adjust task names
    const taskNames = table.querySelectorAll('.task-name');
    taskNames.forEach(taskName => {
      const parent = taskName.closest('.task-name-cell');
      if (!parent) return;

      // Reset font size to default
      taskName.style.fontSize = '';

      // Check if text overflows
      const maxWidth = parent.clientWidth - 40; // Account for icon and padding
      let fontSize = parseFloat(window.getComputedStyle(taskName).fontSize);

      while (taskName.scrollWidth > maxWidth && fontSize > 8) {
        fontSize -= 0.5;
        taskName.style.fontSize = `${fontSize}px`;
      }
    });

    // Adjust day headers
    const dayHeaders = table.querySelectorAll('th:not(.task-column)');
    dayHeaders.forEach(header => {
      // Reset font size to default
      header.style.fontSize = '';

      const maxWidth = header.clientWidth - 8;
      let fontSize = parseFloat(window.getComputedStyle(header).fontSize);

      while (header.scrollWidth > maxWidth && fontSize > 8) {
        fontSize -= 0.5;
        header.style.fontSize = `${fontSize}px`;
      }
    });
  };

  useEffect(() => {
    // Add print-specific class to body
    document.body.classList.add('print-mode');
    return () => {
      document.body.classList.remove('print-mode');
    };
  }, []);

  useEffect(() => {
    // Adjust on mount and when design changes
    setTimeout(adjustFontSizes, 100);

    // Adjust on window resize
    window.addEventListener('resize', adjustFontSizes);

    return () => {
      window.removeEventListener('resize', adjustFontSizes);
    };
  }, [selectedDesign, tasks, assignments]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const content = printContentRef.current;
      const wrapper = content.parentElement;

      // Save original styles
      const originalContentWidth = content.style.width;
      const originalContentMaxWidth = content.style.maxWidth;
      const originalContentFontSize = content.style.fontSize;
      const originalContentPadding = content.style.padding;
      const originalWrapperMaxHeight = wrapper?.style.maxHeight;
      const originalWrapperOverflow = wrapper?.style.overflow;

      // Force desktop layout for PDF generation on all devices
      content.style.width = '277mm';
      content.style.maxWidth = '277mm';
      content.style.fontSize = '16px';
      content.style.padding = '3mm 5mm';

      // Ensure wrapper doesn't constrain
      if (wrapper) {
        wrapper.style.maxHeight = 'none';
        wrapper.style.overflow = 'visible';
      }

      // Get table and ensure it uses fixed layout
      const table = content.querySelector('.print-table');
      const originalTableFontSize = table?.style.fontSize;
      if (table) {
        table.style.tableLayout = 'fixed';
        table.style.width = '100%';
        table.style.fontSize = '1rem'; // Force desktop font size
      }

      // Reset all table cells to desktop sizes
      const allCells = content.querySelectorAll('.print-table th, .print-table td');
      const originalCellStyles = Array.from(allCells).map(cell => ({
        padding: cell.style.padding,
        fontSize: cell.style.fontSize
      }));

      // Add temporary class to force print styles
      content.classList.add('force-print-layout');

      // Wait for layout to settle
      await new Promise(resolve => setTimeout(resolve, 150));

      // Apply dynamic font sizing for desktop layout
      adjustFontSizes();

      // Wait for font adjustments to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture the content as canvas with higher quality
      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 1045, // 277mm in pixels at 96dpi
        windowWidth: 1045,
        height: content.scrollHeight
      });

      // Restore original styles
      content.style.width = originalContentWidth;
      content.style.maxWidth = originalContentMaxWidth;
      content.style.fontSize = originalContentFontSize;
      content.style.padding = originalContentPadding;

      if (wrapper) {
        wrapper.style.maxHeight = originalWrapperMaxHeight;
        wrapper.style.overflow = originalWrapperOverflow;
      }

      if (table) {
        table.style.fontSize = originalTableFontSize;
      }

      // Restore cell styles
      allCells.forEach((cell, index) => {
        if (originalCellStyles[index]) {
          cell.style.padding = originalCellStyles[index].padding;
          cell.style.fontSize = originalCellStyles[index].fontSize;
        }
      });

      content.classList.remove('force-print-layout');

      // Create PDF in landscape A4 format
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // A4 dimensions in mm: 297 x 210 (landscape)
      const pdfWidth = 297;
      const pdfHeight = 210;

      // Calculate dimensions to fit the content with margins
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
      await showAlert({
        message: 'Failed to generate PDF. Please try again.',
        title: 'Error',
        icon: '❌'
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };


  return (
    <div className="print-view">
      <div className="logo-back-container no-print">
        <img
          src="/mahuti-logo.svg"
          alt="Mahuti"
          className="logo-back-btn"
          onClick={onClose}
        />
        <div className="header-actions">
          <button onClick={handlePrint} className="btn-primary btn-print">
            🖨️ Print
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

      {/* Design selector dropdown - desktop only above preview */}
      <div className="design-selector-container design-selector-desktop no-print">
        <label htmlFor="design-select" className="design-label">
          Choose Design:
        </label>
        <select
          id="design-select"
          value={selectedDesign}
          onChange={(e) => setSelectedDesign(e.target.value)}
          className="design-select"
        >
          {Object.entries(DESIGN_THEMES).map(([key, theme]) => (
            <option key={key} value={key}>
              {theme.name}
            </option>
          ))}
        </select>
      </div>

      <div className="print-content-wrapper">
        <div className="print-content" ref={printContentRef}>
          {/* Decorative header with themed decorations */}
          <div className="print-header">
            <div className="header-decoration header-left">
              {currentTheme.decorations.headerLeft}
            </div>
            <div className="title-container">
              <h1 className="print-title" style={{ color: currentTheme.colors.titleColor }}>
                Weekly Task Schedule
              </h1>
              <p className="week-dates" style={{ color: currentTheme.colors.titleColor }}>
                {weekDateRange}
              </p>
            </div>
            <div className="header-decoration header-right">
              {currentTheme.decorations.headerRight}
            </div>
          </div>

          {/* Main schedule table */}
          <div className="print-table-container">
            <table
              className="print-table"
              style={{ borderColor: currentTheme.colors.tableBorder }}
            >
              <thead>
                <tr style={{ background: currentTheme.colors.tableHeader }}>
                  <th
                    className="task-column"
                    style={{
                      background: currentTheme.colors.taskColumn,
                      borderRightColor: currentTheme.colors.tableBorder,
                      borderBottomColor: currentTheme.colors.tableBorder
                    }}
                  >
                    Task/Day
                  </th>
                  {DAYS.map((day, index) => (
                    <th
                      key={day}
                      style={{
                        color: currentTheme.colors.dayColors[index],
                        borderRightColor: currentTheme.colors.tableBorder,
                        borderBottomColor: currentTheme.colors.tableBorder
                      }}
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td
                      className="task-name-cell"
                      style={{ background: currentTheme.colors.taskColumn }}
                    >
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

          {/* Decorative footer with themed elements */}
          <div className="print-footer">
            <div className="footer-decorations">
              {currentTheme.decorations.footer.map((emoji, index) => (
                <span key={index} className="decoration-item">
                  {emoji}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Design selector dropdown - mobile only below preview */}
      <div className="design-selector-container design-selector-mobile no-print">
        <label htmlFor="design-select-mobile" className="design-label">
          Choose Design:
        </label>
        <select
          id="design-select-mobile"
          value={selectedDesign}
          onChange={(e) => setSelectedDesign(e.target.value)}
          className="design-select"
        >
          {Object.entries(DESIGN_THEMES).map(([key, theme]) => (
            <option key={key} value={key}>
              {theme.name}
            </option>
          ))}
        </select>
      </div>

      <ConfirmDialog {...dialogState} />
    </div>
  );
}

export default PrintView;
