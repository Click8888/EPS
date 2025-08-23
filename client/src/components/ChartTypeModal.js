import React from 'react';

const ChartTypeModal = ({ show, onClose, selectedChartType, onChartTypeChange, onAddChart }) => {
  if (!show) return null;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Выберите тип графика</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="form-check mb-3">
              <input 
                className="form-check-input" 
                type="radio" 
                name="chartType" 
                id="linearChart" 
                value="linear" 
                checked={selectedChartType === 'linear'} 
                onChange={(e) => onChartTypeChange(e.target.value)} 
              />
              <label className="form-check-label" htmlFor="linearChart">
                Линейный график
              </label>
            </div>
            <div className="form-check">
              <input 
                className="form-check-input" 
                type="radio" 
                name="chartType" 
                id="vectorChart" 
                value="vector" 
                checked={selectedChartType === 'vector'} 
                onChange={(e) => onChartTypeChange(e.target.value)} 
              />
              <label className="form-check-label" htmlFor="vectorChart">
                Векторная диаграмма
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Отмена
            </button>
            <button type="button" className="btn btn-primary" onClick={onAddChart}>
              Добавить график
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartTypeModal;