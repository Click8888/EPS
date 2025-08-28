import React, { useState, useRef, useEffect } from 'react';

//helper
const normalizeId = (id) => {
  if (id === null || id === undefined || id === '') return null;
  return typeof id === 'string' ? parseInt(id, 10) : id;
};

const SqlPanel = ({ show, onClose, onExecuteQuery, charts, selectedChartId, onSelectChart }) => {
  const [query, setQuery] = useState('');
  const [queryHistory, setQueryHistory] = useState([]);
  const [formatQuery, setFormatQuery] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [panelHeight, setPanelHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef(null);
  const resizeHandleRef = useRef(null);

  
  const handleExecute = async () => {
  if (!query.trim()) return;
  
  setIsLoading(true);
  setLastError(null);

  try {
    // Нормализуем ID перед передачей
    const normalizedChartId = normalizeId(selectedChartId);
    await onExecuteQuery(query, normalizedChartId);
    
    setQueryHistory(prev => [{
      query: query,
      timestamp: new Date().toLocaleTimeString(),
      success: true,
      chartId: normalizedChartId || 'all'
    }, ...prev.slice(0, 9)]);
    
    setQuery('');
  } catch (error) {
    setLastError(error.message);
    setQueryHistory(prev => [{
      query: query,
      timestamp: new Date().toLocaleTimeString(),
      success: false,
      error: error.message,
      chartId: normalizeId(selectedChartId) || 'all'
    }, ...prev.slice(0, 9)]);
  } finally {
    setIsLoading(false);
  }
};

  const handleHistoryClick = (historyItem) => {
  setQuery(historyItem.query);
  if (historyItem.chartId && historyItem.chartId !== 'all') {
    onSelectChart(historyItem.chartId);
  } else {
    onSelectChart(null);
  }
  setLastError(null);
};

  const handleKeyPress = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleExecute();
    }
  };

  const formatSql = () => {
    const formatted = query
      .replace(/\b(SELECT|FROM|WHERE|AND|OR|ORDER BY|GROUP BY|HAVING|LIMIT|INSERT|UPDATE|DELETE|JOIN|LEFT|RIGHT|INNER|OUTER)\b/gi, '\n$1')
      .replace(/,/g, ',\n  ')
      .trim();
    setQuery(formatted);
    setFormatQuery(true);
    setTimeout(() => setFormatQuery(false), 1000);
  };

  const clearQuery = () => {
    setQuery('');
    setLastError(null);
  };

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResize = (e) => {
    if (!isResizing) return;
    
    const newHeight = window.innerHeight - e.clientY;
    
    if (newHeight > 300 && newHeight < window.innerHeight - 100) {
      setPanelHeight(newHeight);
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  if (!show) return null;

  return (
    <div 
      ref={panelRef}
      className="sql-panel-grafana"
      style={{ height: `${panelHeight}px` }}
    >
      <div 
        ref={resizeHandleRef}
        className="sql-panel-resize-handle"
        onMouseDown={handleResizeStart}
        style={{ cursor: isResizing ? 'ns-resize' : 'row-resize' }}
      >
        <i className="bi bi-dash"></i>
      </div>

      <div className="sql-panel-header-grafana">
        <div className="sql-panel-title">
          <i className="bi bi-database me-2"></i>
          <span>Query editor</span>
          {/* <div className="sql-panel-buttons">
            <button
              className="btn btn-sm btn-outline-secondary me-2"
              onClick={formatSql}
              title="Format SQL"
              disabled={!query.trim() || isLoading}
            >
              <i className={`bi bi-code-slash ${formatQuery ? 'text-success' : ''}`}></i>
            </button>
            <button
              className="btn btn-sm btn-outline-secondary me-2"
              onClick={clearQuery}
              title="Clear query"
              disabled={!query.trim() || isLoading}
            >
              <i className="bi bi-eraser"></i>
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={onClose}
              title="Close editor"
              disabled={isLoading}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div> */}
        </div>
      </div>

      <div className="sql-panel-content-grafana" style={{ height: `calc(100% - 120px)` }}>
        <div className="sql-editor-container h-100">
          <div className="sql-editor-header">
            <span className="sql-editor-tab active">SQL</span>
          </div>
          
          <div className="chart-selector-container">
            <select 
              className="form-select form-select-sm"
              value={selectedChartId || ''}
              onChange={(e) => onSelectChart(e.target.value || null)}
              disabled={charts.length === 0 || isLoading}
            >
              <option value="">All charts</option>
              {charts.map((chart, index) => (
                <option key={chart.id} value={chart.id}>
                  Chart #{index + 1} - {chart.type === 'linear' ? 'Linear' : 'Vector'}
                </option>
              ))}
            </select>
          </div>

          <div className="sql-editor h-100">
            <textarea
              className="sql-textarea-grafana h-100"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="SELECT * FROM ... WHERE..."
              autoFocus
              spellCheck="false"
              disabled={isLoading}
              style={{ resize: 'none' }}
            />
          </div>
        </div>

        <div className="sql-panel-sidebar">
          <div className="sidebar-section">
            <h6>Query history</h6>
            <div className="query-history-grafana">
              {queryHistory.length === 0 ? (
                <div className="text-muted small p-2">No query history</div>
              ) : (
                queryHistory.map((item, index) => (
                  <div
                    key={index}
                    className={`history-item-grafana ${item.success ? '' : 'history-error'}`}
                    onClick={() => handleHistoryClick(item)}
                  >
                    <div className="history-query">
                      <i className={`bi bi-${item.success ? 'check' : 'x'}-circle-fill text-${item.success ? 'success' : 'danger'} me-2`}></i>
                      {item.query.length > 60 ? item.query.substring(0, 60) + '...' : item.query}
                    </div>
                    <div className="history-time text-muted small">
                      {item.timestamp}
                      
                      {item.chartId && item.chartId !== 'all' ? (
                        <div className="text-info small">
                          Chart: {charts.findIndex(c => c.id === item.chartId) + 1}
                        </div>
                      ) : (
                        <div className="text-info small">All charts</div>
                      )}
                      
                      {item.error && <div className="text-danger small">{item.error}</div>}
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
            <span className="visually-hidden">Loading...</span>
          </div>
          <span>Executing query...</span>
        </div>
      )}

      {lastError && (
        <div className="sql-panel-error alert alert-danger m-2 mb-0">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {lastError}
        </div>
      )}

      <div className="sql-panel-footer-grafana">
        <div className="footer-left">
          <small className="text-muted">
            <i className="bi bi-info-circle me-1"></i>
            {selectedChartId 
              ? `Query will update selected chart only` 
              : `Query will update all charts`}
          </small>
        </div>
        <div className="footer-right">
          <button
            className="btn btn-sm btn-secondary me-2"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={handleExecute}
            disabled={!query.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                Executing...
              </>
            ) : (
              <>
                <i className="bi bi-play-fill me-1"></i>
                Run query
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SqlPanel;