"use client";

import { useState, useEffect } from 'react';
import { usePatients, Appointment } from '../../context/PatientContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function SchedulePage() {
  const { appointments, isLoadingAppointments, addAppointment, editAppointment, deleteAppointment } = usePatients();
  const { isAdminAuth, isStaffAuth, isReceptionAuth } = useAuth();
  const router = useRouter();

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('Today'); // Today, Tomorrow, All, Custom
  const [customDate, setCustomDate] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    patientName: '',
    phoneNumber: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '10:00',
    notes: '',
    status: 'Scheduled' as Appointment['status'],
    gender: '',
    age: ''
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default custom date to today
  useEffect(() => {
    setCustomDate(new Date().toISOString().split('T')[0]);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormData({
      patientName: '',
      phoneNumber: '',
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTime: '10:00',
      notes: '',
      status: 'Scheduled',
      gender: '',
      age: ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (appt: Appointment) => {
    setModalMode('edit');
    setSelectedApptId(appt.id);
    setFormData({
      patientName: appt.patientName,
      phoneNumber: appt.phoneNumber,
      appointmentDate: appt.appointmentDate,
      appointmentTime: appt.appointmentTime,
      notes: appt.notes,
      status: appt.status,
      gender: appt.gender || '',
      age: appt.age || ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.patientName.trim()) {
      setFormError('Patient Name is required');
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setFormError('Phone Number is required');
      return;
    }
    if (!formData.gender) {
      setFormError('Gender is required');
      return;
    }
    if (!formData.appointmentDate) {
      setFormError('Appointment Date is required');
      return;
    }
    if (!formData.appointmentTime) {
      setFormError('Appointment Time is required');
      return;
    }

    try {
      setIsSubmitting(true);
      if (modalMode === 'create') {
        await addAppointment(formData);
      } else if (modalMode === 'edit' && selectedApptId) {
        await editAppointment(selectedApptId, formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: Appointment['status']) => {
    try {
      await editAppointment(id, { status: newStatus });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleRegisterPatient = async (appt: Appointment) => {
    try {
      // 1. Mark status as "Arrived" - this automatically creates the patient record
      await editAppointment(appt.id, { status: 'Arrived' });
      alert(`Patient record for "${appt.patientName}" has been automatically created!`);
    } catch (err) {
      console.error('Failed to register arrived patient:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this appointment?')) {
      try {
        await deleteAppointment(id);
      } catch (err) {
        console.error('Failed to delete appointment:', err);
      }
    }
  };

  // Helper date conversions
  const getTodayDateString = () => new Date().toISOString().split('T')[0];
  const getTomorrowDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const formatTime12h = (time24: string) => {
    if (!time24) return '';
    const [hourStr, minStr] = time24.split(':');
    const hour = parseInt(hourStr, 10);
    const min = parseInt(minStr, 10);
    if (isNaN(hour) || isNaN(min)) return time24;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const minFormatted = String(min).padStart(2, '0');
    return `${hour12}:${minFormatted} ${ampm}`;
  };

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filter and sort appointments
  const filteredAppointments = appointments.filter(appt => {
    // 1. Search filter
    const matchesSearch = 
      appt.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appt.phoneNumber.includes(searchQuery);

    // 2. Status filter
    const matchesStatus = statusFilter === 'All' || appt.status === statusFilter;

    // 3. Date filter
    let matchesDate = true;
    const todayStr = getTodayDateString();
    const tomorrowStr = getTomorrowDateString();

    if (dateFilter === 'Today') {
      matchesDate = appt.appointmentDate === todayStr;
    } else if (dateFilter === 'Tomorrow') {
      matchesDate = appt.appointmentDate === tomorrowStr;
    } else if (dateFilter === 'Custom' && customDate) {
      matchesDate = appt.appointmentDate === customDate;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Split into Today's versus Upcoming (if viewing all, otherwise just list)
  const todayStr = getTodayDateString();
  const todayAppointments = filteredAppointments.filter(a => a.appointmentDate === todayStr);
  const futureAppointments = filteredAppointments.filter(a => a.appointmentDate > todayStr);
  const pastAppointments = filteredAppointments.filter(a => a.appointmentDate < todayStr);

  // Stat calculations for today
  const todayTotal = appointments.filter(a => a.appointmentDate === todayStr);
  const scheduledCount = todayTotal.filter(a => a.status === 'Scheduled').length;
  const arrivedCount = todayTotal.filter(a => a.status === 'Arrived').length;
  const completedCount = todayTotal.filter(a => a.status === 'Completed').length;
  const cancelledCount = todayTotal.filter(a => a.status === 'Cancelled').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 min-h-screen bg-gray-50 dark:bg-gray-900">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Appointment Schedule</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Book and organize patient visits before they arrive at the clinic.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md transition-all hover:scale-102 duration-200"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Schedule Appointment
        </button>
      </div>

      {/* Analytics counter cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scheduled Today</p>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{scheduledCount}</p>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">Pending</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Arrived Today</p>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-3xl font-extrabold text-amber-500 dark:text-amber-400">{arrivedCount}</p>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">At Clinic</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Completed Today</p>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-3xl font-extrabold text-green-600 dark:text-green-400">{completedCount}</p>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">Registered</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cancelled Today</p>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">{cancelledCount}</p>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400">Cancelled</span>
          </div>
        </div>
      </div>

      {/* Filter and search control bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search appointments by patient name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white"
          />
        </div>

        {/* Date Filter selector */}
        <div className="flex flex-wrap items-center gap-2">
          {['Today', 'Tomorrow', 'All', 'Custom'].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setDateFilter(opt)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                dateFilter === opt
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-100 dark:border-gray-700'
              }`}
            >
              {opt}
            </button>
          ))}
          
          {dateFilter === 'Custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm"
            />
          )}
        </div>

        {/* Status Dropdown Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm font-semibold"
          >
            <option value="All">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Arrived">Arrived</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {isLoadingAppointments ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-4 font-medium">Fetching appointment details...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <svg className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">No appointments found</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">There are no appointments match the current search or filters.</p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-6 inline-flex items-center px-4 py-2.5 border border-transparent rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow"
          >
            Create New Appointment
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Main conditional display for different date options */}
          {dateFilter !== 'All' ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full mr-2.5"></span>
                  {dateFilter === 'Today' ? "Today's Schedule" : dateFilter === 'Tomorrow' ? "Tomorrow's Schedule" : `Appointments for ${formatDateLabel(customDate)}`}
                </h2>
                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full text-gray-600 dark:text-gray-300 font-semibold">{filteredAppointments.length} Total</span>
              </div>
              <AppointmentTable 
                list={filteredAppointments} 
                onStatusChange={handleStatusChange} 
                onRegister={handleRegisterPatient} 
                onEdit={handleOpenEditModal} 
                onDelete={handleDelete}
                isDoctor={!isStaffAuth && !isReceptionAuth}
              />
            </div>
          ) : (
            <>
              {/* If dateFilter is "All", split into chunks: Today, Upcoming, and Past */}
              {todayAppointments.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-gray-700/50 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-blue-900 dark:text-blue-300 flex items-center">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full mr-2.5"></span>
                      Today's Appointments
                    </h2>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full text-blue-800 dark:text-blue-300 font-semibold">{todayAppointments.length}</span>
                  </div>
                  <AppointmentTable 
                    list={todayAppointments} 
                    onStatusChange={handleStatusChange} 
                    onRegister={handleRegisterPatient} 
                    onEdit={handleOpenEditModal} 
                    onDelete={handleDelete}
                    isDoctor={!isStaffAuth && !isReceptionAuth}
                  />
                </div>
              )}

              {futureAppointments.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
                      <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full mr-2.5"></span>
                      Upcoming Appointments
                    </h2>
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full text-gray-600 dark:text-gray-300 font-semibold">{futureAppointments.length}</span>
                  </div>
                  <AppointmentTable 
                    list={futureAppointments} 
                    onStatusChange={handleStatusChange} 
                    onRegister={handleRegisterPatient} 
                    onEdit={handleOpenEditModal} 
                    onDelete={handleDelete}
                    isDoctor={!isStaffAuth && !isReceptionAuth}
                  />
                </div>
              )}

              {pastAppointments.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden opacity-80">
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-500 flex items-center">
                      <span className="w-2.5 h-2.5 bg-gray-400 rounded-full mr-2.5"></span>
                      Past Appointments
                    </h2>
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full text-gray-500 font-semibold">{pastAppointments.length}</span>
                  </div>
                  <AppointmentTable 
                    list={pastAppointments} 
                    onStatusChange={handleStatusChange} 
                    onRegister={handleRegisterPatient} 
                    onEdit={handleOpenEditModal} 
                    onDelete={handleDelete}
                    isDoctor={!isStaffAuth && !isReceptionAuth}
                  />
                </div>
              )}
            </>
          )}

        </div>
      )}

      {/* Appointment Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 relative flex flex-col max-h-[90vh]">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {modalMode === 'create' ? 'Schedule Patient Appointment' : 'Edit Appointment'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Enter patient contact details and select appointment slot.</p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-semibold flex items-center">
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Patient Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleInputChange}
                  placeholder="E.g. John Doe"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="E.g. 07701234567"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Gender <span className="text-red-500">*</span></label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Age</label>
                  <input
                    type="text"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="E.g. 30"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Appointment Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    name="appointmentDate"
                    value={formData.appointmentDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Appointment Time <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    name="appointmentTime"
                    value={formData.appointmentTime}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Arrived">Arrived</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Notes (Optional)</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="E.g. Wants check-up, returning patient, needs wheelchair access..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Book Appointment' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

interface AppointmentTableProps {
  list: Appointment[];
  onStatusChange: (id: string, status: Appointment['status']) => void;
  onRegister: (appt: Appointment) => void;
  onEdit: (appt: Appointment) => void;
  onDelete: (id: string) => void;
  isDoctor: boolean;
}

function AppointmentTable({ list, onStatusChange, onRegister, onEdit, onDelete, isDoctor }: AppointmentTableProps) {
  
  const getStatusBadgeClass = (status: Appointment['status']) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30';
      case 'Arrived':
        return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30';
      case 'Completed':
        return 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/30';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime12h = (time24: string) => {
    if (!time24) return '';
    const [hourStr, minStr] = time24.split(':');
    const hour = parseInt(hourStr, 10);
    const min = parseInt(minStr, 10);
    if (isNaN(hour) || isNaN(min)) return time24;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const minFormatted = String(min).padStart(2, '0');
    return `${hour12}:${minFormatted} ${ampm}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800/40">
          <tr>
            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">Patient Details</th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">Appointment Slot</th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">Notes</th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">Status</th>
            <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
          {list.map((appt) => (
            <tr key={appt.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
              <td className="px-6 py-4.5 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                    {appt.patientName.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{appt.patientName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">📞 {appt.phoneNumber}</div>
                    {(appt.gender || appt.age) && (
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                        {appt.gender ? `Gender: ${appt.gender}` : ''}
                        {appt.gender && appt.age ? ' | ' : ''}
                        {appt.age ? `Age: ${appt.age}` : ''}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4.5 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white flex items-center font-semibold">
                  <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatTime12h(appt.appointmentTime)}
                </div>
                <div className="text-xs text-gray-400 mt-1">{formatDateLabel(appt.appointmentDate)}</div>
              </td>
              <td className="px-6 py-4.5 max-w-xs truncate">
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate" title={appt.notes}>
                  {appt.notes || <span className="text-gray-400 italic">No notes</span>}
                </p>
              </td>
              <td className="px-6 py-4.5 whitespace-nowrap">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(appt.status)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    appt.status === 'Scheduled' ? 'bg-blue-500' :
                    appt.status === 'Arrived' ? 'bg-amber-500' :
                    appt.status === 'Completed' ? 'bg-green-500' : 'bg-rose-500'
                  }`}></span>
                  {appt.status}
                </span>
              </td>
              <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm">
                <div className="flex items-center justify-end gap-2.5">
                  
                  {/* Register button for scheduled status */}
                  {appt.status === 'Scheduled' && (
                    <button
                      onClick={() => onRegister(appt)}
                      className="px-3.5 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 hover:text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/40 dark:hover:bg-amber-900/50 transition-colors shadow-sm"
                      title="Mark Arrived"
                    >
                      Mark Arrived
                    </button>
                  )}

                  {/* Dropdown status selector */}
                  <select
                    value={appt.status}
                    onChange={(e) => onStatusChange(appt.id, e.target.value as Appointment['status'])}
                    className="px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Arrived">Arrived</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  {/* Edit button */}
                  <button
                    onClick={() => onEdit(appt)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  {/* Delete button (Doctor/Admin only) */}
                  {isDoctor && (
                    <button
                      onClick={() => onDelete(appt.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}

                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
