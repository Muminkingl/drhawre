import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Patient } from '@/app/context/PatientContext';

// Function to shorten URL using is.gd API
const shortenUrl = async (url: string): Promise<string> => {
  if (!url) return 'N/A';

  try {
    // Check if URL is valid
    new URL(url);

    // Call is.gd API to shorten the URL
    const response = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`);

    if (!response.ok) {
      console.error('URL shortening failed:', response.statusText);
      return url; // Return original URL if shortening fails
    }

    const data = await response.json();
    return data.shorturl || url;
  } catch (error) {
    console.error('Error shortening URL:', error);
    return url; // Return original URL if there's an error
  }
};

// Function to generate a PDF report for a patient
export const generatePatientPDF = async (patient: Patient) => {
  // No longer shortening image URL as it's removed
  // Create new PDF document
  const doc = new jsPDF();

  // Page constants
  const PAGE_HEIGHT = 280; // Maximum safe height for content (leaving margin for footer)
  const PAGE_MARGIN = 20;
  const CONTENT_WIDTH = 170; // Width of content area

  // Tracking variables
  let currentY = 0;
  let currentPage = 1;

  // Function to add a new page and reset position
  const addNewPage = () => {
    doc.addPage();
    currentPage++;
    currentY = PAGE_MARGIN;
  };

  // Function to check if we need a page break
  const checkPageBreak = (heightNeeded: number) => {
    if (currentY + heightNeeded > PAGE_HEIGHT) {
      addNewPage();
      return true;
    }
    return false;
  };

  // Function to estimate text height
  const estimateTextHeight = (text: string, fontSize: number) => {
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
    return (lines.length * fontSize * 0.5) + 10; // 0.5 is a multiplier for line spacing
  };

  // Helper function to add a section title
  const addSectionTitle = (title: string) => {
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(title, PAGE_MARGIN, currentY);
    currentY += 10;
  };

  // Helper function to add a text section
  const addTextSection = (title: string, content: string, checkNewPage = true) => {
    // Skip if content is empty
    if (!content || !content.trim()) {
      return;
    }

    const textLines = doc.splitTextToSize(content, CONTENT_WIDTH);
    const estimatedHeight = 20 + (textLines.length * 6); // title + content

    // Check if we need a page break
    if (checkNewPage && checkPageBreak(estimatedHeight)) {
      // We're on a new page already, don't check again
      addSectionTitle(title);
    } else {
      addSectionTitle(title);
    }

    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(textLines, PAGE_MARGIN, currentY);
    currentY += textLines.length * 6 + 15; // Add some extra space after the text
  };

  // Add title
  currentY = PAGE_MARGIN;
  doc.setFontSize(22);
  doc.setTextColor(0, 51, 102);
  doc.text('Patient Report', 105, currentY, { align: 'center' });
  currentY += 15;

  // Add clinic ID and date
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Clinic ID: ${patient.clinicId || 'N/A'}`, 105, currentY, { align: 'center' });
  currentY += 5;
  doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 105, currentY, { align: 'center' });
  currentY += 10;

  // Add horizontal line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(PAGE_MARGIN, currentY, PAGE_MARGIN + CONTENT_WIDTH, currentY);
  currentY += 10;

  // Add patient information title
  addSectionTitle('Patient Information');

  // Add patient basic information as a table
  autoTable(doc, {
    startY: currentY,
    head: [['Field', 'Value']],
    body: [
      ['Name', patient.name || 'N/A'],
      ['DOB', patient.dob || 'N/A'],
      ['Sex', patient.sex || 'N/A'],
      ['Mobile Number', patient.mobileNumber || 'N/A'],
      ['Hospital File Number', patient.hospitalFileNumber || 'N/A']
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [66, 133, 244],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' }
    },
    styles: { overflow: 'linebreak', cellPadding: 5 }
  });

  // Update Y position
  currentY = (doc as any).lastAutoTable.finalY + 15;

  // Add medical information title
  addSectionTitle('Medical Information');

  // Add medical information table
  autoTable(doc, {
    startY: currentY,
    head: [['Field', 'Value']],
    body: [
      ['Diagnosis', patient.diagnosis || 'N/A'],
      ['Age of Diagnosis', patient.ageOfDiagnosis || 'N/A'],
      ['Treatment', patient.treatment || 'N/A'],
      ['History', patient.history || 'N/A'],
      ['Past Medical History', patient.pastMedicalHistory || 'N/A'],
      ['Drug History', patient.drugHistory || 'N/A'],
      ['Past Surgical History', patient.pastSurgicalHistory || 'N/A'],
      ['Follow Up Date', patient.followUpDate || 'N/A']
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [66, 133, 244],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' }
    },
    styles: { overflow: 'linebreak', cellPadding: 5 }
  });

  // Update Y position
  currentY = (doc as any).lastAutoTable.finalY + 15;

  // Check current treatment length
  const currentTreatmentText = patient.currentTreatment?.trim() || '';
  const currentTreatmentHeight = currentTreatmentText ? estimateTextHeight(currentTreatmentText, 12) : 0;

  // Check notes length
  const notesText = patient.note?.trim() || '';
  const notesHeight = notesText ? estimateTextHeight(notesText, 12) : 0;

  // Determine if current treatment can fit on first page
  const remainingSpace = PAGE_HEIGHT - currentY;

  // If current treatment is short, or it can fit with plenty of room to spare, keep it on page 1
  if (currentTreatmentText && (currentTreatmentHeight < 50 || remainingSpace > currentTreatmentHeight + 30)) {
    // Current treatment is short or fits well, add it to page 1
    addTextSection('Current Treatment', currentTreatmentText);

    // If notes are also short and can fit on page 1, add them too
    if (notesText && currentY + notesHeight < PAGE_HEIGHT) {
      addTextSection('Notes', notesText);
    }
    // Otherwise, notes go to page 2 if they exist
    else if (notesText) {
      addNewPage();
      addTextSection('Notes', notesText, false); // Skip page check since we just created a new page
    }
  }
  // If current treatment is long, or treatment + notes need their own page
  else if (currentTreatmentText) {
    // Current treatment is long, move to page 2
    addNewPage();
    addTextSection('Current Treatment', currentTreatmentText, false);

    // Check if notes can fit on the same page after treatment
    if (notesText && currentY + notesHeight < PAGE_HEIGHT) {
      addTextSection('Notes', notesText);
    }
    // Notes are also long, move to page 3
    else if (notesText) {
      addNewPage();
      addTextSection('Notes', notesText, false);
    }
  }
  // If only notes exist but no treatment
  else if (notesText) {
    // Check if notes can fit on first page
    if (remainingSpace > notesHeight + 20) {
      addTextSection('Notes', notesText);
    } else {
      addNewPage();
      addTextSection('Notes', notesText, false);
    }
  }

  // Add table data if available
  if (patient.tableData) {
    try {
      const tableData = JSON.parse(patient.tableData);
      if (Array.isArray(tableData) && tableData.length > 0) {
        // Estimate table height - approximately 20px per row plus header
        const estimatedTableHeight = (tableData.length * 20) + 30;

        // Check if table needs a new page
        if (checkPageBreak(estimatedTableHeight + 10)) {
          addSectionTitle('Additional Data');
        } else {
          addSectionTitle('Additional Data');
        }

        autoTable(doc, {
          startY: currentY,
          body: tableData,
          theme: 'grid',
          styles: { overflow: 'linebreak', cellPadding: 5 }
        });

        // Update Y position
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }
    } catch (e) {
      console.error('Error parsing table data for PDF:', e);
    }
  }

  // Add footer with page number
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
  }

  // Generate filename with just the clinic ID
  const filename = `${patient.clinicId || 'report'}.pdf`;

  // Save and open the PDF
  doc.save(filename);
};