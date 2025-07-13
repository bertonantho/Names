import React from 'react';

function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '1rem',
        }}
      >
        Baby Names Explorer
      </h1>
      <p
        style={{
          fontSize: '1.125rem',
          color: '#6b7280',
        }}
      >
        React is working! 🎉
      </p>
    </div>
  );
}

export default App;
