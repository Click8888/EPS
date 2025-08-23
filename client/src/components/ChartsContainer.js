import React from 'react';
import Chart from './Chart';

const ChartsContainer = ({ 
  children, 
  charts, 
  onDragStart, 
  onDragEnd, 
  onDragOver, 
  onDrop, 
  draggedChart, 
  onRemoveChart, 
  measurements 
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
                    data={chart.data} 
                    type={chart.type}
                    colors={{
                      backgroundColor: '#2a2a2a',
                      textColor: 'white',
                      lineColor: chart.type === 'linear' ? '#2962FF' : '#FF6B6B'
                    }}
                  />
                </div>
                {console.log(charts)}
                {console.log(chart.id)}
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

export default ChartsContainer;