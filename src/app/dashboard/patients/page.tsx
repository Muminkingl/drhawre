"use client";

import { useState, useEffect } from 'react';
import { usePatients, Patient } from '../../context/PatientContext';
import Link from 'next/link';
import PatientEditForm from '../../components/PatientEditForm';
import { exportToExcel } from '@/lib/excelExport';
import { generatePatientPDF } from '@/lib/pdfGenerator';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function PatientsPage() {
  const { patients, deletePatient, editPatient, isLoading, error, refreshPatients } = usePatients();
  const { isStaffAuth } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [customMinAge, setCustomMinAge] = useState<string>('');
  const [customMaxAge, setCustomMaxAge] = useState<string>('');
  const [showCustomAgeInputs, setShowCustomAgeInputs] = useState(false);
  // New filter state
  const [activeFilter, setActiveFilter] = useState<string>('all'); // Current active filter field

  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Calculate age from DOB
  const calculateAge = (dob: string): number | string => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return 'N/A';

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  // Generic print function to handle all print types
  const handlePrintGeneric = (patient: Patient, content: string, title: string) => {
    // Create a new window for the print document
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website');
      return;
    }

    // Check if patient has necessary fields
    if (!patient.name || !patient.clinicId) {
      alert('Patient information is incomplete. Please ensure name and clinic ID are filled.');
      printWindow.close();
      return;
    }

    // Create content for the print window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - ${patient.name}</title>
        <style>
          /* Reset all margins and paddings */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          html, body {
            width: 210mm;
            height: 148mm;
            margin: 0;
            padding: 0;
            background: white;
            font-family: Arial, sans-serif;
            overflow: hidden;
          }
          
          .print-container {
            width: 210mm;
            height: 148mm;
            position: relative;
            border: none;
            display: flex;
            margin: 0 auto;
            background: white;
            page-break-inside: avoid;
            page-break-after: always;
          }
            
          .report-image {
            width: 100%;
            height: 100%;
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            object-fit: contain;
            object-position: top left;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            image-rendering: pixelated;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
            
            /* Patient info container - positioned at top left */
            .patient-info {
              position: absolute;
              top: 148px;  /* Moved 2px higher */
              left: 20px;
              width: 45%;
              padding: 10px;
              box-sizing: border-box;
            }
            
            /* Treatment data container - positioned at middle left */
            .treatment-data {
              position: absolute;
              top: 205px;  /* Moved higher to close gap (up from 275px) */
              left: 20px;
              width: 45%;
              padding: 10px;
              box-sizing: border-box;
            }
            
            /* Name field */
            .name-row {
              margin-bottom: 8px;
              display: flex;
            }
            .name-label {
              font-size: 10px;
              font-weight: bold;
              margin-right: 6px;
              min-width: 40px;
            }
            .name-value {
              font-size: 10px;
            }
            
            /* Age and clinic ID row */
            .details-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;  /* Further reduced gap between age and clinic ID */
            }
            .age-container {
              display: flex;
            }
            .age-label {
              font-size: 10px;
              font-weight: bold;
              margin-right: 6px;
              min-width: 40px;
            }
            .age-value {
              font-size: 10px;
            }
            .clinic-container {
              display: flex;
              margin-right: 0;
            }
            .clinic-id-label {
              font-size: 10px;
              font-weight: bold;
              margin-right: 6px;
            }
            .clinic-id-value {
              font-size: 10px;
            }
            
            /* Separator line */
            .separator {
              border-bottom: 1px dashed #000;
              margin-bottom: 8px;  /* Reduced gap between separator and treatment data */
              width: 100%;
            }
            
            /* Current treatment */
            .treatment-content {
              font-size: 10px;
              line-height: 1.6;
              white-space: pre-wrap;
              padding-top: 10px;
              padding-left: 10px;
              padding-right: 10px;
            }
            
            @media print {
              @page {
                size: 210mm 148mm;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
              }
              
              html, body {
                width: 210mm !important;
                height: 148mm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                background: white !important;
              }
              
              .print-container {
                width: 210mm !important;
                height: 148mm !important;
                margin: 0 !important;
                padding: 0 !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
              }
              
              .report-image {
                width: 100% !important;
                height: 100% !important;
                object-fit: contain !important;
                object-position: top left !important;
                image-rendering: -webkit-optimize-contrast !important;
                image-rendering: crisp-edges !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              .patient-info {
                position: absolute !important;
                top: 148px !important;
                left: 20px !important;
                width: 45% !important;
              }
              
              .treatment-data {
                position: absolute !important;
                top: 205px !important;
                left: 20px !important;
                width: 45% !important;
              }
              
              .print-button {
                display: none !important;
              }
            }
          
          .print-button {
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 8px 16px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <img src="/drhawar.jpg" class="report-image" />
          
          <!-- Patient info in yellow area -->
          <div class="patient-info">
            <!-- Name field -->
            <div class="name-row">
              <div class="name-label">Name:</div>
              <div class="name-value">${patient.name}</div>
            </div>
            
            <!-- Age and clinic ID row -->
            <div class="details-row">
              <div class="age-container">
                <div class="age-label">Age:</div>
                <div class="age-value">${calculateAge(patient.dob)} / DOB: ${patient.dob || 'N/A'}</div>
              </div>
              
              <div class="clinic-container">
                <div class="clinic-id-label">clinic ID:</div>
                <div class="clinic-id-value">${patient.clinicId}</div>
              </div>
            </div>
          </div>
          
          <!-- Treatment data in green area -->
          <div class="treatment-data">
            <!-- Separator line -->
            <div class="separator"></div>
            
            <!-- Content (without label) -->
            <div class="treatment-content">${content}</div>
          </div>
        </div>
        
        <button class="print-button" onclick="window.print();return false;">Print</button>
        <script>
          // Auto-print with better fit for A5 landscape
          window.onload = function() {
            // Force the window to be exactly A5 landscape size (210mm x 148mm)
            document.documentElement.style.width = '210mm';
            document.documentElement.style.height = '148mm';
            document.body.style.width = '210mm';
            document.body.style.height = '148mm';
            
            // Remove any browser-specific margins and borders
            document.body.style.margin = '0';
            document.body.style.padding = '0';
            document.body.style.border = 'none';
            document.body.style.overflow = 'hidden';
            
            // Apply browser-specific overrides for A5 landscape
            const style = document.createElement('style');
            style.textContent = "@media print { @page { size: 210mm 148mm; margin: 0 !important; } html, body { width: 210mm !important; height: 148mm !important; margin: 0 !important; } }";
            document.head.appendChild(style);
            
            // Trigger print after ensuring layout is complete
            setTimeout(function() {
              window.print();
            }, 800);
          }
        </script>
      </body>
      </html>
    `);

    // Finish writing and close the document
    printWindow.document.close();
  };

  // Print treatment function
  const handlePrintTreatment = (patient: Patient) => {
    const content = patient.currentTreatment || 'No current treatment specified.';
    handlePrintGeneric(patient, content, 'Treatment Card');
  };



  // Handle report generation
  const handleGenerateReport = async (patient: Patient) => {
    try {
      await generatePatientPDF(patient);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    }
  };

  // Handle logging a visit (returning patient)
  const handleLogVisit = async (patient: Patient) => {
    try {
      // Import the function to ensure visits table exists
      const { ensureVisitsTableExists } = await import('@/lib/supabase');

      // Check if visits table exists
      const visitsTableExists = await ensureVisitsTableExists();

      if (!visitsTableExists) {
        alert('Unable to record visit. The visits table does not exist in the database.');
        return;
      }

      // Write a visit record; do not create duplicate patient
      const { error } = await supabase.from('visits').insert({ patient_id: patient.id });

      if (error) {
        console.error('Error inserting visit record:', error);
        alert('Failed to record visit. Database error.');
        return;
      }

      alert('Visit recorded successfully.');

      // Refresh the visits count in reports if possible
      try {
        // This is a simple event to inform other components that visits have changed
        window.dispatchEvent(new CustomEvent('visitsUpdated'));
      } catch (e) {
        // Ignore errors from event dispatch
      }
    } catch (e) {
      console.error('Error logging visit:', e);
      alert('Failed to record visit.');
    }
  };

  // Refresh data when component mounts
  useEffect(() => {
    refreshPatients();
  }, []);

  // Filter patients based on search term, active filter field, and age filter
  const filteredPatients = patients.filter(patient => {
    // Text search filter based on the active filter field
    let matchesSearch = true;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();

      if (activeFilter === 'all') {
        // Search all fields
        matchesSearch = Boolean(
          patient.name.toLowerCase().includes(searchLower) ||
          patient.hospitalFileNumber.toLowerCase().includes(searchLower) ||
          patient.diagnosis.toLowerCase().includes(searchLower) ||
          (patient.dob && calculateAge(patient.dob).toString().includes(searchLower)) ||
          (patient.dob && patient.dob.includes(searchLower)) ||
          (patient.treatment && patient.treatment.toLowerCase().includes(searchLower)) ||
          (patient.sex && patient.sex.toLowerCase().includes(searchLower)) ||
          (patient.history && patient.history.toLowerCase().includes(searchLower)) ||
          (patient.mobileNumber && patient.mobileNumber.toLowerCase().includes(searchLower)) ||
          (patient.clinicId && patient.clinicId.toLowerCase().includes(searchLower))
        );
      } else {
        // Search specific field based on activeFilter
        switch (activeFilter) {
          case 'name':
            matchesSearch = Boolean(patient.name.toLowerCase().includes(searchLower));
            break;
          case 'age':
            matchesSearch = Boolean(patient.dob && calculateAge(patient.dob).toString().includes(searchLower));
            break;
          case 'diagnosis':
            matchesSearch = Boolean(patient.diagnosis.toLowerCase().includes(searchLower));
            break;
          case 'treatment':
            matchesSearch = Boolean(patient.treatment && patient.treatment.toLowerCase().includes(searchLower));
            break;
          case 'gender':
            matchesSearch = Boolean(
              patient.sex && patient.sex.trim().toLowerCase() === searchLower.trim().toLowerCase()
            );
            break;
          case 'history':
            matchesSearch = Boolean(patient.history && patient.history.toLowerCase().includes(searchLower));
            break;
          case 'mobile':
            matchesSearch = Boolean(patient.mobileNumber && patient.mobileNumber.toLowerCase().includes(searchLower));
            break;
          case 'hospitalFile':
            matchesSearch = Boolean(patient.hospitalFileNumber.toLowerCase().includes(searchLower));
            break;
          case 'clinicId':
            matchesSearch = Boolean(patient.clinicId && patient.clinicId.toLowerCase().includes(searchLower));
            break;
          case 'dob':
            matchesSearch = Boolean(patient.dob && patient.dob.includes(searchLower));
            break;
          default:
            matchesSearch = true;
        }
      }
    }

    // Age filter
    let matchesAge = true;
    if (ageFilter !== 'all') {
      const calculatedAge = calculateAge(patient.dob);
      const patientAge = typeof calculatedAge === 'number' ? calculatedAge : 0;

      switch (ageFilter) {
        case 'under18':
          matchesAge = patientAge < 18;
          break;
        case '18to30':
          matchesAge = patientAge >= 18 && patientAge <= 30;
          break;
        case '31to50':
          matchesAge = patientAge >= 31 && patientAge <= 50;
          break;
        case 'over50':
          matchesAge = patientAge > 50;
          break;
        case 'custom':
          const minAge = parseInt(customMinAge) || 0;
          const maxAge = parseInt(customMaxAge) || 999;
          matchesAge = patientAge >= minAge && patientAge <= maxAge;
          break;
        default:
          matchesAge = true;
      }
    }

    return matchesSearch && matchesAge;
  });

  // Handle patient selection for details view
  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsEditing(false); // Close edit form when selecting a new patient
    setShowMobileDetails(true); // Show details panel on mobile
  };

  // Handle patient deletion
  const handleDeletePatient = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this patient record?')) {
      try {
        setIsDeleting(id);
        await deletePatient(id);
        if (selectedPatient?.id === id) {
          setSelectedPatient(null);
        }
      } finally {
        setIsDeleting(null);
      }
    }
  };

  // Handle patient edit form submission
  const handleEditSubmit = async (data: Partial<Patient>) => {
    if (!selectedPatient) return;

    try {
      await editPatient(selectedPatient.id, data);
      // Update the selected patient with new data after successful edit
      setSelectedPatient(prev => prev ? { ...prev, ...data } : null);
      setIsEditing(false); // Close the form after successful edit
    } catch (err) {
      console.error('Error updating patient:', err);
    }
  };

  // Handle Excel export
  const handleExportToExcel = () => {
    try {
      if (isStaffAuth) {
        alert("You don’t have permission to export data.");
        return;
      }
      setIsExporting(true);

      // Use the filtered patients if there's a search term, otherwise use all patients
      const dataToExport = filteredPatients;

      // Generate a filename with current date
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const filename = `patients-data-${date}`;

      // Export the data
      exportToExcel(dataToExport, filename);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Toggle back to list view on mobile
  const handleBackToList = () => {
    setShowMobileDetails(false);
  };

  // Loading state
  if (isLoading && patients.length === 0) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <svg className="inline animate-spin h-10 w-10 text-indigo-600 dark:text-indigo-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-700 dark:text-gray-300">Loading patients data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-4 rounded-lg text-red-700 dark:text-red-300">
          <h3 className="text-lg font-medium mb-2">Error Loading Data</h3>
          <p>{error}</p>
          <button
            onClick={() => refreshPatients()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Patients Records</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {filteredPatients.length} {filteredPatients.length === 1 ? 'record' : 'records'} found
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/patient-form" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition duration-150 inline-flex items-center">
              <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Patient
            </Link>
            {!isStaffAuth && (
              <button
                onClick={handleExportToExcel}
                disabled={isExporting || filteredPatients.length === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg shadow-md transition duration-150 inline-flex items-center"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Excel
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder={
                  activeFilter === 'all'
                    ? "Search all patient fields..."
                    : activeFilter === 'name'
                      ? "Search by patient name..."
                      : activeFilter === 'age'
                        ? "Search by age..."
                        : activeFilter === 'diagnosis'
                          ? "Search by diagnosis..."
                          : activeFilter === 'treatment'
                            ? "Search by treatment..."
                            : activeFilter === 'gender'
                              ? "Search by gender..."
                              : activeFilter === 'history'
                                ? "Search by history..."
                                : activeFilter === 'mobile'
                                  ? "Search by mobile number..."
                                  : activeFilter === 'hospitalFile'
                                    ? "Search by hospital file number..."
                                    : activeFilter === 'dob'
                                      ? "Search by DOB..."
                                      : "Search by clinic ID..."
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="w-full md:w-auto px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg inline-flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition duration-150"
              >
                <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {ageFilter !== 'all' && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                    {ageFilter === 'custom' && (customMinAge || customMaxAge) ? '2' : '1'}
                  </span>
                )}
              </button>

              {isFilterOpen && (
                <div className="absolute z-50 mt-2 w-80 right-0 md:right-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
                  {/* Search Field Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Search Field
                    </label>
                    <select
                      value={activeFilter}
                      onChange={(e) => setActiveFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="all">All Fields</option>
                      <option value="name">Name</option>
                      <option value="age">Age</option>
                      <option value="diagnosis">Diagnosis</option>
                      <option value="treatment">Treatment</option>
                      <option value="gender">Gender</option>
                      <option value="history">History</option>
                      <option value="mobile">Mobile Number</option>
                      <option value="hospitalFile">Hospital File Number</option>
                      <option value="clinicId">Clinic ID</option>
                      <option value="dob">Date of Birth</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Select "All Fields" to search across all patient data
                    </p>
                  </div>

                  {/* Age Filter Section */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Age Range
                    </label>
                    <select
                      value={ageFilter}
                      onChange={(e) => setAgeFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="all">All Ages</option>
                      <option value="under18">Under 18</option>
                      <option value="18to30">18-30</option>
                      <option value="31to50">31-50</option>
                      <option value="over50">Over 50</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  {ageFilter === 'custom' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Custom Age Range (Min - Max)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min Age"
                          value={customMinAge}
                          onChange={(e) => setCustomMinAge(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                        <input
                          type="number"
                          placeholder="Max Age"
                          value={customMaxAge}
                          onChange={(e) => setCustomMaxAge(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() => {
                        setAgeFilter('all');
                        setCustomMinAge('');
                        setCustomMaxAge('');
                        setActiveFilter('all');
                        setSearchTerm('');
                        setIsFilterOpen(false);
                      }}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      Clear All Filters
                    </button>
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View: Toggle between list and details */}
      <div className="block md:hidden mb-4">
        {showMobileDetails && selectedPatient && (
          <button
            onClick={handleBackToList}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to List
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patients List - Only render if not editing */}
        {!isEditing && (
          <div className={`lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${showMobileDetails ? 'hidden md:block' : 'block'}`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Patient List</h2>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${selectedPatient?.id === patient.id ? 'bg-gray-100 dark:bg-gray-700 border-l-4 border-indigo-500' : ''
                      }`}
                    onClick={() => handleViewPatient(patient)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">{patient.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {patient.diagnosis} | Age: {calculateAge(patient.dob)} | DOB: {patient.dob}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Added: {formatDate(patient.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 font-medium">
                          {patient.clinicId}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">
                          {patient.hospitalFileNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No patients found. Please add a patient or adjust your search.
                </div>
              )}
            </div>

            {/* Show loading indicator when refreshing data */}
            {isLoading && patients.length > 0 && (
              <div className="p-2 bg-gray-50 dark:bg-gray-700 text-center">
                <svg className="inline animate-spin h-4 w-4 text-indigo-600 dark:text-indigo-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs text-gray-600 dark:text-gray-300">Refreshing...</span>
              </div>
            )}
          </div>
        )}

        {/* Patient Details */}
        <div className={`${isEditing ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white dark:bg-gray-800 rounded-lg shadow-md ${!showMobileDetails ? 'hidden md:block' : 'block'}`}>
          {selectedPatient ? (
            <div className="p-4 md:p-6">
              {!isEditing ? (
                <>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedPatient.name}</h2>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full font-medium text-sm">
                          Clinic ID: {selectedPatient.clinicId}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                          File #: {selectedPatient.hospitalFileNumber}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Added: {formatDate(selectedPatient.createdAt)}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleGenerateReport(selectedPatient)}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-md transition duration-150"
                        title="Generate PDF Report"
                      >
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleLogVisit(selectedPatient)}
                        className="p-2 text-amber-600 hover:bg-amber-100 rounded-md transition duration-150"
                        title="Log Visit (Returning Patient)"
                      >
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      {!isStaffAuth && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-md transition duration-150"
                          title="Edit Patient"
                        >
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePatient(selectedPatient.id)}
                        disabled={isDeleting === selectedPatient.id}
                        className={`p-2 text-red-600 hover:bg-red-100 rounded-md transition duration-150 ${isDeleting === selectedPatient.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        title="Delete Patient"
                      >
                        {isDeleting === selectedPatient.id ? (
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Personal Information</h3>
                      <div className="space-y-3">
                        {selectedPatient.dob && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">DOB</span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">{selectedPatient.dob}</span>
                          </div>
                        )}
                        {selectedPatient.sex && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Sex</span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">{selectedPatient.sex}</span>
                          </div>
                        )}
                        {selectedPatient.mobileNumber && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Mobile</span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">{selectedPatient.mobileNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Medical Information</h3>
                      <div className="space-y-3">
                        {selectedPatient.ageOfDiagnosis && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Diagnosis Age</span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">{selectedPatient.ageOfDiagnosis}</span>
                          </div>
                        )}
                        {selectedPatient.diagnosis && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Diagnosis</span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">{selectedPatient.diagnosis}</span>
                          </div>
                        )}
                        {selectedPatient.treatment && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Treatment</span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">{selectedPatient.treatment}</span>
                          </div>
                        )}
                        {selectedPatient.currentTreatment ? (
                          <div className="flex flex-col">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Treatment</span>
                              <button
                                onClick={() => handlePrintTreatment(selectedPatient)}
                                title="Print treatment card for this patient"
                                className="flex items-center px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                              >
                                <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Print
                              </button>
                            </div>
                            <div className="mt-1 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 max-h-40 overflow-y-auto">
                              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{selectedPatient.currentTreatment}</p>
                            </div>
                          </div>
                        ) : null}
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Clinic ID</span>
                          <span className="text-sm text-gray-900 dark:text-gray-100">{selectedPatient.clinicId}</span>
                        </div>
                        {selectedPatient.history && (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">History</span>
                            <div className="mt-1 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 max-h-40 overflow-y-auto">
                              <span className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{selectedPatient.history}</span>
                            </div>
                          </div>
                        )}
                        {selectedPatient.pastMedicalHistory && (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Past Medical History</span>
                            <div className="mt-1 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 max-h-40 overflow-y-auto">
                              <span className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{selectedPatient.pastMedicalHistory}</span>
                            </div>
                          </div>
                        )}
                        {selectedPatient.drugHistory && (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Drug History</span>
                            <div className="mt-1 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 max-h-40 overflow-y-auto">
                              <span className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{selectedPatient.drugHistory}</span>
                            </div>
                          </div>
                        )}
                        {selectedPatient.pastSurgicalHistory && (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Past Surgical History</span>
                            <div className="mt-1 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 max-h-40 overflow-y-auto">
                              <span className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{selectedPatient.pastSurgicalHistory}</span>
                            </div>
                          </div>
                        )}
                        {selectedPatient.followUpDate && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Follow Up Date</span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">{selectedPatient.followUpDate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  {selectedPatient.note && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</h3>
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        {selectedPatient.note}
                      </p>
                    </div>
                  )}

                  {/* Table Data Section */}
                  {selectedPatient.tableData && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mt-6">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Data</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse rounded-lg overflow-hidden">
                          <tbody>
                            {(() => {
                              try {
                                const tableData = JSON.parse(selectedPatient.tableData);
                                if (Array.isArray(tableData) && tableData.length > 0) {
                                  return tableData.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                      {Array.isArray(row) && row.map((cell, colIndex) => (
                                        <td
                                          key={`${rowIndex}-${colIndex}`}
                                          className={`border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs ${cell ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100' :
                                            'bg-gray-100 dark:bg-gray-800/50'
                                            }`}
                                        >
                                          {cell || ''}
                                        </td>
                                      ))}
                                    </tr>
                                  ));
                                }
                              } catch (e) {
                                return (
                                  <tr>
                                    <td className="text-sm text-red-500 p-2">Error parsing table data</td>
                                  </tr>
                                );
                              }
                              return null;
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Patient</h2>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center text-sm px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to View
                    </button>
                  </div>
                  <PatientEditForm
                    patient={selectedPatient}
                    onSubmit={handleEditSubmit}
                    onCancel={() => setIsEditing(false)}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <svg className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">Select a patient</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Click on a patient from the list to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 