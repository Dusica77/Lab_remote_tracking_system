import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';

const Dashboard = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', department: ''
  });
  const [qrImage, setQrImage] = useState('');
  const [qrData, setQrData] = useState('');
  const [savedPersons, setSavedPersons] = useState([]);
  const [message, setMessage] = useState('');

  // Load saved persons from local storage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('labPersons');
    if (saved) {
      setSavedPersons(JSON.parse(saved));
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const response = await axios.post('http://localhost:5000/api/register', formData);
      if (response.data.success) {
        const personData = {
          id: response.data.person_id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          registration_date: new Date().toISOString()
        };

        // Generate QR code data (the actual text that will be scanned)
        const qrText = JSON.stringify({
          id: response.data.person_id,
          name: formData.name,
          email: formData.email
        });
        
        setQrData(qrText); // Store the QR text data
        
        // Generate QR code image
        const qrImageUrl = await QRCode.toDataURL(qrText);
        setQrImage(qrImageUrl);

        // Save to local storage
        const updatedPersons = [...savedPersons, { 
          ...personData, 
          qrImage: qrImageUrl,
          qrData: qrText // Store the actual QR data
        }];
        setSavedPersons(updatedPersons);
        localStorage.setItem('labPersons', JSON.stringify(updatedPersons));

        setMessage('Person registered successfully and saved locally!');
        setFormData({ name: '', email: '', phone: '', department: '' });
      } else {
        setMessage(response.data.message);
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
    }
  };

  const downloadQRCode = (person) => {
    const link = document.createElement('a');
    link.download = `${person.name}_qrcode.png`;
    link.href = person.qrImage;
    link.click();
  };

  const copyQRData = (person) => {
    navigator.clipboard.writeText(person.qrData)
      .then(() => {
        alert('QR code data copied to clipboard! Paste it in the scanner.');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  const deletePerson = (id) => {
    const updatedPersons = savedPersons.filter(person => person.id !== id);
    setSavedPersons(updatedPersons);
    localStorage.setItem('labPersons', JSON.stringify(updatedPersons));
  };

  return (
    <div>
      <div className="card">
        <h2><i className="fas fa-user-plus"></i> Register Person</h2>
        {message && <div className={`alert ${message.includes('successfully') ? 'alert-success' : 'alert-error'}`}>{message}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input type="text" name="name" className="form-control" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" name="email" className="form-control" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input type="tel" name="phone" className="form-control" value={formData.phone} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Department</label>
            <input type="text" name="department" className="form-control" value={formData.department} onChange={handleChange} />
          </div>
          <button type="submit" className="btn btn-primary">
            <i className="fas fa-save"></i> Register & Generate QR
          </button>
        </form>
      </div>

      {qrImage && (
        <div className="card">
          <h2><i className="fas fa-qrcode"></i> Generated QR Code</h2>
          <div className="qr-container">
            <img src={qrImage} alt="QR Code" style={{ width: '200px', height: '200px', border: '2px solid #333' }} />
            <div style={{ marginTop: '15px' }}>
              <button 
                onClick={() => downloadQRCode(savedPersons[savedPersons.length - 1])} 
                className="btn btn-primary"
                style={{ marginRight: '10px' }}
              >
                <i className="fas fa-download"></i> Download QR
              </button>
              <button 
                onClick={() => copyQRData(savedPersons[savedPersons.length - 1])} 
                className="btn btn-primary"
                style={{ backgroundColor: '#4caf50' }}
              >
                <i className="fas fa-copy"></i> Copy QR Data
              </button>
            </div>
            <div style={{ marginTop: '15px', background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
              <p><strong>QR Code Data:</strong></p>
              <code style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
                {qrData}
              </code>
            </div>
          </div>
        </div>
      )}

      {savedPersons.length > 0 && (
        <div className="card">
          <h2><i className="fas fa-users"></i> Saved Persons ({savedPersons.length})</h2>
          <div className="saved-persons-grid">
            {savedPersons.map((person) => (
              <div key={person.id} className="person-card">
               
<div className="person-info">
  <h4>
    {person.name} 
    <span style={{ 
      fontSize: '0.8rem', 
      background: '#1e88e5', 
      color: 'white', 
      padding: '2px 8px', 
      borderRadius: '10px',
      marginLeft: '10px'
    }}>
      ID: {person.id}
    </span>
  </h4>
  <p><strong>Email:</strong> {person.email}</p>
  <p><strong>Phone:</strong> {person.phone || 'N/A'}</p>
  <p><strong>Department:</strong> {person.department || 'N/A'}</p>
</div>
                <div className="person-actions">
                  <img src={person.qrImage} alt="QR Code" style={{ width: '80px', height: '80px', border: '1px solid #ccc' }} />
                  <div style={{ marginTop: '10px', display: 'flex', gap: '5px', flexDirection: 'column' }}>
                    <button 
                      onClick={() => downloadQRCode(person)} 
                      className="btn btn-primary"
                      style={{ padding: '5px 10px', fontSize: '0.7rem' }}
                    >
                      <i className="fas fa-download"></i> Download
                    </button>
                    <button 
                      onClick={() => copyQRData(person)} 
                      className="btn btn-primary"
                      style={{ backgroundColor: '#4caf50', padding: '5px 10px', fontSize: '0.7rem' }}
                    >
                      <i className="fas fa-copy"></i> Copy Data
                    </button>
                    <button 
                      onClick={() => deletePerson(person.id)} 
                      className="btn btn-primary"
                      style={{ backgroundColor: '#f44336', padding: '5px 10px', fontSize: '0.7rem' }}
                    >
                      <i className="fas fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;