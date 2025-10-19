# Lab Remote Tracking System

A comprehensive web-based solution for tracking laboratory access and equipment usage in real-time using QR code technology.

## Features

- **Person Registration** - Register lab users with automatic QR code generation
- **QR Code Scanning** - Webcam-based scanning with audio and visual feedback
- **Real-time Tracking** - Automatic entry and exit time logging
- **Local Storage** - User data saved locally on devices
- **Live Dashboard** - Current lab status and historical records
- **ID-based Access** - Manual entry using person IDs only
- **Mobile Friendly** - Responsive design for all devices

## Tech Stack

- **Frontend**: React, HTML5, CSS3, JavaScript
- **Backend**: Python Flask, SQLite
- **Libraries**: jsQR, QRCode, Axios
- **Features**: Webcam API, Local Storage, Real-time Updates

## Project Structure

lab-remote-tracking-system/
├── backend/
│   ├── app.py
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   └── package.json
├── .gitignore
└── README.md



API Endpoints
POST /api/register - Register new person
POST /api/scan - Process QR code scans
GET /api/records - Get all access records
GET /api/current_lab_status - Get current lab occupancy
GET /api/person/{id} - Get person details by ID


Usage
Register Users: Go to Dashboard tab and register lab personnel
Generate QR Codes: System automatically creates scannable QR codes
Track Access: Use QR Scanner tab to scan codes for entry/exit
View Records: Check Records tab for complete access history



## Installation & Setup
### Backend Setup/frontend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py 


(frontend)
cd frontend
npm install
npm start


