import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  return (
    <main className="page">
      <section className="status-card" aria-labelledby="page-title">
        <div className="brand-mark" aria-hidden="true">L</div>
        <p className="eyebrow">Your training starts here</p>
        <h1 id="page-title">LiftMate</h1>
        <p className="status">
          <span className="status-dot" aria-hidden="true" />
          Frontend is running
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
