import React, { useState, useEffect, useRef, useCallback } from 'react';
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

// Компонент модального окна для создания/редактирования запроса
const QueryEditorModal = ({ show, onClose, onSave, initialQuery = null }) => {
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (initialQuery) {
      setName(initialQuery.name || '');
      setQuery(initialQuery.query || '');
      setDescription(initialQuery.description || '');
    } else {
      setName('');
      setQuery('');
      setDescription('');
    }
  }, [initialQuery, show]);

  const handleSave = () => {
    if (!name.trim() || !query.trim()) {
      alert('Название и запрос обязательны для заполнения');
      return;
    }

    onSave({
      id: initialQuery?.id || Date.now(),
      name: name.trim(),
      query: query.trim(),
      description: description.trim()
    });

    onClose();
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content bg-dark text-light">
          <div className="modal-header border-secondary">
            <h5 className="modal-title">
              {initialQuery ? 'Редактировать запрос' : 'Создать новый запрос'}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Название запроса *</label>
              <input
                type="text"
                className="form-control bg-secondary text-light border-dark"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Введите название запроса"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">SQL запрос *</label>
              <textarea
                className="form-control bg-secondary text-light border-dark"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Введите SQL запрос"
                rows="6"
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Описание</label>
              <textarea
                className="form-control bg-secondary text-light border-dark"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Описание запроса (необязательно)"
                rows="3"
              />
            </div>
          </div>
          <div className="modal-footer border-secondary">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Отмена
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Компонент элемента сохраненного запроса
const QueryItem = ({ queryItem, onExecute, onEdit, onDelete, isLoading }) => (
  <div className="query-item p-3 mb-2 rounded bg-dark" style={{ border: '1px solid #444' }}>
    <div className="d-flex justify-content-between align-items-start mb-2">
      <h6 className="mb-1 flex-grow-1 text-truncate" title={queryItem.name}>
        {queryItem.name}
      </h6>
      <div className="btn-group btn-group-sm">
        <button
          className="btn btn-outline-primary"
          onClick={() => onExecute(queryItem.query)}
          title="Выполнить запрос"
          disabled={isLoading}
        >
          <i className="bi bi-play-fill"></i>
        </button>
        <button
          className="btn btn-outline-warning"
          onClick={() => onEdit(queryItem)}
          title="Редактировать запрос"
        >
          <i className="bi bi-pencil"></i>
        </button>
        <button
          className="btn btn-outline-danger"
          onClick={() => onDelete(queryItem.id)}
          title="Удалить запрос"
        >
          <i className="bi bi-trash"></i>
        </button>
      </div>
    </div>
    
    {queryItem.description && (
      <p className="small mb-2 text-muted">
        {queryItem.description}
      </p>
    )}
    
    <div 
      className="small text-info mt-2 query-code" 
      style={{ 
        fontFamily: 'monospace', 
        fontSize: '11px',
        backgroundColor: '#2a2a2a',
        padding: '8px',
        borderRadius: '4px',
        overflowX: 'auto'
      }}
    >
      {queryItem.query}
    </div>
  </div>
);

// Компонент элемента истории запросов
const HistoryItem = ({ item, charts, onClick }) => (
  <div
    className={`history-item-grafana ${item.success ? '' : 'history-error'}`}
    onClick={() => onClick(item)}
    style={{ cursor: 'pointer' }}
  >
    <div className="history-query">
      <i className={`bi bi-${item.success ? 'check' : 'x'}-circle-fill text-${item.success ? 'success' : 'danger'} me-2`}></i>
      {item.name || (item.query.length > 40 ? item.query.substring(0, 40) + '...' : item.query)}
    </div>
    <div className="history-time text-muted small">
      {item.timestamp}
      
      {item.chartId && item.chartId !== 'all' ? (
        <div className="text-info small">
          График: {charts.findIndex(c => c.id === item.chartId) + 1}
        </div>
      ) : (
        <div className="text-info small">Все графики</div>
      )}
      
      {item.error && <div className="text-danger small">{item.error}</div>}
    </div>
  </div>
);

const SqlPanel = ({ show, onClose, onExecuteQuery, charts, selectedChartId, onSelectChart }) => {
  const [savedQueries, setSavedQueries] = useState([]);
  const [queryHistory, setQueryHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [panelHeight, setPanelHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [editingQuery, setEditingQuery] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const panelRef = useRef(null);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

  // Загрузка сохраненных запросов из localStorage
  useEffect(() => {
    if (show) {
      loadSavedQueries();
      const savedHeight = localStorage.getItem('sqlPanelHeight');
      if (savedHeight) {
        setPanelHeight(parseInt(savedHeight));
      }
    }
  }, [show]);

  const loadSavedQueries = useCallback(() => {
    try {
      const storedQueries = localStorage.getItem('savedQueries');
      if (storedQueries) {
        setSavedQueries(JSON.parse(storedQueries));
      } else {
        const initialQueries = [
          {
            id: 1,
            name: 'Все измерения (последние 24 часа)',
            query: 'SELECT * FROM measurements WHERE Measurement_time >= NOW() - INTERVAL 24 HOUR ORDER BY Measurement_time DESC',
            description: 'Показывает все измерения за последние 24 часа'
          },
          {
            id: 2,
            name: 'Средние значения по часам',
            query: 'SELECT HOUR(Measurement_time) as hour, AVG(Current_value) as avg_value FROM measurements GROUP BY HOUR(Measurement_time) ORDER BY hour',
            description: 'Средние значения измерений сгруппированные по часам'
          }
        ];
        setSavedQueries(initialQueries);
        localStorage.setItem('savedQueries', JSON.stringify(initialQueries));
      }
    } catch (error) {
      console.error('Ошибка при загрузке запросов:', error);
      setLastError('Не удалось загрузить сохраненные запросы');
    }
  }, []);

  const saveQuery = useCallback((query) => {
    const updatedQueries = editingQuery
      ? savedQueries.map(q => q.id === query.id ? query : q)
      : [...savedQueries.filter(q => q.id !== query.id), query];

    setSavedQueries(updatedQueries);
    localStorage.setItem('savedQueries', JSON.stringify(updatedQueries));
    setEditingQuery(null);
  }, [savedQueries, editingQuery]);

  const deleteQuery = useCallback((queryId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот запрос?')) {
      const updatedQueries = savedQueries.filter(q => q.id !== queryId);
      setSavedQueries(updatedQueries);
      localStorage.setItem('savedQueries', JSON.stringify(updatedQueries));
    }
  }, [savedQueries]);

  const handleCloseError = useCallback(() => {
    setLastError(null);
  }, []);

  const handleExecute = useCallback(async (query) => {
    if (!query) return;
    
    setIsLoading(true);
    setLastError(null);

    try {
      const normalizedChartId = normalizeId(selectedChartId);
      await onExecuteQuery(query, normalizedChartId);
      
      setQueryHistory(prev => [{
        query: query,
        name: savedQueries.find(q => q.query === query)?.name || 'Custom Query',
        timestamp: new Date().toLocaleTimeString(),
        success: true,
        chartId: normalizedChartId || 'all'
      }, ...prev.slice(0, 9)]);
      
    } catch (error) {
      setLastError(error.message);
      setQueryHistory(prev => [{
        query: query,
        name: savedQueries.find(q => q.query === query)?.name || 'Custom Query',
        timestamp: new Date().toLocaleTimeString(),
        success: false,
        error: error.message,
        chartId: normalizeId(selectedChartId) || 'all'
      }, ...prev.slice(0, 9)]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedChartId, onExecuteQuery, savedQueries]);

  const handleHistoryClick = useCallback((historyItem) => {
    if (historyItem.chartId && historyItem.chartId !== 'all') {
      onSelectChart(historyItem.chartId);
    } else {
      onSelectChart(null);
    }
    setLastError(null);
  }, [onSelectChart]);

  const startResize = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = panelHeight;
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [panelHeight]);

  const handleResize = useCallback((e) => {
    if (!isResizing) return;
    
    const deltaY = resizeStartY.current - e.clientY;
    const newHeight = Math.max(200, Math.min(window.innerHeight - 100, resizeStartHeight.current + deltaY));
    setPanelHeight(newHeight);
  }, [isResizing]);

  const stopResize = useCallback(() => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    localStorage.setItem('sqlPanelHeight', panelHeight.toString());
  }, [panelHeight]);

  const toggleCollapse = useCallback(() => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setPanelHeight(400);
    } else {
      setIsCollapsed(true);
      setPanelHeight(60);
    }
  }, [isCollapsed]);

  const maximizePanel = useCallback(() => {
    setIsCollapsed(false);
    setPanelHeight(window.innerHeight - 100);
  }, []);

  const handleEditQuery = useCallback((queryItem) => {
    setEditingQuery(queryItem);
    setShowQueryModal(true);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape' && show) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResize);
    };
  }, [show, onClose, handleResize, stopResize]);

  if (!show) return null;

  return (
    <>
      <QueryEditorModal
        show={showQueryModal}
        onClose={() => {
          setShowQueryModal(false);
          setEditingQuery(null);
        }}
        onSave={saveQuery}
        initialQuery={editingQuery}
      />

      <div 
        ref={panelRef}
        className="sql-panel-grafana"
        style={{ 
          height: isCollapsed ? '60px' : `${panelHeight}px`,
          bottom: 0
        }}
      >
        <div 
          className="sql-panel-resize-handle-top"
          onMouseDown={startResize}
          style={{ cursor: isResizing ? 'ns-resize' : 'row-resize' }}
        >
          <div className="resize-handle-line"></div>
        </div>

        <div className="sql-panel-header-grafana">
          <div className="sql-panel-title">
            <i className="bi bi-database me-2"></i>
            <span>Управление SQL запросами</span>
            <div className="resize-controls ms-3">
              <button
                className="btn btn-sm btn-outline-secondary me-1"
                onClick={toggleCollapse}
                title={isCollapsed ? "Развернуть" : "Свернуть"}
              >
                <i className={`bi bi-chevron-${isCollapsed ? 'up' : 'down'}`}></i>
              </button>
              <button
                className="btn btn-sm btn-outline-secondary me-1"
                onClick={maximizePanel}
                title="Развернуть на весь экран"
              >
                <i className="bi bi-fullscreen"></i>
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={onClose}
                title="Закрыть панель"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
          
          {!isCollapsed && (
            <button
              className="btn btn-sm btn-success"
              onClick={() => setShowQueryModal(true)}
              title="Добавить новый запрос"
            >
              <i className="bi bi-plus-lg me-1"></i>
              Новый запрос
            </button>
          )}
        </div>

        {!isCollapsed && (
          <>
            <div className="sql-panel-content-grafana" style={{ height: `calc(100% - 120px)` }}>
              <div className="sql-editor-container h-100">
                <div className="sql-editor-header">
                  <span className="sql-editor-tab active">Сохраненные запросы</span>
                </div>
                
                <div className="chart-selector-container">
                  <select 
                    className="form-select form-select-sm"
                    value={selectedChartId || ''}
                    onChange={(e) => onSelectChart(e.target.value || null)}
                    disabled={charts.length === 0 || isLoading}
                  >
                    <option value="">Все графики</option>
                    {charts.map((chart, index) => (
                      <option key={chart.id} value={chart.id}>
                        График #{index + 1} - {chart.type === 'linear' ? 'Линейный' : 'Векторный'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sql-editor h-100" style={{ overflowY: 'auto', padding: '10px' }}>
                  {savedQueries.length === 0 ? (
                    <div className="text-center text-muted py-4">
                      <i className="bi bi-inbox display-4 d-block mb-2"></i>
                      <p>Нет сохраненных запросов</p>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowQueryModal(true)}
                      >
                        Создать первый запрос
                      </button>
                    </div>
                  ) : (
                    <div className="query-list">
                      {savedQueries.map((queryItem) => (
                        <QueryItem
                          key={queryItem.id}
                          queryItem={queryItem}
                          onExecute={handleExecute}
                          onEdit={handleEditQuery}
                          onDelete={deleteQuery}
                          isLoading={isLoading}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="sql-panel-sidebar">
                <div className="sidebar-section">
                  <h6>История выполнения</h6>
                  <div className="query-history-grafana">
                    {queryHistory.length === 0 ? (
                      <div className="text-muted small p-2">История запросов пуста</div>
                    ) : (
                      queryHistory.map((item, index) => (
                        <HistoryItem
                          key={index}
                          item={item}
                          charts={charts}
                          onClick={handleHistoryClick}
                        />
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
                    ? `Запрос обновит только выбранный график` 
                    : `Запрос обновит все графики`}
                </small>
              </div>
              <div className="footer-right">
                <small className="text-muted me-3 d-none d-md-inline">
                  Перетащите верхнюю границу для изменения размера
                </small>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Закрыть
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default SqlPanel;