

import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';
//'http://localhost:5000/api';
axios.defaults.baseURL = "http://localhost:5000" // (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
axios.defaults.headers.common.Accept = 'application/json';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
