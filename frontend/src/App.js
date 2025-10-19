import React, { useState } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import QRScanner from './components/QRScanner';
import Records from './components/Records';
import Navigation from './components/Navigation';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'scanner': return <QRScanner />;
      case 'records': return <Records />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="container">
          <h1><i className="fas fa-flask"></i> Lab Remote Tracking System</h1>
        </div>
      </header>
      
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">
        <div className="container">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;