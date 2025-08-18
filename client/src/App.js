import React, { useState } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Navbar from './components/Navbar';
import Chart from './components/Chart';

const initialData = [
  { time: '2018-12-22', value: 32.51 },
  { time: '2018-12-23', value: 31.11 },
  { time: '2018-12-24', value: 27.02 },
  { time: '2018-12-25', value: 27.32 },
  { time: '2018-12-26', value: 25.17 },
  { time: '2018-12-27', value: 28.89 },
  { time: '2018-12-28', value: 25.46 },
  { time: '2018-12-29', value: 23.92 },
  { time: '2018-12-30', value: 22.68 },
  { time: '2018-12-31', value: 22.67 },
];

function App() {
  const [countData, setCountData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const maxCharts = 4;

  const ChartOpen = () => {
    if (countData.length >= maxCharts) {
      console.log("Достигнуто максимальное количество графиков!");
      return;
    }
    if (currentIndex < initialData.length) {
      setCountData(prevData => [...prevData, initialData[currentIndex]]);
      setCurrentIndex(prevIndex => prevIndex + 1);
    } else {
      console.log("Все элементы уже добавлены!");
    }
  };

  return (
    <div className='container-fluid d-flex flex-column' style={{ 
      height: '100vh', 
      width: '100%', 
      backgroundColor: '#474747ff',
      overflow: 'hidden'
    }}>
      <Navbar />
      <div className='container mt-5 flex-grow-1' style={{ overflowY: 'auto' }}>
        {countData.length < 2 && countData.length !== 0 ? (
          <div className="row justify-content-center mb-4">
            <div className="col-12">
              <Chart data={initialData} />
            </div>
          </div>
        ) : (
          <>
            {Array.from({ length: Math.ceil(countData.length / 2) }).map((_, rowIndex) => {
              const startIndex = rowIndex * 2;
              const endIndex = startIndex + 2;
              const rowCharts = countData.slice(startIndex, endIndex);
              
              return (
                <div key={rowIndex} className="row justify-content-center mb-4 mt-5">
                  {rowCharts.map((data, chartIndex) => (
                    <div key={chartIndex} className={rowCharts.length === 1 ? "col-12" : "col-md-6"}>
                      <Chart data={initialData} />
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        )}
      </div>
      <div className="rounded-5 position-relative" style={{ 
        height: '100px', 
        width: '100%', 
        maxWidth: '1000px',
        backgroundColor: '#000000ff',
        margin: '0 auto 20px'
      }}>
        <button 
          onClick={ChartOpen} 
          className='btn btn-success mb-2 position-absolute top-50 start-50 translate-middle'
          disabled={countData.length >= maxCharts}
        >
          <i className="bi bi-plus-lg"></i>
        </button>
      </div>
    </div>
  );
}

export default App;