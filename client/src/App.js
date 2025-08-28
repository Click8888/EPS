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
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 секунды между попытками

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
  const [retryCounts, setRetryCounts] = useState({}); // Счетчики повторных попыток для каждого графика
  const [lastUpdateTimestamps, setLastUpdateTimestamps] = useState({});

  
const normalizeId = (id) => {
    if (id === null || id === undefined || id === '') return null;
    return typeof id === 'string' ? parseInt(id, 10) : id;
  };

  // Функция для получения только новых данных
  const fetchNewData = useCallback(async (chartId = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/getparams`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const allData = transformData(data.databases);
      
      // Если есть lastUpdateTime для этого графика, фильтруем новые данные
      const normalizedChartId = normalizeId(chartId);
      const lastTimestamp = normalizedChartId ? lastUpdateTimestamps[normalizedChartId] : null;
      
      let newData;
      if (lastTimestamp) {
        newData = allData.filter(item => item.timestamp > lastTimestamp);
      } else {
        newData = allData;
      }
      
      // Обновляем временную метку для следующего запроса
      if (newData.length > 0) {
        const latestTimestamp = Math.max(...newData.map(item => item.timestamp));
        
        if (normalizedChartId) {
          setLastUpdateTimestamps(prev => ({
            ...prev,
            [normalizedChartId]: latestTimestamp
          }));
        } else {
          // Для общего обновления обновляем все временные метки
          const newTimestamps = {};
          charts.forEach(chart => {
            newTimestamps[chart.id] = latestTimestamp;
          });
          setLastUpdateTimestamps(prev => ({ ...prev, ...newTimestamps }));
        }
      }
      
      return newData;
    } catch (error) {
      console.error("Ошибка при загрузке данных:", error);
      throw error;
    }
  }, [lastUpdateTimestamps, charts]);

  // Загрузка начальных данных
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const data = await fetchNewData();
        setMeasurements(data);
      } catch (error) {
        console.error("Ошибка при загрузке начальных данных:", error);
      }
    };

    loadInitialData();
  }, []);

  // Callback для обновления данных графика
  const handleChartDataUpdate = useCallback(async (chartId = null) => {
    try {
      const newData = await fetchNewData(chartId);
      
      if (chartId) {
        const normalizedChartId = normalizeId(chartId);
        setCharts(prev => prev.map(chart => 
          chart.id === normalizedChartId 
            ? { ...chart, data: [...chart.data, ...newData] }
            : chart
        ));
        return newData;
      } else {
        setMeasurements(prev => [...prev, ...newData]);
        setCharts(prev => prev.map(chart => ({
          ...chart,
          data: [...chart.data, ...newData]
        })));
        return newData;
      }
    } catch (error) {
      console.error("Ошибка при обновлении данных графика:", error);
      return [];
    }
  }, [fetchNewData]);

  // Обработчик SQL запросов
  const handleExecuteQuery = useCallback(async (query, chartId = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/execute-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Sql: query })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data.databases) {
        const transformedData = transformData(data.databases);
        const normalizedChartId = normalizeId(chartId);
        
        if (normalizedChartId) {
          setCharts(prev => prev.map(chart => 
            chart.id === normalizedChartId 
              ? { ...chart, data: transformedData }
              : chart
          ));
          // Сбрасываем временную метку после SQL запроса
          setLastUpdateTimestamps(prev => ({
            ...prev,
            [normalizedChartId]: null
          }));
        } else {
          setMeasurements(transformedData);
          setCharts(prev => prev.map(chart => ({
            ...chart,
            data: transformedData
          })));
          // Сбрасываем все временные метки
          setLastUpdateTimestamps({});
        }
      }
    } catch (error) {
      console.error("Ошибка при выполнении запроса:", error);
      throw error;
    }
  }, []);

  // Добавление нового графика
  const addChartWithType = useCallback(() => {
    const newChart = {
      id: Date.now(),
      data: [...measurements],
      type: selectedChartType,
      orderIndex: charts.length + 1
    };
    setCharts(prev => [...prev, newChart]);
    setShowModal(false);
  }, [measurements, selectedChartType, charts.length]);

  const openModal = useCallback(() => {
    if (charts.length >= MAX_CHARTS) {
      console.log("Достигнуто максимальное количество графиков!");
      return;
    }
    if (measurements.length > 0) {
      setShowModal(true);
    }
  }, [charts.length, measurements.length]);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const removeChart = useCallback((chartId) => {
    const normalizedId = normalizeId(chartId);
    setCharts(prev => {
      const filteredCharts = prev.filter(chart => chart.id !== normalizedId);
      // Обновляем порядковые номера после удаления
      return filteredCharts.map((chart, index) => ({
        ...chart,
        orderIndex: index + 1
      }));
    });
    if (normalizeId(selectedChartId) === normalizedId) {
      setSelectedChartId(null);
    }
  }, [selectedChartId]);

  // Drag & Drop функции
  const handleDragStart = useCallback((e, chartId) => {
    e.dataTransfer.setData('text/plain', chartId.toString());
    e.target.classList.add('dragging');
  }, []);

  const handleDragEnd = useCallback((e) => {
    e.target.classList.remove('dragging');
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
          // Меняем местами элементы
          [newCharts[draggedIndex], newCharts[targetIndex]] = 
          [newCharts[targetIndex], newCharts[draggedIndex]];
          
          // Обновляем порядковые номера после перестановки
          newCharts.forEach((chart, index) => {
            chart.orderIndex = index + 1;
          });
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
          onDataUpdate={handleChartDataUpdate} 
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