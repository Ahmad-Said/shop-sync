import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: '#1E1E28',
          color: '#F0F0F5',
          border: '1px solid #2A2A35',
          borderRadius: '12px',
          fontSize: '14px',
          fontFamily: 'DM Sans, sans-serif',
        },
        success: {
          iconTheme: { primary: '#00F5A0', secondary: '#0C0C0F' },
        },
        error: {
          iconTheme: { primary: '#FF6B6B', secondary: '#0C0C0F' },
        },
      }}
    />
  </React.StrictMode>
);
