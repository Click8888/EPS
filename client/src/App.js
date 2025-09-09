import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Navbar from './components/Navbar';
import Graph from './Graph.js';
import Main from './Main.js';

function App() {
  return(
    <div className='erd-container d-flex flex-column vh-100' style={{  
        backgroundColor: '#474747ff',
      }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/graph" element={<Graph />} />
        </Routes>
        
    </div>

    )
}
export default App;