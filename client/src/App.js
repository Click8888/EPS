import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Navbar from './components/Navbar';
import ChartsContainer from './components/ChartsContainer';
import SqlPanel from './components/SqlPanel';
import ChartTypeModal from './components/ChartTypeModal';

// Константы
const MAX_CHARTS = 6;
const API_BASE_URL = 'http://localhost:8080/api';

function transformData(inputJson) {
  return inputJson.map(item => ({
    time: item.Measurement_time,
    value: item.Current_value
  }));
}

function App() {
  const [charts, setCharts] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [selectedChartId, setSelectedChartId] = useState(null);
  const [draggedChart, setDraggedChart] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState('linear');
  const [showSqlPanel, setShowSqlPanel] = useState(false);

  // Добавьте эту функцию в начало App.js
const normalizeId = (id) => {
  if (id === null || id === undefined || id === '') return null;
  return typeof id === 'string' ? parseInt(id, 10) : id;
};

  // Загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/getparams`);
        const data = await response.json();
        const transformedData = transformData(data.databases);
        setMeasurements(transformedData);
      } catch (error) {
        console.error("Ошибка загрузки:", error);
        alert("Ошибка при загрузке данных");
      }
    };

    fetchData();
  }, []);

  // Обработчик SQL запросов
  const handleExecuteQuery = useCallback(async (query, chartId = null) => {
  console.log("Выполняем SQL запрос:", query, "для графика:", chartId);
  
  try {
    const response = await fetch(`${API_BASE_URL}/execute-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ Sql: query })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.databases) {
      const transformedData = transformData(data.databases);
      
      // Нормализуем ID для сравнения
      const normalizedChartId = normalizeId(chartId);
      
      if (normalizedChartId) {
        // Обновляем данные только для выбранного графика
        setCharts(prev => prev.map(chart => 
          chart.id === normalizedChartId 
            ? { ...chart, data: transformedData }
            : chart
        ));
        const chartIndex = charts.findIndex(c => c.id === normalizedChartId);
        alert(`Запрос выполнен успешно! Обновлен график #${chartIndex + 1}`);
      } else {
        // Обновляем данные для всех графиков
        setMeasurements(transformedData);
        setCharts(prev => prev.map(chart => ({
          ...chart,
          data: transformedData
        })));
        alert(`Запрос выполнен успешно! Обновлены все графики (${transformedData.length} записей)`);
      }
    } else {
      alert('Запрос выполнен, но данные не получены в ожидаемом формате');
    }

  } catch (error) {
    console.error("Ошибка при выполнении запроса:", error);
    alert(`Ошибка выполнения запроса: ${error.message}`);
    throw error;
  }
}, [charts]);

  // Управление графиками
  const openModal = useCallback(() => {
    if (charts.length >= MAX_CHARTS) {
      console.log("Достигнуто максимальное количество графиков!");
      return;
    }
    if (measurements.length > 0) {
      setShowModal(true);
    }
  }, [charts.length, measurements.length]);

  const addChartWithType = useCallback(() => {
    const newChart = {
      id: Date.now(),
      data: [...measurements],
      type: selectedChartType
    };
    setCharts(prev => [...prev, newChart]);
    setShowModal(false);
  }, [measurements, selectedChartType]);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const removeChart = useCallback((chartId) => {
  const normalizedId = normalizeId(chartId);
  setCharts(prev => prev.filter(chart => chart.id !== normalizedId));
  if (normalizeId(selectedChartId) === normalizedId) {
    setSelectedChartId(null);
  }
}, [selectedChartId]);

  // Drag & Drop функции
  const handleDragStart = useCallback((e, chartId) => {
    if (!e.target.classList.contains('draggable-handle') && 
        !e.target.closest('.draggable-handle')) {
      e.preventDefault();
      return;
    }
    
    e.dataTransfer.setData('text/plain', chartId.toString());
    setDraggedChart(chartId);
    e.target.style.opacity = '0.5';
  }, []);

  const handleDragEnd = useCallback((e) => {
    if (e.target.classList.contains('draggable-handle') || 
        e.target.closest('.draggable-handle')) {
      e.target.style.opacity = '1';
      setDraggedChart(null);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, targetChartId) => {
  e.preventDefault();
  const draggedChartId = e.dataTransfer.getData('text/plain');
  const normalizedDraggedId = normalizeId(draggedChartId);
  const normalizedTargetId = normalizeId(targetChartId);
  
  if (normalizedDraggedId && normalizedDraggedId !== normalizedTargetId) {
    setCharts(prev => {
      const newCharts = [...prev];
      const draggedIndex = newCharts.findIndex(chart => chart.id === normalizedDraggedId);
      const targetIndex = newCharts.findIndex(chart => chart.id === normalizedTargetId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        [newCharts[draggedIndex], newCharts[targetIndex]] = 
        [newCharts[targetIndex], newCharts[draggedIndex]];
      }
      
      return newCharts;
    });
  }
}, []);

  return (
    <div className='erd-container d-flex flex-column vh-100' style={{  
      backgroundColor: '#474747ff',
    }}>
      <Navbar />
      
      <ChartTypeModal
        show={showModal}
        onClose={closeModal}
        selectedChartType={selectedChartType}
        onChartTypeChange={setSelectedChartType}
        onAddChart={addChartWithType}
      />

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

      <SqlPanel
        show={showSqlPanel}
        onClose={() => setShowSqlPanel(false)}
        onExecuteQuery={handleExecuteQuery}
        charts={charts}
        selectedChartId={selectedChartId}
        onSelectChart={(id) => setSelectedChartId(normalizeId(id))}
      />

      <div className="charts-bottom-panel d-flex justify-content-center gap-2 p-2">
        <button 
          onClick={openModal} 
          className='btn btn-success add-chart-btn'
          disabled={charts.length >= MAX_CHARTS || measurements.length === 0}
          title="Добавить новый график"
        >
          <i className="bi bi-plus-lg"></i>
        </button>
        
        <button 
          onClick={() => setShowSqlPanel(!showSqlPanel)}
          className={`btn sql-btn ${showSqlPanel ? 'btn-warning' : 'btn-primary'}`}
          title={showSqlPanel ? "Закрыть SQL редактор" : "Открыть SQL редактор"}
        >
          <i className="bi bi-database me-1"></i>
          SQL
        </button>
      </div>
    </div>
  );
}

export default App;