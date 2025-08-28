import { AreaSeries, createChart, ColorType } from 'lightweight-charts';
import React, { useEffect, useRef, useState } from 'react';

export const Chart = props => {
    const {
        data,
        type,
        colors: {
            backgroundColor = '#2a2a2a',
            lineColor = '#2962FF',
            textColor = 'white',
            areaTopColor = '#2962FF',
            areaBottomColor = 'rgba(41, 98, 255, 0.28)',
        } = {},
        updateInterval = 1000, // Увеличим интервал для стабильности
        onDataUpdate
    } = props;

    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const [resizeObserver, setResizeObserver] = useState(null);
    const updateIntervalRef = useRef(null);
    const isUserInteractingRef = useRef(false);
    const interactionTimeoutRef = useRef(null);

    // Функция для преобразования времени HH:MM:SS.mmm в секунды с миллисекундами
    const timeToSeconds = (timeString) => {
        if (!timeString) return 0;
        
        // Разделяем время и миллисекунды
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

        // Удаляем дубликаты и сортируем по времени
        const uniqueDataMap = new Map();
        
        rawData.forEach(item => {
            const timeInSeconds = timeToSeconds(item.time);
            uniqueDataMap.set(timeInSeconds, {
                time: timeInSeconds,
                value: item.value
            });
        });

        const uniqueData = Array.from(uniqueDataMap.values());
        uniqueData.sort((a, b) => a.time - b.time);

        return uniqueData;
    };

    // Обработчики взаимодействия пользователя
    const handleUserInteractionStart = () => {
        isUserInteractingRef.current = true;
        if (interactionTimeoutRef.current) {
            clearTimeout(interactionTimeoutRef.current);
        }
    };

    const handleUserInteractionEnd = () => {
        if (interactionTimeoutRef.current) {
            clearTimeout(interactionTimeoutRef.current);
        }
        
        interactionTimeoutRef.current = setTimeout(() => {
            isUserInteractingRef.current = false;
        }, 1500);
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

        const newSeries = chart.addSeries(AreaSeries, { 
            lineColor, 
            topColor: areaTopColor, 
            bottomColor: areaBottomColor 
        });

        // Подписываемся на события взаимодействия
        chart.timeScale().subscribeVisibleLogicalRangeChange(handleUserInteractionStart);
        chart.timeScale().subscribeVisibleTimeRangeChange(handleUserInteractionStart);

        chartRef.current = chart;
        seriesRef.current = newSeries;

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

        // Обработчики мыши
        const handleMouseDown = () => handleUserInteractionStart();
        const handleMouseUp = () => handleUserInteractionEnd();

        chartContainerRef.current.addEventListener('mousedown', handleMouseDown);
        chartContainerRef.current.addEventListener('mouseup', handleMouseUp);

        return () => {
            observer.disconnect();
            
            if (chartContainerRef.current) {
                chartContainerRef.current.removeEventListener('mousedown', handleMouseDown);
                chartContainerRef.current.removeEventListener('mouseup', handleMouseUp);
            }
            
            if (interactionTimeoutRef.current) {
                clearTimeout(interactionTimeoutRef.current);
            }
            
            chart.remove();
        };
    }, [backgroundColor, textColor, lineColor, areaTopColor, areaBottomColor]);

    // Эффект для ОТОБРАЖЕНИЯ данных (не обновления)
    useEffect(() => {
        if (seriesRef.current && data && data.length > 0) {
            console.log('Setting initial data:', data.length, 'points');
            const processedData = processChartData(data);
            console.log('Processed data:', processedData.length, 'points');
            
            if (processedData.length > 0) {
                seriesRef.current.setData(processedData);
                
                if (chartRef.current) {
                    chartRef.current.timeScale().fitContent();
                }
            }
        }
    }, [data]); // Только при изменении данных

    // Эффект для ОБНОВЛЕНИЯ данных через интервал
    useEffect(() => {
    if (seriesRef.current && onDataUpdate) {
        if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
        }

        updateIntervalRef.current = setInterval(async () => {
            try {
                if (isUserInteractingRef.current) {
                    return;
                }

                const newData = await onDataUpdate();
                if (newData && newData.length > 0) {
                    // Добавляем только новые точки
                    newData.forEach(point => {
                        const timeInSeconds = timeToSeconds(point.time);
                        seriesRef.current.update({
                            time: timeInSeconds,
                            value: point.value
                        });
                    });

                    // Автоматическое масштабирование
                    if (chartRef.current && !isUserInteractingRef.current) {
                        chartRef.current.timeScale().fitContent();
                    }
                }
            } catch (error) {
                console.error('Ошибка при обновлении данных:', error);
            }
        }, updateInterval);
    }

    return () => {
        if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
        }
    };
}, [updateInterval, onDataUpdate]);

    return (
        <div
            ref={chartContainerRef}
            style={{ width: '100%', height: '100%', minHeight: '300px' }}
        />
    );
};

export default Chart;