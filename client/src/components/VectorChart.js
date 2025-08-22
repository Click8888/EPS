// components/VectorChart.js
import React from 'react';

const VectorChart = ({ data }) => {
  return (
    <div style={{ 
      width: '100%', 
      height: '300px', 
      backgroundColor: '#2c2c2c',
      border: '1px solid #444',
      borderRadius: '5px',
      padding: '10px',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h5>Векторная диаграмма</h5>
      <p>Данные: {data.length} точек</p>
    </div>
  );
};

export default VectorChart;