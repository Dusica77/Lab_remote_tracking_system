import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Records = () => {
  const [records, setRecords] = useState([]);
  const [labStatus, setLabStatus] = useState({ current_occupants: [], last_exits: [] });
  const [loading, setLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

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
          fetchData(); // Refresh the data
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

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return 'N/A';
    return new Date(dateTimeStr).toLocaleString();
  };

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

        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <button onClick={fetchData} className="btn btn-primary">
            <i className="fas fa-sync-alt"></i> Refresh Records
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

        <div style={{ overflowX: 'auto' }}>
          <table className="records-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Lab</th>
                <th>Entry Time</th>
                <th>Exit Time</th>
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