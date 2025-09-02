import React, { useState, useEffect, useCallback } from 'react';
import '../App.css';

// Helper function
const normalizeId = (id) => {
  if (id === null || id === undefined || id === '') return null;
  return typeof id === 'string' ? parseInt(id, 10) : id;
};

// Компонент для отображения ошибок с возможностью закрытия
const ErrorAlert = ({ error, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsVisible(true);
  }, [error]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  if (!error || !isVisible) return null;

  return (
    <div className="sql-panel-error alert alert-danger m-0 alert-dismissible fade show">
      <i className="bi bi-exclamation-triangle me-2"></i>
      {error}
      <button
        type="button"
        className="btn-close btn-close-white"
        onClick={handleClose}
        aria-label="Close"
      ></button>
    </div>
  );
};

// Компонент для настройки параметров графика
const ChartSettings = ({ 
  chart, 
  charts, 
  onExecute, 
  onSave, 
  onDelete, 
  editTitleValue,
  tableNames,
  columnsByTable
}) => {
  // Получаем доступные колонки для выбранной таблицы
  const availableColumns = chart.selectedTable ? 
    columnsByTable[chart.selectedTable] || [] : [];

  const handleSave = () => {
    if (!chart.name?.trim()) {
      alert('Название графика обязательно');
      return;
    }

    onSave(chart);
    alert('Настройки сохранены!');
  };

  const handleTableChange = (tableName) => {
    const updatedChart = {
      ...chart,
      selectedTable: tableName,
      // Не сбрасываем оси, если они могут существовать в новой таблице
      xAxis: chart.xAxis && columnsByTable[tableName]?.includes(chart.xAxis) ? chart.xAxis : '',
      yAxis: chart.yAxis && columnsByTable[tableName]?.includes(chart.yAxis) ? chart.yAxis : ''
    };
    onSave(updatedChart);
  };

  const handleFieldChange = (field, value) => {
    const updatedChart = {
      ...chart,
      [field]: value
    };
    onSave(updatedChart);
  };

  const generateQuery = () => {
    if (!chart.selectedTable || !chart.xAxis || !chart.yAxis) {
      alert('Выберите таблицу и обе оси для генерации запроса');
      return;
    }

    return `SELECT ${chart.xAxis}, ${chart.yAxis} FROM ${chart.selectedTable}`;
  };

  const handleExecuteQuery = () => {
    const query = generateQuery();
    if (query) {
      onExecute(query, chart.id);
    }
  };

  return (
    <div className="chart-settings-item p-3 mb-3 rounded bg-dark" style={{ border: '1px solid #444' }}>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <input
          type="text"
          className="form-control form-control-sm bg-secondary text-white border-dark me-2"
          value={chart.name || `График ${charts.findIndex(c => c.id === chart.id) + 1}`}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          placeholder="Название графика"
          style={{ maxWidth: '200px' }}
        />
        <div className="btn-group btn-group-sm">
          <button
            className="btn btn-outline-success"
            onClick={handleSave}
            title="Сохранить настройки"
          >
            <i className="bi bi-check-lg"></i>
          </button>
          <button
            className="btn btn-outline-primary"
            onClick={handleExecuteQuery}
            title="Выполнить запрос"
            disabled={!chart.selectedTable || !chart.xAxis || !chart.yAxis}
          >
            <i className="bi bi-play-fill"></i>
          </button>
          <button
            className="btn btn-outline-danger"
            onClick={() => onDelete(chart.id)}
            title="Удалить график"
          >
            <i className="bi bi-trash"></i>
          </button>
        </div>
      </div>
      
      <div className="row">
        <div className="col-md-6">
          <div className='text-center text-white mb-2'>
            <h6>Данные</h6>
          </div>
          
          {/* Выбор таблицы */}
          <div className="mb-2">
            <label className="form-label small text-white">Таблица</label>
            <select
              className="form-select form-select-sm bg-secondary text-light border-dark"
              value={chart.selectedTable || ''}
              onChange={(e) => handleTableChange(e.target.value)}
            >
              <option value="">Выберите таблицу</option>
              {tableNames.map(tableName => (
                <option key={tableName} value={tableName}>
                  {tableName}
                </option>
              ))}
            </select>
          </div>

          {/* Ось X */}
          <div className="mb-2">
            <label className="form-label small text-white">Ось X</label>
            <select
              className="form-select form-select-sm bg-secondary text-light border-dark"
              value={chart.xAxis || ''}
              onChange={(e) => handleFieldChange('xAxis', e.target.value)}
              disabled={!chart.selectedTable}
            >
              <option value="">Выберите столбец</option>
              {availableColumns.map(column => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </div>

          {/* Ось Y */}
          <div className="mb-2">
            <label className="form-label small text-white">Ось Y</label>
            <select
              className="form-select form-select-sm bg-secondary text-light border-dark"
              value={chart.yAxis || ''}
              onChange={(e) => handleFieldChange('yAxis', e.target.value)}
              disabled={!chart.selectedTable}
            >
              <option value="">Выберите столбец</option>
              {availableColumns.map(column => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="col-md-6">
          <div className='text-center text-white mb-2'>
            <h6>Внешний вид</h6>
          </div>
          
          {/* Тип графика */}
          <div className="mb-2">
            <label className="form-label small text-white">Тип графика</label>
            <select
              className="form-select form-select-sm bg-secondary text-light border-dark"
              value={chart.type || 'linear'}
              onChange={(e) => handleFieldChange('type', e.target.value)}
            >
              <option value="linear">Линейный</option>
              <option value="bar">Столбчатый</option>
              <option value="pie">Круговая</option>
              <option value="scatter">Точечная</option>
            </select>
          </div>

          <div className="mb-2">
            <label className="form-label small text-white">Интервал обновления (мс)</label>
            <input
              type="number"
              className="form-control form-control-sm bg-secondary text-light border-dark"
              value={chart.refreshInterval || 1000}
              onChange={(e) => handleFieldChange('refreshInterval', parseInt(e.target.value))}
              min="100"
              max="10000"
            />
          </div>
          
          <div className="mb-2">
            <label className="form-label small text-white">Цвет графика</label>
            <div className="d-flex align-items-center">
              <input
                type="color"
                className="form-control form-control-color form-control-sm bg-secondary border-dark me-2"
                value={chart.color || '#133592ff'}
                onChange={(e) => handleFieldChange('color', e.target.value)}
                style={{ width: '40px', height: '30px' }}
              />
              <span className="small text-muted">{chart.color || '#133592ff'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Сгенерированный SQL запрос */}
      {chart.selectedTable && chart.xAxis && chart.yAxis && (
        <div className="mt-3 p-2 bg-secondary rounded">
          <small className="text-white">SQL запрос:</small>
          <code className="d-block text-info small mt-1">
            SELECT {chart.xAxis}, {chart.yAxis} FROM {chart.selectedTable}
          </code>
        </div>
      )}
    </div>
  );
};

const SqlPanel = ({ 
  show, 
  onClose, 
  onExecuteQuery, 
  charts, 
  selectedChartId, 
  onSelectChart, 
  onUpdateToggle, 
  updatingCharts, 
  onRemoveChart, 
  editTitleValue,
  tableNames,
  columnsByTable,
  setCharts
}) => {

  const [queryHistory, setQueryHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState(null);

  useEffect(() => {
    if (show) {
      // Инициализация при открытии панели
    }
  }, [show]);

  const handleCloseError = useCallback(() => {
    setLastError(null);
  }, []);

  const handleExecute = useCallback(async (query, chartId = null) => {
    if (!query) return;
    
    setIsLoading(true);
    setLastError(null);

    try {
      const normalizedChartId = normalizeId(chartId);
      await onExecuteQuery(query, normalizedChartId);
      
      setQueryHistory(prev => [{
        query: query,
        name: `Запрос для графика ${charts.findIndex(c => c.id === chartId) + 1}`,
        timestamp: new Date().toLocaleTimeString(),
        success: true,
        chartId: normalizedChartId
      }, ...prev.slice(0, 9)]);
      
    } catch (error) {
      setLastError(error.message);
      setQueryHistory(prev => [{
        query: query,
        name: `Запрос для графика ${charts.findIndex(c => c.id === chartId) + 1}`,
        timestamp: new Date().toLocaleTimeString(),
        success: false,
        error: error.message,
        chartId: normalizeId(chartId)
      }, ...prev.slice(0, 9)]);
    } finally {
      setIsLoading(false);
    }
  }, [charts, onExecuteQuery]);

  const handleHistoryClick = useCallback((historyItem) => {
    if (historyItem.chartId) {
      onSelectChart(historyItem.chartId);
    }
    setLastError(null);
  }, [onSelectChart]);

  const handleSaveSettings = useCallback((updatedChart) => {
    // Обновляем график в состоянии charts
    setCharts(prev => prev.map(chart => 
      chart.id === updatedChart.id ? { ...chart, ...updatedChart } : chart
    ));
    
    console.log('Настройки графика сохранены:', updatedChart);
  }, [setCharts]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape' && show) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="sql-panel-grafana " style={{ height: '500px' }}>
      <div className="sql-panel-header-grafana">
        <div className="sql-panel-title">
          <i className="bi bi-sliders me-2"></i>
          <span>Настройки графиков ({charts.length})</span>
        </div>
        <div className="resize-controls">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={onClose}
            title="Закрыть панель"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      <div className="sql-panel-content-grafana">
        <div className="sql-editor-container h-100">
          <div className="sql-editor" style={{ overflowY: 'auto', padding: '10px' }}>
            {charts.length === 0 ? (
              <div className="text-center text-muted py-4">
                <i className="bi bi-bar-chart display-4 mb-3 text-white"></i>
                <h6 className="text-white">Нет добавленных графиков</h6>
              </div>
            ) : (
              <div className="chart-settings-list">
                {charts.map((chart) => (
                  <ChartSettings
                    key={chart.id}
                    chart={chart}
                    charts={charts}
                    onExecute={handleExecute}
                    onSave={handleSaveSettings}
                    onDelete={onRemoveChart}
                    onUpdateToggle={onUpdateToggle}
                    updatingCharts={updatingCharts}
                    editTitleValue={editTitleValue}
                    tableNames={tableNames}
                    columnsByTable={columnsByTable}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sql-panel-sidebar">
          <div className="sidebar-section">
            <h6>
              <i className="bi bi-clock-history me-2"></i>
              История запросов
            </h6>
            <div className="query-history-grafana">
              {queryHistory.length === 0 ? (
                <div className="text-muted small p-2">История запросов пуста</div>
              ) : (
                queryHistory.map((item, index) => (
                  <div
                    key={index}
                    className={`history-item-grafana ${item.success ? '' : 'history-error'}`}
                    onClick={() => handleHistoryClick(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="history-query">
                      <i className={`bi bi-${item.success ? 'check' : 'x'}-circle-fill text-${item.success ? 'success' : 'danger'} me-2`}></i>
                      {item.name}
                    </div>
                    <div className="history-time text-muted small">
                      {item.timestamp}
                      {item.chartId && (
                        <div className="text-info small">
                          График: {charts.findIndex(c => c.id === item.chartId) + 1}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="sql-panel-loading">
          <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
            <span className="visually-hidden">Загрузка...</span>
          </div>
          <span>Выполнение запроса...</span>
        </div>
      )}

      <ErrorAlert error={lastError} onClose={handleCloseError} />

      <div className="sql-panel-footer-grafana">
        <div className="footer-left">
          <small className="text-muted">
            <i className="bi bi-info-circle me-1"></i>
            {selectedChartId 
              ? `Выбран график: ${charts.findIndex(c => c.id === selectedChartId) + 1}` 
              : 'Всего графиков: ' + charts.length}
          </small>
        </div>
        <div className="footer-right">
          <button
            className="btn btn-sm btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default SqlPanel;