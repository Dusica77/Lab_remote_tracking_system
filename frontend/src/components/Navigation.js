import React from 'react';

const Navigation = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="navigation">
      <div className="container">
        <ul className="nav-tabs">
          <li className="nav-tab">
            <button
              className={activeTab === 'dashboard' ? 'active' : ''}
              onClick={() => setActiveTab('dashboard')}
            >
              <i className="fas fa-tachometer-alt"></i>
              Dashboard
            </button>
          </li>
          <li className="nav-tab">
            <button
              className={activeTab === 'scanner' ? 'active' : ''}
              onClick={() => setActiveTab('scanner')}
            >
              <i className="fas fa-qrcode"></i>
              QR Scanner
            </button>
          </li>
          <li className="nav-tab">
            <button
              className={activeTab === 'records' ? 'active' : ''}
              onClick={() => setActiveTab('records')}
            >
              <i className="fas fa-history"></i>
              Records
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;