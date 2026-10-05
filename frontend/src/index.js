

import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';
//https://educationsujets.onrender.com
// REACT_APP_API_URL permet de viser un backend local (ex. http://localhost:5000) ; production par défaut.//https://educationsujets.onrender.com
axios.defaults.baseURL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
axios.defaults.headers.common.Accept = 'application/json';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
