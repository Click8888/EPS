import React, { useState } from 'react';
import Chart from './Chart';

const ChartsContainer = ({ 
  charts, 
  onDragStart, 
  onDragEnd, 
  onDragOver, 
  onDrop, 
  draggedChart, 
  onRemoveChart,
  measurements,
  onUpdateToggle,
  updatingCharts,
  onChartTitleChange,
  setEditTitleValue,
  editTitleValue,
  chartSeries = {}
}) => {
  const [editingChartId, setEditingChartId] = useState(null);

  const handleTitleEditStart = (chart) => {
    setEditingChartId(chart.id);
    setEditTitleValue(chart.title || `График #${charts.findIndex(c => c.id === chart.id) + 1}`);
  };
  
  const handleTitleEditSave = (chartId) => {
    if (editTitleValue.trim()) {
      onChartTitleChange(chartId, editTitleValue.trim());
    }
    setEditingChartId(null);
    setEditTitleValue('');
  };

  const handleTitleEditCancel = () => {
    setEditingChartId(null);
    setEditTitleValue('');
  };

  const handleKeyPress = (e, chartId) => {
    if (e.key === 'Enter') {
      handleTitleEditSave(chartId);
    } else if (e.key === 'Escape') {
      handleTitleEditCancel();
    }
  };

  return (
    <div className="charts-main-container">
      {charts.length === 0 ? (
        <div className="charts-empty-state">
          <div className="text-center text-white">
            <i className="bi bi-bar-chart-fill display-4 mb-3"></i>
            <h4>Нет добавленных графиков</h4>
            <p className="text-white">Нажмите на кнопку ниже, чтобы добавить первый график</p>
          </div>
        </div>
      ) : (
        <div className="charts-grid">
          {charts.map((chart, index) => {
            const isUpdating = updatingCharts.has(chart.id);
            const isEditing = editingChartId === chart.id;
            const displayTitle = chart.title || `График #${index + 1}`;
            const chartSeriesData = chartSeries[chart.id] || [];

            return (
              <div 
                key={`chart-${chart.id}-${index}`}
                className={`chart-item ${draggedChart === chart.id ? 'dragging' : ''}`}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, chart.id)}
              >
                <div className="chart-wrapper">
                  <div 
                    className="chart-header draggable-handle"
                    draggable
                    onDragStart={(e) => onDragStart(e, chart.id)}
                    onDragEnd={onDragEnd}
                  >
                    {isEditing ? (
                      <div className="d-flex align-items-center flex-grow-1 me-2">
                        <i className="bi bi-grip-horizontal me-2"></i>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          onKeyDown={(e) => handleKeyPress(e, chart.id)}
                          onBlur={() => handleTitleEditSave(chart.id)}
                          autoFocus
                          style={{ 
                            backgroundColor: '#3a3a3a', 
                            color: 'white', 
                            border: '1px solid #555',
                            fontSize: '14px'
                          }}
                        />
                        <button
                          className="btn btn-success btn-sm ms-2"
                          onClick={() => handleTitleEditSave(chart.id)}
                          title="Сохранить"
                        >
                          <i className="bi bi-check"></i>
                        </button>
                        <button
                          className="btn btn-secondary btn-sm ms-1"
                          onClick={handleTitleEditCancel}
                          title="Отменить"
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ) : (
                      <span 
                        className="chart-title flex-grow-1"
                        onDoubleClick={() => handleTitleEditStart(chart)}
                        title="Двойной клик для редактирования названия"
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="bi bi-grip-horizontal me-2"></i>
                        {displayTitle} - {chart.type === 'linear' ? 'Линейный' : 'Векторный'}
                        {chartSeriesData.length > 0 && (
                          <span className="badge bg-info ms-2">
                            {chartSeriesData.length} серий
                          </span>
                        )}
                      </span>
                    )}
                    
                    <div className="chart-actions">
                      {!isEditing && (
                        <>
                          <button
                            className="btn btn-outline-secondary btn-sm me-2"
                            onClick={() => handleTitleEditStart(chart)}
                            title="Редактировать название"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className={`btn btn-sm me-2 ${isUpdating ? 'btn-warning' : 'btn-primary'}`}
                            onClick={() => onUpdateToggle(chart.id)}
                            title={isUpdating ? "Остановить обновление" : "Запустить обновление"}
                          >
                            <i className={`bi ${isUpdating ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
                          </button>
                          {/* ДОБАВЬТЕ ЭТУ КНОПКУ */}
                          <button
                            className="btn btn-outline-info btn-sm me-2"
                            onClick={() => {
                              // Функция для ручного масштабирования
                              const chartElement = document.querySelector(`[key*="chart-content-${chart.id}"]`);
                              if (chartElement) {
                                const chartInstance = chartElement.__chart__;
                                if (chartInstance) {
                                  chartInstance.timeScale().fitContent();
                                }
                              }
                            }}
                            title="Автомасштабирование"
                          >
                            <i className="bi bi-arrows-fullscreen"></i>
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => onRemoveChart(chart.id)}
                            title="Удалить график"
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="chart-content">
                    {isUpdating && (
                      <div className="updating-overlay">
                        <div className="spinner-border spinner-border-sm text-warning" role="status">
                          <span className="visually-hidden">Обновление...</span>
                        </div>
                      </div>
                    )}
                    <Chart 
                      key={`chart-content-${chart.id}-${index}`}
                      data={chart.data || []} // ОСНОВНЫЕ ДАННЫЕ
                      series={chartSeriesData} // ДОПОЛНИТЕЛЬНЫЕ СЕРИИ
                      type={chart.type}
                      isUpdating={isUpdating}
                      colors={{
                        backgroundColor: '#2a2a2a',
                        textColor: 'white',
                        lineColor: chart.color || '#133592', // ЦВЕТ ОСНОВНОЙ СЕРИИ
                        areaTopColor: '#2a4a9c',
                        areaBottomColor: '#1a2a5c'
                      }}
                    />
                  </div>
                  
                  <div className="chart-footer">
                    <small className="text-muted">
                      {(chart.data || []).length} точек данных • 
                      {chart.type === 'linear' ? ' Временной ряд' : ' Векторная диаграмма'}
                      {chartSeriesData.length > 0 && (
                        <span className="text-info ms-2">• {chartSeriesData.length} доп. серий</span>
                      )}
                      {isUpdating && <span className="text-warning ms-2">🔄 Обновляется...</span>}
                      {(chart.data || []).length >= 1500 && (
                        <span className="text-info ms-2">ⓘ Лимит: 1500 точек</span>
                      )}
                    </small>
                    
                    {/* Статус дополнительных серий */}
                    {chartSeriesData.length > 0 && (
                      <div className="series-status-list mt-2">
                        {chartSeriesData.map(seriesItem => (
                          <div key={seriesItem.id} className="series-status">
                            <small className={isUpdating ? "text-warning" : "text-muted"}>
                              <i className="bi bi-circle-fill me-1" style={{ 
                                color: seriesItem.color || '#ff0000',
                                fontSize: '0.6rem'
                              }}></i>
                              {seriesItem.name}: {seriesItem.data?.length || 0} точек
                              {isUpdating && " 🔄"}
                            </small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChartsContainer;