import { useState, useEffect } from 'react';
import { Fragment } from 'react';
import './App.css';


const initialVehicle = {
  Vehicle_Number: '',
  Vehicle_Type: 'Two Wheeler',
  Customer_Name: '',
  Customer_Phone: '',
  Book_Date: '',
  Exp_Date: '',
  Reference_Name: '',
  Reference_Contact: '',
  Notes: '',
};

function App() {





  const [vehicles, setVehicles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialVehicle);
  const [editIndex, setEditIndex] = useState(null);
  const [filter, setFilter] = useState('All Policies');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deletePopup, setDeletePopup] = useState({ show: false, index: null });
  const SHEETDB_URL = 'https://sheetdb.io/api/v1/e56400oum953h';

  // Fetch vehicles from SheetDB
  useEffect(() => {
    fetch(SHEETDB_URL)
      .then(res => res.json())
      .then(data => setVehicles(data))
      .catch(() => setVehicles([]));
  }, []);

  // Helper to calculate days left
  function getDaysLeft(expDate) {
    if (!expDate) return '';
    const exp = new Date(expDate);
    const now = new Date();
    const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }

  // Helper to get card border color
  function getCardBorderColor(expDate) {
    const days = getDaysLeft(expDate);
    if (days > 30) return 'border-green-500';
    if (days <= 30 && days > 0) return 'border-yellow-500';
    return 'border-red-500';
  }

  // Helper to show toast
  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type }), 2200);
  }

  // Filter vehicles
  const filteredVehicles = vehicles.filter(v => {
    if (search && !(
      v.Vehicle_Number?.toLowerCase().includes(search.toLowerCase()) ||
      v.Customer_Name?.toLowerCase().includes(search.toLowerCase()) ||
      v.Vehicle_Type?.toLowerCase().includes(search.toLowerCase())
    )) return false;
    if (filter === 'Active') {
      return getDaysLeft(v.Exp_Date) > 30;
    } else if (filter === 'Expiring Soon') {
      return getDaysLeft(v.Exp_Date) <= 30 && getDaysLeft(v.Exp_Date) > 0;
    } else if (filter === 'Expired') {
      return getDaysLeft(v.Exp_Date) <= 0;
    }
    return true;
  });

  // Summary counts
  const totalVehicles = vehicles.length;
  const activePolicies = vehicles.filter(v => getDaysLeft(v.Exp_Date) > 0).length;
  const expiringSoon = vehicles.filter(v => getDaysLeft(v.Exp_Date) <= 30 && getDaysLeft(v.Exp_Date) > 0).length;

  // Modal open for add/edit
  function openModal(index = null) {
    setEditIndex(index);
    setForm(index !== null ? vehicles[index] : initialVehicle);
    setShowModal(true);
  }
  function closeModal() {
    setShowModal(false);
    setForm(initialVehicle);
    setEditIndex(null);
  }
  function handleFormChange(e) {
    const { name, value } = e.target;
    if (name === 'Vehicle_Number') {
      setForm(f => ({ ...f, [name]: value.toUpperCase() }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  }
  // Add or update vehicle in SheetDB
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editIndex !== null) {
        // Update (PATCH) using Entry_ID
        const entryId = vehicles[editIndex].Entry_ID;
        if (!entryId) throw new Error('Entry_ID missing for update');
        const res = await fetch(`${SHEETDB_URL}/Entry_ID/${entryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: form })
        });
        if (!res.ok) throw new Error('Failed to update');
        showToast('Vehicle Updated Successfully', 'success');
      } else {
        // Add (POST) with automatic Entry_ID
        const newEntry = { ...form, Entry_ID: Date.now().toString() };
        const res = await fetch(SHEETDB_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: [newEntry] })
        });
        if (!res.ok) throw new Error('Failed to add');
        showToast('Vehicle Added Successfully', 'success');
      }
      // Refresh data
      fetch(SHEETDB_URL)
        .then(res => res.json())
        .then(data => setVehicles(data));
      closeModal();
    } catch (err) {
      showToast(err.message || 'Error occurred', 'error');
    }
  }
  // Delete vehicle from SheetDB
  function openDeletePopup(index) {
    setDeletePopup({ show: true, index });
  }

  function closeDeletePopup() {
    setDeletePopup({ show: false, index: null });
  }

  async function confirmDelete() {
    const index = deletePopup.index;
    if (index === null) return;
    const row = vehicles[index];
    const entryId = row.Entry_ID;
    if (!entryId) {
      showToast('Entry_ID missing for delete', 'error');
      closeDeletePopup();
      return;
    }
    const deleteUrl = `${SHEETDB_URL}/Entry_ID/${entryId}`;
    try {
      const res = await fetch(deleteUrl, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      showToast('Vehicle Deleted Successfully', 'success');
      fetch(SHEETDB_URL)
        .then(res => res.json())
        .then(data => setVehicles(data));
    } catch (err) {
      showToast(err.message || 'Error occurred', 'error');
    }
    closeDeletePopup();
  }

  return (
    <Fragment>
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-6 left-1/2 z-[100] -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg text-white font-semibold transition-all duration-500 animate-fade-in ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-2 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 rounded-xl p-3 animate-fade-in">
              <svg width="40" height="40" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1,0,0,1,0,0)">
      <path d="M13.325,14.682C13.325,13.599 14.223,12.701 15.306,12.701L48.694,12.701C49.777,12.701 50.675,13.599 50.675,14.682L53.348,23.676L54.985,24.256C56.216,24.694 57,25.85 57,27.161L57,39C57,40.657 55.657,42 54,42L51,42C49.343,42 48,40.657 48,39L48,38L16,38L16,39C16,40.657 14.657,42 13,42L10,42C8.343,42 7,40.657 7,39L7,27.161C7,25.85 7.784,24.694 9.015,24.256L10.652,23.676L13.325,14.682ZM16,31C16,32.657 17.343,34 19,34C20.657,34 22,32.657 22,31C22,29.343 20.657,28 19,28C17.343,28 16,29.343 16,31ZM42,31C42,32.657 43.343,34 45,34C46.657,34 48,32.657 48,31C48,29.343 46.657,28 45,28C43.343,28 42,29.343 42,31ZM20.7,16L18.275,24L45.725,24L43.3,16L20.7,16Z" fill="#000000"/>
    </g>
  </svg>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-blue-700">Smart Vehicle Insurance Tracker</h1>
              <p className="text-gray-500">Manage your vehicle insurance records digitally <span className="ml-2 inline-block w-2 h-2 bg-green-400 rounded-full"></span></p>
            </div>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-xl flex items-center gap-2 shadow transition-all duration-200 active:scale-95" onClick={() => openModal()}>
            <span className="text-xl">+</span> Add Vehicle
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow p-6 flex flex-col transition-all duration-300 hover:shadow-xl animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500">Total Vehicles</span>
              <span className="bg-blue-100 p-2 rounded-xl">
              <div className="animated-car">
  <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
    <rect x="2" y="10" width="10" height="6" rx="1" fill="#2563eb" />
    <rect x="12" y="8" width="10" height="8" rx="1" fill="#2563eb" />
    <circle cx="6" cy="18" r="2" fill="#2563eb" />
    <circle cx="18" cy="18" r="2" fill="#2563eb" />
  </svg>
</div>

              </span>
            </div>
            <div className="text-3xl font-bold">{totalVehicles}</div>
            <span className="text-blue-600 mt-2 text-sm font-medium cursor-pointer">Active Portfolio</span>
            <div className="mt-4 h-2 w-full bg-blue-100 rounded-full">
              <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${Math.min(100, totalVehicles * 70)}%` }}></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 flex flex-col transition-all duration-300 hover:shadow-xl animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500">Active Policies</span>
              <span className="bg-green-100 p-2 rounded-xl">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#22c55e"/><path stroke="#fff" strokeWidth="2" d="M8 12l2 2 4-4"/></svg>
              </span>
            </div>
            <div className="text-3xl font-bold">{activePolicies}</div>
            <span className="text-green-600 mt-2 text-sm font-medium cursor-pointer">Protected</span>
            <div className="mt-4 h-2 w-full bg-green-100 rounded-full">
              <div className="h-2 bg-green-500 rounded-full" style={{ width: `${Math.min(100, activePolicies * 80)}%` }}></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 flex flex-col transition-all duration-300 hover:shadow-xl animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500">Expiring Soon</span>
              <span className="bg-yellow-100 p-2 rounded-xl">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#facc15"/><path stroke="#fff" strokeWidth="2" d="M12 8v4"/><circle cx="12" cy="16" r="1" fill="#fff"/></svg>
              </span>
            </div>
            <div className="text-3xl font-bold">{expiringSoon}</div>
            <span className="text-yellow-600 mt-2 text-sm font-medium cursor-pointer">Needs Attention</span>
            <div className="mt-4 h-2 w-full bg-yellow-100 rounded-full">
              <div className="h-2 bg-yellow-500 rounded-full" style={{ width: `${Math.min(100, expiringSoon * 30)}%` }}></div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by vehicle number, customer name, or vehicle type..." className="flex-1 px-6 py-3 rounded-xl border border-gray-200 shadow focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200" />
          <select className="px-4 py-3 rounded-xl border border-gray-200 shadow bg-white text-gray-700" value={filter} onChange={e => setFilter(e.target.value)}>
            <option>All Policies</option>
            <option>Active</option>
            <option>Expiring Soon</option>
            <option>Expired</option>
          </select>
        </div>

        {/* Vehicle Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.length === 0 && (
            <div className="flex flex-col items-center justify-center col-span-3 py-12 animate-fade-in">
              <div className="animated-car mb-2 relative flex flex-col items-center">
                <svg width="64" height="64" fill="none" viewBox="0 0 24 24">
                  <rect x="2" y="10" width="10" height="6" rx="1" fill="#2563eb" />
                  <rect x="12" y="8" width="10" height="8" rx="1" fill="#2563eb" />
                  <circle cx="6" cy="18" r="2" fill="#2563eb" />
                  <circle cx="18" cy="18" r="2" fill="#2563eb" />
                </svg>
                <svg width="48" height="12" viewBox="0 0 48 12" className="absolute left-1/2 -translate-x-1/2 top-[54px]" style={{zIndex:0}}>
                  <ellipse cx="24" cy="6" rx="20" ry="5" fill="#000" opacity="0.18" />
                </svg>
              </div>
              <div className="text-gray-900 text-2xl font-bold text-center">No Record Found</div>
            </div>
          )}
          {filteredVehicles.map((v, idx) => {
            const borderColor = getCardBorderColor(v.Exp_Date);
            return (
              <div
                key={idx}
                className={`bg-white rounded-2xl shadow p-6 border-l-4 ${borderColor} transition-all duration-300 hover:shadow-xl animate-fade-in`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xl font-bold tracking-widest">{v.Vehicle_Number}</span>
                  <div className="flex gap-2">
                    <button className="text-blue-500 hover:text-blue-700 transition-all duration-200" title="Edit" onClick={() => openModal(idx)}>
                      {/* Pencil icon */}
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" strokeWidth="2" d="M15.232 5.232a3 3 0 0 1 4.243 4.243l-10.5 10.5a2 2 0 0 1-.878.515l-4 1a1 1 0 0 1-1.213-1.213l1-4a2 2 0 0 1 .515-.878l10.5-10.5z" />
                      </svg>
                    </button>
                    <button className="text-red-500 hover:text-red-700 transition-all duration-200" title="Delete" onClick={() => openDeletePopup(idx)}>
                      {/* Trash icon */}
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" strokeWidth="2" d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
                        <path stroke="currentColor" strokeWidth="2" d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </div>
                <span className="inline-block bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs mb-3">{v.Vehicle_Type}</span>
                <div className="flex items-center gap-2 mb-3">
                  {getDaysLeft(v.Exp_Date) > 30 && (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold text-sm flex items-center gap-1">
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#22c55e"/><path stroke="#fff" strokeWidth="2" d="M8 12l2 2 4-4"/></svg>
                      Active ({getDaysLeft(v.Exp_Date)} days)
                    </span>
                  )}
                  {getDaysLeft(v.Exp_Date) <= 30 && getDaysLeft(v.Exp_Date) > 0 && (
                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-semibold text-sm flex items-center gap-1">
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#facc15"/><path stroke="#fff" strokeWidth="2" d="M12 8v4"/><circle cx="12" cy="16" r="1" fill="#fff"/></svg>
                      Expiring Soon ({getDaysLeft(v.Exp_Date)} days)
                    </span>
                  )}
                  {getDaysLeft(v.Exp_Date) <= 0 && (
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold text-sm flex items-center gap-1">
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ef4444"/><path stroke="#fff" strokeWidth="2" d="M6 12l6 6 6-6"/></svg>
                      Expired
                    </span>
                  )}
                </div>
                <div className="mb-2 flex items-center gap-2 text-gray-700">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24">

  <circle cx="12" cy="7" r="4" stroke="#2563eb" stroke-width="2"/>

  
  <path d="M6 20c0-3.33 2.69-6 6-6s6 2.67 6 6" stroke="#2563eb" stroke-width="2" fill="none"/>


  <path d="M6 20c0-2 1.5-3.5 3.5-3.5h5c2 0 3.5 1.5 3.5 3.5" stroke="#2563eb" stroke-width="2" fill="none"/>
</svg>

                  {v.Customer_Name}
                </div>
                <div className="mb-2 flex items-center gap-2 text-gray-700">
                  <svg width="24" height="24" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill="#34A853">
  <path d="M391.1 351.1c-21.6 0-42.6-3.4-62.7-9.9-9.1-3-19.2-.6-26.1 6.3l-46.1 34.7c-62.8-33.1-113.5-83.8-146.6-146.6l34.7-46.1c6.9-6.9 9.3-17 6.3-26.1-6.5-20.1-9.9-41.1-9.9-62.7 0-14.2-11.5-25.8-25.8-25.8H70.9C56.7 75 45 86.6 45 100.9c0 199.6 162.4 362 362 362 14.2 0 25.8-11.5 25.8-25.8v-74.5c0-14.2-11.5-25.8-25.8-25.8h-15.9z"/>
</svg>

                  {v.Customer_Phone}
                </div>
                <div className="flex items-center gap-2 text-gray-700 mb-2">
              
<svg width="29" height="29" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">

  <path d="M511.9 183c-181.8 0-329.1 147.4-329.1 329.1s147.4 329.1 329.1 329.1S841 693.9 841 512.2 693.6 183 511.9 183z 
           m0 585.2c-141.2 0-256-114.8-256-256s114.8-256 256-256 256 114.8 256 256-114.9 256-256 256z" 
        fill="#0F1F3C"/>
  
  
  <path d="M475.4 365.7h73.1v182.9h-73.1zM475.4 585.1h73.1v73.1h-73.1z" fill="#0F1F3C"/>
</svg>

                  Expires: <span className="font-bold">{v.Exp_Date ? new Date(v.Exp_Date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase() : '-'}</span>
                </div>
                {v.Reference_Name && (
                  <div className="flex items-center gap-2 text-gray-700 mb-2">
                    <span className="font-semibold">🔗</span> {v.Reference_Name} ({v.Reference_Contact})
                  </div>
                )}
                {v.Notes && (
                  <div className="text-gray-500 text-sm mt-2">{v.Notes}</div>
                )}
              </div>
            );
          })}
        </div>

      {/* Modal for Add/Edit Vehicle */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          {/* Overlay: blue + black gradient */}
          <div className="absolute inset-0 pointer-events-none animate-blur-fade" style={{background: 'linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(0,0,0,0.38) 60%, rgba(0,0,0,0.12) 100%)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)'}}></div>
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl p-8 relative animate-slide-up">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl transition-all duration-200" onClick={closeModal}>&times;</button>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 rounded-xl p-2">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path fill="#2563eb" d="M5 11V9a7 7 0 0 1 14 0v2"/><rect x="2" y="11" width="20" height="8" rx="4" fill="#2563eb"/><circle cx="7" cy="19" r="2" fill="#2563eb"/><circle cx="17" cy="19" r="2" fill="#2563eb"/></svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-blue-700">{editIndex !== null ? 'Edit Vehicle Insurance' : 'Add Vehicle Insurance'}</h2>
                <p className="text-gray-500">Enter vehicle insurance information</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-semibold">Vehicle Number <span className="text-red-500">*</span></label>
                <input name="Vehicle_Number" value={form.Vehicle_Number} onChange={handleFormChange} required className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200" style={{ textTransform: 'uppercase' }} />
              </div>
              <div>
                <label className="font-semibold">Vehicle Type</label>
                <select name="Vehicle_Type" value={form.Vehicle_Type} onChange={handleFormChange} className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                  <option>Two Wheeler</option>
                  <option>Four Wheeler</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold">Customer Name</label>
                  <input name="Customer_Name" value={form.Customer_Name} onChange={handleFormChange} placeholder="Enter customer name" className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200" />
                </div>
                <div>
                  <label className="font-semibold">Customer Phone</label>
                  <input name="Customer_Phone" value={form.Customer_Phone} onChange={handleFormChange} placeholder="10-digit mobile number" className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold">Book Date</label>
                  <input name="Book_Date" value={form.Book_Date} onChange={handleFormChange} type="date" className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200" />
                </div>
                <div>
                  <label className="font-semibold">Expiring Date</label>
                  <input name="Exp_Date" value={form.Exp_Date} onChange={handleFormChange} type="date" className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold">Reference Name</label>
                  <input name="Reference_Name" value={form.Reference_Name} onChange={handleFormChange} placeholder="Reference person name" className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200" />
                </div>
                <div>
                  <label className="font-semibold">Reference Contact</label>
                  <input name="Reference_Contact" value={form.Reference_Contact} onChange={handleFormChange} placeholder="10-digit mobile number" className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200" />
                </div>
              </div>
              <div>
                <label className="font-semibold">Notes</label>
                <textarea name="Notes" value={form.Notes} onChange={handleFormChange} placeholder="Additional notes or comments..." className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200" />
              </div>
              <div className="flex justify-end mt-6">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-xl shadow transition-all duration-200 active:scale-95">{editIndex !== null ? 'Update' : 'Add'} Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {deletePopup.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          {/* Overlay: blue + black gradient */}
          <div className="absolute inset-0 pointer-events-none animate-blur-fade" style={{background: 'linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(0,0,0,0.38) 60%, rgba(0,0,0,0.12) 100%)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)'}}></div>
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 relative animate-slide-up flex flex-col items-center">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl transition-all duration-200" onClick={closeDeletePopup}>&times;</button>
            <div className="flex flex-col items-center mb-6">
              <div className="bg-red-100 rounded-full p-3 mb-3">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
                  <path stroke="#ef4444" strokeWidth="2" d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
                  <path stroke="#ef4444" strokeWidth="2" d="M10 11v6M14 11v6" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-red-600 mb-2">Delete</h2>
              <p className="text-gray-500 text-center">Are you sure you would like to do this?</p>
            </div>
            <div className="flex gap-4 w-full justify-center mt-2">
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2 rounded-xl w-1/2 transition-all duration-200" onClick={closeDeletePopup}>Cancel</button>
              <button className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-xl w-1/2 transition-all duration-200" onClick={confirmDelete}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      </div>
      {/* Animations */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .animate-fade-in { animation: fade-in 0.7s; }
        @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: none; } }
        .animate-slide-up { animation: slide-up 0.4s; }
        @keyframes blur-fade {
          from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
        }
        .animate-blur-fade {
          animation: blur-fade 0.5s ease;
        }
      `}</style>
    </Fragment>
  );
}

export default App;
