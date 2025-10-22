import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Records = () => {
  const [records, setRecords] = useState([]);
  const [labStatus, setLabStatus] = useState({ current_occupants: [], last_exits: [] });
  const [loading, setLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recordsRes, statusRes] = await Promise.all([
        axios.get('http://localhost:5000/api/records'),
        axios.get('http://localhost:5000/api/current_lab_status')
      ]);
      setRecords(recordsRes.data);
      setLabStatus(statusRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecord = async (recordId) => {
    if (window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      try {
        const response = await axios.delete(`http://localhost:5000/api/records/${recordId}`);
        if (response.data.success) {
          setDeleteMessage('Record deleted successfully!');
          fetchData();
          setTimeout(() => setDeleteMessage(''), 3000);
        }
      } catch (error) {
        setDeleteMessage('Error deleting record: ' + error.message);
        setTimeout(() => setDeleteMessage(''), 5000);
      }
    }
  };

  const clearAllRecords = async () => {
    if (window.confirm('Are you sure you want to delete ALL records? This action cannot be undone!')) {
      try {
        const response = await axios.delete('http://localhost:5000/api/records');
        if (response.data.success) {
          setDeleteMessage('All records deleted successfully!');
          fetchData();
          setTimeout(() => setDeleteMessage(''), 3000);
        }
      } catch (error) {
        setDeleteMessage('Error clearing records: ' + error.message);
        setTimeout(() => setDeleteMessage(''), 5000);
      }
    }
  };

  const exportToExcel = async (type = 'all') => {
    try {
      setExportLoading(true);
      
      let url = type === 'all' 
        ? 'http://localhost:5000/api/export/excel' 
        : 'http://localhost:5000/api/export/current_status';
      
      const response = await axios.get(url, {
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Create filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = type === 'all' 
        ? `lab_records_${timestamp}.xlsx` 
        : `current_lab_status_${timestamp}.xlsx`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting to Excel. Make sure backend is running and pandas/openpyxl are installed.');
    } finally {
      setExportLoading(false);
    }
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return 'N/A';
    return new Date(dateTimeStr).toLocaleString();
  };

  const getDuration = (entryTime, exitTime) => {
    if (!entryTime) return 'N/A';
    
    const entry = new Date(entryTime);
    const exit = exitTime ? new Date(exitTime) : new Date();
    
    const diffMs = exit - entry;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) {
      return `${minutes}m`;
    }
    return `${hours}h ${minutes}m`;
  };

  // Calculate unique persons count
  const uniquePersonsCount = [...new Set(records.map(record => record.id))].length;

  return (
    <div>
      <div className="current-lab-section">
        <h3><i className="fas fa-map-marker-alt"></i> Current Lab Status</h3>
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="lab-grid">
            {labStatus.current_occupants.length > 0 ? (
              labStatus.current_occupants.map((occupant, index) => (
                <div key={index} className="lab-card">
                  <h4>{occupant.lab_name}</h4>
                  <p><strong>Occupant:</strong> {occupant.name}</p>
                  <p><strong>Email:</strong> {occupant.email}</p>
                  <p><strong>Entry Time:</strong> {formatDateTime(occupant.entry_time)}</p>
                  <p><strong>Duration:</strong> {getDuration(occupant.entry_time, null)}</p>
                  <span className="status-badge status-in">IN LAB</span>
                </div>
              ))
            ) : (
              <p>No one is currently in any lab.</p>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2><i className="fas fa-history"></i> All Records</h2>
        
        {deleteMessage && (
          <div className={`alert ${deleteMessage.includes('Error') ? 'alert-error' : 'alert-success'}`}>
            {deleteMessage}
          </div>
        )}

        {/* Export Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <button onClick={fetchData} className="btn btn-primary">
            <i className="fas fa-sync-alt"></i> Refresh Records
          </button>
          
          <button 
            onClick={() => exportToExcel('all')} 
            className="btn btn-primary"
            style={{backgroundColor: '#4caf50'}}
            disabled={exportLoading || records.length === 0}
          >
            <i className="fas fa-file-excel"></i> 
            {exportLoading ? ' Exporting...' : ' Export All to Excel'}
          </button>
          
          <button 
            onClick={() => exportToExcel('current')} 
            className="btn btn-primary"
            style={{backgroundColor: '#2196f3'}}
            disabled={exportLoading || labStatus.current_occupants.length === 0}
          >
            <i className="fas fa-download"></i> 
            {exportLoading ? ' Exporting...' : ' Export Current Status'}
          </button>
          
          <button 
            onClick={clearAllRecords} 
            className="btn btn-primary" 
            style={{backgroundColor: '#f44336'}}
            disabled={records.length === 0}
          >
            <i className="fas fa-trash"></i> Clear All Records
          </button>
        </div>

        {/* Records Summary */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px', 
          marginBottom: '20px',
          padding: '15px',
          background: '#e3f2fd',
          borderRadius: '8px'
        }}>
          <div style={{textAlign: 'center'}}>
            <h4 style={{color: '#1e88e5', margin: '0'}}>{records.length}</h4>
            <p style={{margin: '5px 0 0 0', fontSize: '0.9rem'}}>Total Records</p>
          </div>
          <div style={{textAlign: 'center'}}>
            <h4 style={{color: '#4caf50', margin: '0'}}>{labStatus.current_occupants.length}</h4>
            <p style={{margin: '5px 0 0 0', fontSize: '0.9rem'}}>Currently in Lab</p>
          </div>
          <div style={{textAlign: 'center'}}>
            <h4 style={{color: '#ff9800', margin: '0'}}>{uniquePersonsCount}</h4>
            <p style={{margin: '5px 0 0 0', fontSize: '0.9rem'}}>Unique Persons</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="records-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Lab</th>
                <th>Entry Time</th>
                <th>Exit Time</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.name}</td>
                  <td>{record.email}</td>
                  <td>{record.lab_name}</td>
                  <td>{formatDateTime(record.entry_time)}</td>
                  <td>{formatDateTime(record.exit_time)}</td>
                  <td>{getDuration(record.entry_time, record.exit_time)}</td>
                  <td>
                    <span className={`status-badge ${record.exit_time ? 'status-out' : 'status-in'}`}>
                      {record.exit_time ? 'OUT' : 'IN'}
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => deleteRecord(record.id)}
                      className="btn btn-primary"
                      style={{ 
                        backgroundColor: '#f44336', 
                        padding: '5px 10px', 
                        fontSize: '0.8rem' 
                      }}
                      title="Delete this record"
                    >
                      <i className="fas fa-trash"></i> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {records.length === 0 && !loading && (
          <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            No records found. Scan some QR codes to see records here.
          </p>
        )}
      </div>
    </div>
  );
};

export default Records;