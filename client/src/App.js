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
  let transformedData = inputJson.map(item => ({
    time: item[xAxis] || item.Measurement_time,
    value: item[yAxis] || item.Current_value
  }));
  
  // Ограничиваем количество точек до 1500
  if (transformedData.length > 1500) {
    transformedData = transformedData.slice(-1500);
  }
  
  return transformedData;
}

function App() {
  const [charts, setCharts] = useState([]);
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
  const [chartSeries, setChartSeries] = useState({});

const addSeriesToChart = (chartId, seriesConfig) => {
  const normalizedId = normalizeId(chartId);
  console.log('Adding series to chart:', normalizedId, seriesConfig);
  
  const newSeries = {
    ...seriesConfig,
    id: Date.now() + Math.random() // Уникальный ID
  };

  setChartSeries(prev => {
    const currentSeries = prev[normalizedId] || [];
    const newState = {
      ...prev,
      [normalizedId]: [...currentSeries, newSeries]
    };
    console.log('New chartSeries state:', newState);
    return newState;
  });
};

const removeSeriesFromChart = (chartId, seriesId) => {
  const normalizedId = normalizeId(chartId);
  console.log('Removing series:', normalizedId, seriesId);
  
  setChartSeries(prev => {
    const currentSeries = prev[normalizedId] || [];
    const filteredSeries = currentSeries.filter(s => s.id !== seriesId);
    
    if (filteredSeries.length === 0) {
      const newState = { ...prev };
      delete newState[normalizedId];
      console.log('After removal (empty):', newState);
      return newState;
    }
    
    const newState = {
      ...prev,
      [normalizedId]: filteredSeries
    };
    console.log('After removal:', newState);
    return newState;
  });
};

const updateSeriesInChart = (chartId, seriesId, updates) => {
  const normalizedId = normalizeId(chartId);
  console.log('Updating series:', normalizedId, seriesId, updates);
  
  setChartSeries(prev => {
    const currentSeries = prev[normalizedId] || [];
    const updatedSeries = currentSeries.map(s =>
      s.id === seriesId ? { ...s, ...updates } : s
    );
    
    const newState = {
      ...prev,
      [normalizedId]: updatedSeries
    };
    console.log('After update:', newState);
    return newState;
  });
};


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

  // В App.js, обновите handleChartUpdateToggle
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

  const intervals = {};

  // Создаем отдельные интервалы для каждого графика с его собственным интервалом
  charts.forEach(chart => {
    if (updatingCharts.has(chart.id)) {
      const interval = chart.refreshInterval || 100; // Используем интервал из настроек графика
      
      if (!intervals[interval]) {
        intervals[interval] = setInterval(async () => {
          const newData = await fetchNewData();
          console.log('Fetched new data:', newData);
          
          if (newData.length > 0) {
            setCharts(prev => prev.map(c => 
              updatingCharts.has(c.id) && c.refreshInterval === interval
                ? { ...c, data: newData }
                : c
            ));
          }
        }, interval);
      }
    }
  });

  return () => {
    // Очищаем все интервалы
    Object.values(intervals).forEach(intervalId => clearInterval(intervalId));
  };
}, [updatingCharts, fetchNewData, charts]);

  // Эффект для непрерывного обновления графиков
  useEffect(() => {
    if (updatingCharts.size === 0) return;

    const interval = setInterval(async () => {
      const newData = await fetchNewData();
      console.log('Fetched new data:', newData);
      
      if (newData.length > 0) {
        setCharts(prev => prev.map(chart => {
          if (updatingCharts.has(chart.id)) {
            // Объединяем старые и новые данные, ограничивая до 1500 точек
            const currentData = chart.data || [];
            const combinedData = [...currentData, ...newData];
            
            let limitedData = combinedData;
            if (combinedData.length > 1500) {
              limitedData = combinedData.slice(-1500); // Берем последние 1500 точек
            }
            
            return { ...chart, data: limitedData };
          }
          return chart;
        }));
      }
    }, UpdateInterval);

    return () => clearInterval(interval);
  }, [updatingCharts, fetchNewData, UpdateInterval]);

  // Обработчик SQL запросов
const handleExecuteQuery = useCallback(async (query, chartId = null, seriesId = null) => {
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
        const chart = charts.find(c => c.id === normalizedChartId);
        let transformedData = transformData(
          data.databases, 
          chart?.xAxis, 
          chart?.yAxis
        );
        
        if (transformedData.length > 1500) {
          transformedData = transformedData.slice(-1500);
        }
        
        if (seriesId) {
          // Обновляем данные конкретной серии
          console.log('Updating series data:', seriesId, transformedData.length, 'points');
          updateSeriesInChart(normalizedChartId, seriesId, { data: transformedData });
        } else {
          // Обновляем основные данные графика
          console.log('Updating main chart data:', transformedData.length, 'points');
          setCharts(prev => prev.map(chart => 
            chart.id === normalizedChartId 
              ? { ...chart, data: transformedData }
              : chart
          ));
        }
      }
    }
  } catch (error) {
    console.error("Ошибка при выполнении запроса:", error);
    throw error;
  }
}, [charts, updateSeriesInChart, setCharts]);
  // Добавление нового графика
  const addChartWithType = useCallback(() => {
    const newChart = {
      id: Date.now(),
      data: [], // Пустой массив вместо measurements
      type: selectedChartType,
      orderIndex: charts.length + 1,
      title: `График #${charts.length + 1}`,
      selectedTable: '',
      xAxis: '',
      yAxis: '',
      color: '#133592',
      refreshInterval: 100,
      showGrid: true
    };
    setCharts(prev => [...prev, newChart]);
    setShowModal(false);
  }, [selectedChartType, charts.length]);

  const openModal = useCallback(() => {
    if (charts.length >= MAX_CHARTS) {
      console.log("Достигнуто максимальное количество графиков!");
      return;
    }
    setShowModal(true);
  }, [charts.length]);

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
            data: [] // Пустой массив данных
          }
        : chart
    ));
  }, []);

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
          onUpdateToggle={handleChartUpdateToggle}
          updatingCharts={updatingCharts}
          onChartTitleChange={handleChartTitleChange}
          editTitleValue={editTitleValue}
          setEditTitleValue={setEditTitleValue}
          chartSeries={chartSeries}
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
        chartSeries={chartSeries}
        onAddSeries={addSeriesToChart}
        onRemoveSeries={removeSeriesFromChart}
        onUpdateSeries={updateSeriesInChart}
      />
      
      <div className="charts-bottom-panel d-flex justify-content-center gap-2 p-2">
        <button 
          onClick={openModal} 
          className='btn btn-success add-chart-btn'
          disabled={charts.length >= MAX_CHARTS}
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