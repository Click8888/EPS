import { AreaSeries, LineSeries, createChart, ColorType } from 'lightweight-charts';
import React, { useEffect, useRef, useState } from 'react';

export const Chart = props => {
    const {
        data,
        series = [], // Новый пропс для дополнительных серий
        type,
        isUpdating,
        colors: {
            backgroundColor = '#2a2a2a',
            lineColor = '#133592',
            textColor = 'white',
            areaTopColor = '#2a4a9c', 
            areaBottomColor = '#1a2a5c', 
        } = {},
    } = props;

    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const seriesMapRef = useRef(new Map()); // Для хранения всех серий
    const [resizeObserver, setResizeObserver] = useState(null);
    const lastDataRef = useRef([]);

    // Функция для преобразования 8-значного HEX в 6-значный
    const normalizeColor = (color) => {
        if (!color) return '#133592';
        
        if (color.length === 9 && color.startsWith('#')) {
            return color.substring(0, 7);
        }
        
        return color;
    };

    // Функция для преобразования времени HH:MM:SS.mmm в секунды
    const timeToSeconds = (timeString) => {
        if (!timeString) return 0;
        
        const [timePart, millisecondsPart] = timeString.split('.');
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        const milliseconds = millisecondsPart ? parseInt(millisecondsPart) : 0;
        
        return hours * 3600 + minutes * 60 + seconds + (milliseconds / 1000);
    };

    // Функция для форматирования секунд обратно в HH:MM:SS.mmm
    const secondsToTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const remainingAfterHours = totalSeconds % 3600;
        const minutes = Math.floor(remainingAfterHours / 60);
        const remainingAfterMinutes = remainingAfterHours % 60;
        const seconds = Math.floor(remainingAfterMinutes);
        const milliseconds = Math.round((remainingAfterMinutes - seconds) * 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    };

    // Функция для обработки и валидации данных
    const processChartData = (rawData) => {
        if (!rawData || rawData.length === 0) return [];

        const uniqueDataMap = new Map();
        
        rawData.forEach(item => {
            if (item.time && item.value !== undefined) {
                const timeInSeconds = timeToSeconds(item.time);
                uniqueDataMap.set(timeInSeconds, {
                    time: timeInSeconds,
                    value: parseFloat(item.value) || 0
                });
            }
        });

        let uniqueData = Array.from(uniqueDataMap.values());
        uniqueData.sort((a, b) => a.time - b.time);

        if (uniqueData.length > 1500) {
            uniqueData = uniqueData.slice(-1500);
        }

        return uniqueData;
    };

    // Эффект для создания графика
    useEffect(() => {
  if (!chartContainerRef.current) return;

  const handleResize = () => {
    if (chartRef.current && chartContainerRef.current) {
      chartRef.current.applyOptions({ 
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight
      });
    }
  };

  const chart = createChart(chartContainerRef.current, {
    layout: {
      background: { type: ColorType.Solid, color: backgroundColor },
      textColor,
    },
    width: chartContainerRef.current.clientWidth,
    height: 300,
    timeScale: {
      timeVisible: true,
      secondsVisible: true,
      tickMarkFormatter: (time) => {
        return secondsToTime(time);
      }
    },
    grid: {
      vertLines: { color: '#444' },
      horzLines: { color: '#444' },
    },
    autoSize: true,
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
    },
    handleScale: {
      axisPressedMouseMove: true,
      mouseWheel: true,
      pinch: true,
    },
  });

  chartRef.current = chart;
  seriesMapRef.current = new Map();

  // ResizeObserver
  const observer = new ResizeObserver(entries => {
    for (let entry of entries) {
      if (entry.target === chartContainerRef.current) {
        handleResize();
      }
    }
  });

  observer.observe(chartContainerRef.current);
  setResizeObserver(observer);

  return () => {
    observer.disconnect();
    chart.remove();
  };
}, [backgroundColor, textColor]);

    // Эффект для управления всеми сериями
    useEffect(() => {
  if (!chartRef.current) return;

  const chart = chartRef.current;
  const seriesMap = seriesMapRef.current;

  // Создаем/обновляем основную серию (LineSeries вместо AreaSeries)
  if (!seriesMap.has('main')) {
    const normalizedLineColor = normalizeColor(lineColor);

    const mainSeries = chart.addSeries(LineSeries, { 
      color: normalizedLineColor,
      lineWidth: 2,
      title: 'Основная серия',
      priceLineVisible: false
    });
    seriesMap.set('main', mainSeries);
  }

        // Обновляем настройки основной серии
         const mainSeries = seriesMap.get('main');
  if (mainSeries) {
    const normalizedLineColor = normalizeColor(lineColor);
    
    mainSeries.applyOptions({
      color: normalizedLineColor,
      lineWidth: 2
    });
  }

        // Удаляем дополнительные серии, которых больше нет
        Array.from(seriesMap.keys()).forEach(key => {
            if (key !== 'main' && !series.some(s => `series-${s.id}` === key)) {
                const seriesToRemove = seriesMap.get(key);
                if (seriesToRemove) {
                    chart.removeSeries(seriesToRemove);
                }
                seriesMap.delete(key);
            }
        });

        // Создаем/обновляем дополнительные серии (LineSeries)
        series.forEach(seriesItem => {
            const seriesKey = `series-${seriesItem.id}`;
            
            if (!seriesMap.has(seriesKey) && seriesItem.enabled !== false) {
                // Создаем новую серию
                try {
                    const newSeries = chart.addSeries(LineSeries, {
                        color: normalizeColor(seriesItem.color || '#ff0000'),
                        lineWidth: seriesItem.width || 2,
                        lineStyle: seriesItem.style === 'dashed' ? 1 : 0,
                        title: seriesItem.name || `Серия ${seriesItem.id}`,
                        priceLineVisible: false
                    });
                    
                    if (seriesItem.data && seriesItem.data.length > 0) {
                        const processedData = processChartData(seriesItem.data);
                        if (processedData.length > 0) {
                            newSeries.setData(processedData);
                        }
                    }
                    
                    seriesMap.set(seriesKey, newSeries);
                } catch (error) {
                    console.error('Ошибка при создании серии:', error);
                }
            } else if (seriesMap.has(seriesKey)) {
                // Обновляем существующую серию
                const existingSeries = seriesMap.get(seriesKey);
                
                if (seriesItem.enabled === false) {
                    // Удаляем отключенную серию
                    try {
                        chart.removeSeries(existingSeries);
                        seriesMap.delete(seriesKey);
                    } catch (error) {
                        console.error('Ошибка при удалении серии:', error);
                    }
                } else if (existingSeries) {
                    // Обновляем настройки серии
                    try {
                        existingSeries.applyOptions({
                            color: normalizeColor(seriesItem.color || '#ff0000'),
                            lineWidth: seriesItem.width || 2,
                            lineStyle: seriesItem.style === 'dashed' ? 1 : 0,
                            title: seriesItem.name || `Серия ${seriesItem.id}`
                        });
                        
                        // Обновляем данные серии
                        if (seriesItem.data && seriesItem.data.length > 0) {
                            const processedData = processChartData(seriesItem.data);
                            if (processedData.length > 0) {
                                existingSeries.setData(processedData);
                            }
                        } else {
                            existingSeries.setData([]);
                        }
                    } catch (error) {
                        console.error('Ошибка при обновлении серии:', error);
                    }
                }
            }
        });

        // Автомасштабирование
        try {
            if (chartRef.current) {
                chartRef.current.timeScale().fitContent();
            }
        } catch (error) {
            console.error('Ошибка при автомасштабировании:', error);
        }

    }, [series, lineColor]);

    // Эффект для обновления данных основной серии
    useEffect(() => {
        const mainSeries = seriesMapRef.current.get('main');
        if (mainSeries) {
            if (data && data.length > 0) {
                const processedData = processChartData(data);
                if (processedData.length > 0) {
                    try {
                        mainSeries.setData(processedData);
                        lastDataRef.current = processedData;
                        
                        if (chartRef.current) {
                            chartRef.current.timeScale().fitContent();
                        }
                    } catch (error) {
                        console.error('Ошибка при обновлении данных основной серии:', error);
                    }
                } else {
                    mainSeries.setData([]);
                }
            } else {
                mainSeries.setData([]);
            }
        }
    }, [data, isUpdating]);

    // Эффект для обработки изменений размеров
    useEffect(() => {
        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                try {
                    chartRef.current.applyOptions({ 
                        width: chartContainerRef.current.clientWidth,
                        height: chartContainerRef.current.clientHeight
                    });
                } catch (error) {
                    console.error('Ошибка при изменении размера:', error);
                }
            }
        };

        if (resizeObserver && chartContainerRef.current) {
            handleResize();
        }
    }, [resizeObserver]);

    return (
        <div
            ref={chartContainerRef}
            style={{ 
                width: '100%', 
                height: '100%', 
                minHeight: '300px',
                position: 'relative'
            }}
        >
            {(!data || data.length === 0) && series.every(s => !s.data || s.data.length === 0) && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#888',
                    textAlign: 'center',
                    zIndex: 10
                }}>
                    <i className="bi bi-bar-chart" style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}></i>
                    <span>Нет данных для отображения</span>
                </div>
            )}
            
        </div>
    );
};

export default Chart;