import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';  // The main App component

// Render the React app into the root div
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')  // This element is in your public/index.html
);
