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


function transformData(inputJson, xAxis = 'Measurement_time', yAxis = 'Current_value') {
  return inputJson.map(item => ({
    time: item[xAxis] || item.Measurement_time,
    value: item[yAxis] || item.Current_value
  }));
}

function App() {
  const [charts, setCharts] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [selectedChartId, setSelectedChartId] = useState(null);
  const [draggedChart, setDraggedChart] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState('linear');
  const [UpdateInterval, setUpdateInterval] = useState(100);
  const [showSqlPanel, setShowSqlPanel] = useState(false);
  const [updatingCharts, setUpdatingCharts] = useState(new Set());
  const [editTitleValue, setEditTitleValue] = useState('');
  // Состояние для хранения метаданных
  const [tablesMetadata, setTablesMetadata] = useState({});
  const [tableNames, setTableNames] = useState([]);
  const [columnsByTable, setColumnsByTable] = useState({});
  const normalizeId = (id) => {
    if (id === null || id === undefined || id === '') return null;
    return typeof id === 'string' ? parseInt(id, 10) : id;
  };
              //МЕТАДАННЫЕ
  const parseMetadata = useCallback((metadata) => {
  if (!metadata || !metadata.tables) return;
  
  // Извлекаем названия таблиц
  const tables = metadata.tables.map(table => table.table_name);
  setTableNames(tables);
  
  // Создаем объект с колонками по таблицам
  const columnsMap = {};
  metadata.tables.forEach(table => {
    columnsMap[table.table_name] = table.columns.map(col => col.column_name);
  });
  setColumnsByTable(columnsMap);
  
  // Сохраняем полные метаданные
  setTablesMetadata(metadata);
  
  console.log('Table names:', tables);
  console.log('Columns by table:', columnsMap);
}, []);


  // Парсинг названий таблицы, столбцов
  useEffect(() => {
  const loadNamesData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/metadata`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const metadata = await response.json();
      console.log('Raw metadata:', metadata);
      
      // Парсим и распределяем метаданные
      parseMetadata(metadata.metadata || metadata);
    } catch (error) {
      console.error("Ошибка при загрузке названий:", error);
    }
  };
  
  loadNamesData();
}, [parseMetadata]);
  
  // Загрузка начальных данных
useEffect(() => {
  const loadInitialData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/getparams`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Initial API response:', data);
      
      const transformedData = transformData(data.databases);
      console.log('Initial transformed data:', transformedData);
      
      setMeasurements(transformedData);
    } catch (error) {
      console.error("Ошибка при загрузке начальных данных:", error);
    }
  };

  loadInitialData();
}, []);

  // Функция для получения новых данных
const fetchNewData = useCallback(async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/getparams`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Raw API response:', data);
    
    const transformedData = transformData(data.databases);
    console.log('Transformed data:', transformedData);
    
    return transformedData;
  } catch (error) {
    console.error("Ошибка при загрузке данных:", error);
    return [];
  }
}, []);

  const handleChartTitleChange = useCallback((chartId, newTitle) => {
  const normalizedId = normalizeId(chartId);
  setCharts(prev => prev.map(chart => 
    chart.id === normalizedId 
      ? { ...chart, title: newTitle }
      : chart
  ));
}, []);

  // Callback для запуска/остановки обновления графика
const handleChartUpdateToggle = useCallback(async (chartId) => {
  const normalizedChartId = normalizeId(chartId);
  
  // Проверяем, обновляется ли уже этот график
  const isCurrentlyUpdating = updatingCharts.has(normalizedChartId);
  
  if (isCurrentlyUpdating) {
    // Останавливаем обновление - просто удаляем из Set
    setUpdatingCharts(prev => {
      const newSet = new Set(prev);
      newSet.delete(normalizedChartId);
      return newSet;
    });
    console.log(`Остановлено обновление графика ${normalizedChartId}`);
  } else {
    // Запускаем обновление
    setUpdatingCharts(prev => new Set(prev).add(normalizedChartId));
    console.log(`Запущено обновление графика ${normalizedChartId}`);
    
    // Сразу обновляем данные при первом запуске
    const newData = await fetchNewData();
    if (newData.length > 0) {
      setCharts(prev => prev.map(chart => 
        chart.id === normalizedChartId 
          ? { ...chart, data: newData }
          : chart
      ));
    }
  }
}, [updatingCharts, fetchNewData]);

    // Эффект для непрерывного обновления графиков
useEffect(() => {
  if (updatingCharts.size === 0) return;

  const interval = setInterval(async () => {
    const newData = await fetchNewData();
    console.log('Fetched new data:', newData);
    
    if (newData.length > 0) {
      setCharts(prev => prev.map(chart => 
        updatingCharts.has(chart.id) 
          ? { ...chart, data: newData }
          : chart
      ));
    }
  }, UpdateInterval);

  return () => clearInterval(interval);
}, [updatingCharts, fetchNewData, UpdateInterval]);


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
      const normalizedChartId = normalizeId(chartId);
      
      if (normalizedChartId) {
        // Находим график чтобы получить настройки осей
        const chart = charts.find(c => c.id === normalizedChartId);
        const transformedData = transformData(
          data.databases, 
          chart?.xAxis, 
          chart?.yAxis
        );
        
        setCharts(prev => prev.map(chart => 
          chart.id === normalizedChartId 
            ? { ...chart, data: transformedData }
            : chart
        ));
      } else {
        const transformedData = transformData(data.databases);
        setMeasurements(transformedData);
        setCharts(prev => prev.map(chart => ({
          ...chart,
          data: transformedData
        })));
      }
    }
  } catch (error) {
    console.error("Ошибка при выполнении запроса:", error);
    throw error;
  }
}, [charts]);

  // Добавление нового графика
  const addChartWithType = useCallback(() => {
  const newChart = {
    id: Date.now(),
    data: [...measurements],
    type: selectedChartType,
    orderIndex: charts.length + 1,
    title: `График #${charts.length + 1}`,
    selectedTable: '',
    xAxis: '',
    yAxis: '',
    color: '#133592',
    refreshInterval: 1000,
    showGrid: true
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

  const resetChartSettings = useCallback((chartId) => {
  const normalizedId = normalizeId(chartId);
  
  // Сбрасываем настройки графика к значениям по умолчанию
  setCharts(prev => prev.map(chart => 
    chart.id === normalizedId 
      ? {
          ...chart,
          selectedTable: '',
          xAxis: '',
          yAxis: '',
          color: '#133592',
          refreshInterval: 1000,
          showGrid: true,
          data: [] // Сбрасываем данные к общим измерениям
        }
      : chart
  ));
}, [measurements]);

// Затем обновите removeChart
const removeChart = useCallback((chartId) => {
  const normalizedId = normalizeId(chartId);
  
  // Сначала сбрасываем настройки
  resetChartSettings(normalizedId);
  
  // Останавливаем обновление при удалении
  setUpdatingCharts(prev => {
    const newSet = new Set(prev);
    newSet.delete(normalizedId);
    return newSet;
  });
  
  setCharts(prev => {
    const filteredCharts = prev.filter(chart => chart.id !== normalizedId);
    return filteredCharts.map((chart, index) => ({
      ...chart,
      orderIndex: index + 1
    }));
  });
  
  if (normalizeId(selectedChartId) === normalizedId) {
    setSelectedChartId(null);
  }
}, [selectedChartId, resetChartSettings]);


  // Drag & Drop функции
  const handleDragStart = useCallback((e, chartId) => {
    e.dataTransfer.setData('text/plain', chartId.toString());
    setDraggedChart(chartId);
    e.target.classList.add('dragging');
  }, []);

  const handleDragEnd = useCallback((e) => {
    setDraggedChart(null);
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
          [newCharts[draggedIndex], newCharts[targetIndex]] = 
          [newCharts[targetIndex], newCharts[draggedIndex]];
          
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
          onUpdateToggle={handleChartUpdateToggle}
          updatingCharts={updatingCharts}
          onChartTitleChange={handleChartTitleChange}
          editTitleValue={editTitleValue}
          setEditTitleValue={setEditTitleValue}
        />
      </div>

      <SqlPanel
        show={showSqlPanel}
        onClose={() => setShowSqlPanel(false)}
        onExecuteQuery={handleExecuteQuery}
        charts={charts}
        selectedChartId={selectedChartId}
        onSelectChart={(id) => setSelectedChartId(normalizeId(id))}
        onUpdateToggle={handleChartUpdateToggle} 
        updatingCharts={updatingCharts} 
        onRemoveChart={removeChart} 
        editTitleValue={editTitleValue}
        tableNames={tableNames}
        columnsByTable={columnsByTable}
        setCharts={setCharts}
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
          <i className="bi bi-sliders"></i>
        </button>
      </div>
    </div>
  );
}

export default App;