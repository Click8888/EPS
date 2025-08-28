import React from 'react';
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
  onDataUpdate
}) => {
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
                  <span className="chart-title">
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
                    key={`chart-content-${chart.id}-${index}`}
                    data={chart.data || measurements} // используем данные графика или общие измерения
                    type={chart.type}
                    onDataUpdate={() => onDataUpdate(chart.id)}
                    colors={{
                      backgroundColor: '#2a2a2a',
                      textColor: 'white',
                      lineColor: chart.type === 'linear' ? '#2962FF' : '#FF6B6B'
                    }}
                    
                  />
                  {/* {console.log(chart.data)} */}
                </div>
                
                <div className="chart-footer">
                  <small className="text-muted">
                    {(measurements).length} точек данных • 
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

export default ChartsContainer;