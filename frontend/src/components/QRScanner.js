import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import jsQR from 'jsqr';

const QRScanner = () => {
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [manualId, setManualId] = useState('');
  const [labName, setLabName] = useState('Main Lab');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [lastScanned, setLastScanned] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
    
    return () => {
      stopCameraScan();
    };
  }, []);

  const playScanSound = () => {
    try {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
    } catch (error) {
      console.log('Sound error:', error);
    }
  };

  const showSuccessMessage = () => {
    setShowSuccessPopup(true);
    setTimeout(() => {
      setShowSuccessPopup(false);
    }, 3000);
  };

  const startCameraScan = async () => {
    try {
      setCameraError('');
      setScanError('');
      setScanResult(null);
      setIsScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", true);
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            startQRDetection();
          });
        };
      }

    } catch (error) {
      console.error('Camera error:', error);
      setCameraError(`Camera Error: ${error.message}`);
      setIsScanning(false);
    }
  };

  const startQRDetection = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    const scanQR = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          console.log('QR Code detected:', code.data);
          handleScan(code.data);
        }
      }
    };

    scanIntervalRef.current = setInterval(scanQR, 500);
  };

  const stopCameraScan = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const handleScan = async (qrContent) => {
    if (qrContent === lastScanned) {
      return;
    }
    setLastScanned(qrContent);
    
    try {
      setScanError(null);
      
      let qrData;
      try {
        qrData = JSON.parse(qrContent);
        
        if (!qrData.id || !qrData.name || !qrData.email) {
          throw new Error('Missing required fields in QR code');
        }
      } catch (e) {
        setScanError(`Invalid QR code format: ${e.message}`);
        return;
      }

      const response = await axios.post('http://localhost:5000/api/scan', {
        qr_content: qrContent,
        lab_name: labName
      });
      
      if (response.data.success) {
        setScanResult(response.data);
        playScanSound();
        showSuccessMessage();
      } else {
        setScanError(response.data.message);
      }
    } catch (error) {
      setScanError('Error scanning QR code: ' + error.message);
    }
  };

  const handleManualScan = async () => {
    if (!manualId.trim()) {
      setScanError('Please enter a Person ID');
      return;
    }

    // Validate it's a number
    const idNumber = parseInt(manualId);
    if (isNaN(idNumber) || idNumber <= 0) {
      setScanError('Please enter a valid positive number for ID');
      return;
    }

    try {
      setScanError(null);
      
      console.log('Looking for person with ID:', idNumber);
      
      // Use the new API endpoint to get person by ID
      const response = await axios.get(`http://localhost:5000/api/person/${idNumber}`);
      console.log('Person API response:', response.data);
      
      if (response.data.success) {
        const person = response.data.person;
        
        // Create the QR data structure
        const qrData = {
          id: person.id,
          name: person.name,
          email: person.email
        };

        console.log('Sending scan request with data:', qrData);

        // Now scan this person
        const scanResponse = await axios.post('http://localhost:5000/api/scan', {
          qr_content: JSON.stringify(qrData),
          lab_name: labName
        });
        
        console.log('Scan response:', scanResponse.data);
        
        if (scanResponse.data.success) {
          setScanResult(scanResponse.data);
          setManualId(''); // Clear the input
          playScanSound();
          showSuccessMessage();
        } else {
          setScanError(scanResponse.data.message);
        }
      } else {
        setScanError(response.data.message);
      }
    } catch (error) {
      console.error('Manual scan error:', error);
      setScanError('Error: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleManualScan();
    }
  };

  // Test function to check all registered persons
  const testAllPersons = async () => {
    try {
      const recordsResponse = await axios.get('http://localhost:5000/api/records');
      const allRecords = recordsResponse.data;
      
      // Get unique person IDs from records
      const uniquePersonIds = [...new Set(allRecords.map(record => record.id))];
      console.log('Found person IDs in records:', uniquePersonIds);
      
      if (uniquePersonIds.length === 0) {
        alert('No persons found in records. Please register someone first.');
        return;
      }
      
      alert(`Found ${uniquePersonIds.length} person(s) in system:\n${uniquePersonIds.join(', ')}`);
      
    } catch (error) {
      console.error('Test error:', error);
      alert('Error fetching persons: ' + error.message);
    }
  };

  return (
    <div className="card">
      <h2><i className="fas fa-qrcode"></i> QR Scanner</h2>
      
      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="success-popup">
          <div className="popup-content">
            <i className="fas fa-check-circle"></i>
            <span>Successfully Scanned!</span>
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Lab Name</label>
        <select className="form-control" value={labName} onChange={(e) => setLabName(e.target.value)}>
          <option value="Main Lab">Main Lab</option>
          <option value="Chemistry Lab">Chemistry Lab</option>
          <option value="Physics Lab">Physics Lab</option>
          <option value="Biology Lab">Biology Lab</option>
          <option value="Computer Lab">Computer Lab</option>
        </select>
      </div>

      {/* Camera Scanner Section */}
      <div className="scanner-section">
        <h3><i className="fas fa-camera"></i> Camera Scanner</h3>
        
        {cameraError && (
          <div className="scan-result scan-error">
            <h4>❌ Camera Issue</h4>
            <p>{cameraError}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
          {!isScanning ? (
            <button onClick={startCameraScan} className="btn btn-primary">
              <i className="fas fa-camera"></i> Start Camera Scanner
            </button>
          ) : (
            <button onClick={stopCameraScan} className="btn btn-primary" style={{backgroundColor: '#f44336'}}>
              <i className="fas fa-stop"></i> Stop Camera
            </button>
          )}
          
          <button onClick={testAllPersons} className="btn btn-primary" style={{backgroundColor: '#9c27b0'}}>
            <i className="fas fa-list"></i> Check All IDs
          </button>
        </div>
        
        {isScanning && (
          <div className="scanner-container">
            <video 
              ref={videoRef} 
              style={{ 
                width: '100%', 
                maxWidth: '400px', 
                border: '3px solid #1e88e5', 
                borderRadius: '10px',
                background: '#000'
              }}
              playsInline
              muted
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <p style={{textAlign: 'center', marginTop: '10px', color: '#4caf50'}}>
              <i className="fas fa-search"></i> Scanning for QR codes...
            </p>
          </div>
        )}
      </div>

      {/* Manual Input Section - ID ONLY */}
      <div className="manual-section">
        <h3><i className="fas fa-keyboard"></i> Manual Entry</h3>
        
        <div className="form-group">
          <label>Enter Person ID</label>
          <input
            type="number"
            className="form-control"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter ID number only"
            min="1"
            style={{ 
              fontSize: '1.2rem', 
              fontWeight: 'bold', 
              textAlign: 'center',
              padding: '15px'
            }}
          />
        </div>
        
        <button onClick={handleManualScan} className="btn btn-primary" style={{width: '100%'}}>
          <i className="fas fa-sign-in-alt"></i> SCAN BY ID
        </button>

        <div style={{ marginTop: '15px', padding: '10px', background: '#e8f5e8', borderRadius: '5px', border: '1px solid #4caf50' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#2e7d32', textAlign: 'center' }}>
            <i className="fas fa-lightbulb"></i> <strong>Find IDs:</strong> Check "Saved Persons" in Dashboard
          </p>
        </div>
      </div>

      {/* Scan Results */}
      {scanResult && (
        <div className="scan-result scan-success">
          <h3>✅ Scan Successful!</h3>
          <p><strong>Action:</strong> {scanResult.action.toUpperCase()}</p>
          <p><strong>Name:</strong> {scanResult.person.name}</p>
          <p><strong>Email:</strong> {scanResult.person.email}</p>
          <p><strong>Lab:</strong> {scanResult.lab_name}</p>
          <p><strong>Time:</strong> {scanResult.timestamp}</p>
          <button 
            onClick={() => setScanResult(null)} 
            className="btn btn-primary"
            style={{marginTop: '10px'}}
          >
            Scan Another
          </button>
        </div>
      )}

      {scanError && (
        <div className="scan-result scan-error">
          <h3>❌ Scan Failed</h3>
          <p>{scanError}</p>
          <button 
            onClick={() => setScanError(null)} 
            className="btn btn-primary"
            style={{marginTop: '10px'}}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default QRScanner;