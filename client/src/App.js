import React, { useState, useEffect } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Navbar from './components/Navbar';
import Chart from './components/Chart';

// Компонент области для графиков
// Компонент области для графиков
const ChartsContainer = ({ children, charts, onDragStart, onDragEnd, onDragOver, onDrop, draggedChart, onRemoveChart, measurements }) => {
  return (
    <div className="charts-main-container">
      {charts.length === 0 ? (
        <div className="charts-empty-state">
          <div className="text-center text-white">
            <i className="bi bi-bar-chart-fill display-4 mb-3"></i>
            <h4>Нет добавленных графиков</h4>
            <p className="text-muted">Нажмите на кнопку ниже, чтобы добавить первый график</p>
          </div>
        </div>
      ) : (
        <div className="charts-grid">
          {charts.map((chart, index) => (
            <div 
              key={chart.id}
              className="chart-item"
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, chart.id)}
              style={{
                opacity: draggedChart === chart.id ? 0.5 : 1
              }}
            >
              <div className="chart-wrapper">
                <div className="chart-header">
                  <span 
                    className="chart-title draggable-handle"
                    draggable
                    onDragStart={(e) => onDragStart(e, chart.id)}
                    onDragEnd={onDragEnd}
                  >
                    <i className="bi bi-grip-horizontal me-2"></i>
                    График #{index + 1} - {chart.type === 'linear' ? 'Линейный' : 'Векторный'}
                  </span>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => onRemoveChart(chart.id)}
                    title="Удалить график"
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
                
                <div className="chart-content">
                  <Chart 
                    key={chart.id}
                    data={measurements} 
                    type={chart.type}
                    colors={{
                      backgroundColor: '#2a2a2a',
                      textColor: 'white',
                      lineColor: chart.type === 'linear' ? '#2962FF' : '#FF6B6B'
                    }}
                  />
                </div>
                
                <div className="chart-footer">
                  <small className="text-muted">
                    {chart.data.length} точек данных • 
                    {chart.type === 'linear' ? ' Временной ряд' : ' Векторная диаграмма'}
                  </small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
function transformData(inputJson) {
    return inputJson.map(item => ({
        time: item.Measurement_time,
        value: item.Current_value
    }));
}

function App() {
  const [charts, setCharts] = useState([]);
  const [measurements, setMeasurements] = useState([]);

  const maxCharts = 6;

  const [draggedChart, setDraggedChart] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState('linear');


  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/getparams');

        const data = await response.json();


        setMeasurements(transformData(data.databases));

        


      } catch (error) {
        console.error("Ошибка загрузки:", error);
        alert("Ошибка при загрузке данных");
      }
    };

    fetchData();
  }, []);

  
  const openModal = () => {
    if (charts.length >= maxCharts) {
      console.log("Достигнуто максимальное количество графиков!");
      return;
    }
    if (measurements.length > 0) {
      setShowModal(true);
    }
  };

  const addChartWithType = () => {
    const newChart = {
      id: Date.now(),
      data: [...measurements], // Создаем копию данных
      type: selectedChartType
    };
    setCharts(prev => [...prev, newChart]);
    setShowModal(false);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleDragStart = (e, chartId) => {
  // Разрешаем перетаскивание только для элементов с классом draggable-handle
  if (!e.target.classList.contains('draggable-handle') && 
      !e.target.closest('.draggable-handle')) {
    e.preventDefault();
    return;
  }
  
  e.dataTransfer.setData('text/plain', chartId.toString());
  setDraggedChart(chartId);
  e.target.style.opacity = '0.5';
};

const handleDragEnd = (e) => {
  if (e.target.classList.contains('draggable-handle') || 
      e.target.closest('.draggable-handle')) {
    e.target.style.opacity = '1';
    setDraggedChart(null);
  }
};

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetChartId) => {
    e.preventDefault();
    const draggedChartId = e.dataTransfer.getData('text/plain');
    
    if (draggedChartId && draggedChartId !== targetChartId) {
      setCharts(prev => {
        const newCharts = [...prev];
        const draggedIndex = newCharts.findIndex(chart => chart.id.toString() === draggedChartId);
        const targetIndex = newCharts.findIndex(chart => chart.id.toString() === targetChartId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
          [newCharts[draggedIndex], newCharts[targetIndex]] = 
          [newCharts[targetIndex], newCharts[draggedIndex]];
        }
        
        return newCharts;
      });
    }
  };

  const removeChart = (chartId) => {
    setCharts(prev => prev.filter(chart => chart.id !== chartId));
  };
  console.log(measurements);
  return (
    <div className='erd-container d-flex flex-column vh-100' style={{  
      backgroundColor: '#474747ff',
    }}>
      <Navbar />
      
      {/* Модальное окно */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Выберите тип графика</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <div className="form-check mb-3">
                  <input 
                    className="form-check-input" 
                    type="radio" 
                    name="chartType" 
                    id="linearChart" 
                    value="linear" 
                    checked={selectedChartType === 'linear'} 
                    onChange={(e) => setSelectedChartType(e.target.value)} 
                  />
                  <label className="form-check-label" htmlFor="linearChart">
                    Линейный график
                  </label>
                </div>
                <div className="form-check">
                  <input 
                    className="form-check-input" 
                    type="radio" 
                    name="chartType" 
                    id="vectorChart" 
                    value="vector" 
                    checked={selectedChartType === 'vector'} 
                    onChange={(e) => setSelectedChartType(e.target.value)} 
                  />
                  <label className="form-check-label" htmlFor="vectorChart">
                    Векторная диаграмма
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Отмена
                </button>
                <button type="button" className="btn btn-primary" onClick={addChartWithType}>
                  Добавить график
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Основной контейнер для графиков */}
      <div className='charts-area-container flex-grow-1 mt-2'>
        <ChartsContainer
          charts={charts}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          draggedChart={draggedChart}
          onRemoveChart={removeChart}
          measurements={measurements}
        />
      </div>

      {/* Нижняя панель с кнопкой */}
      <div className="charts-bottom-panel d-flex justify-content-center">
        <button 
          onClick={openModal} 
          className='btn btn-success add-chart-btn'
          disabled={charts.length >= maxCharts || measurements.length === 0}
          title="Добавить новый график"
        >
          <i className="bi bi-plus-lg "></i>
          
        </button>
      </div>
    </div>
  );
}

export default App;