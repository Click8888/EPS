import { AreaSeries, createChart, ColorType } from 'lightweight-charts';
import React, { useEffect, useRef, useState } from 'react';

export const Chart = props => {
    const {
        data,
        type,
        isUpdating,
        colors: {
            backgroundColor = '#2a2a2a',
            lineColor = '#133592', // Убираем ff в конце (альфа-канал)
            textColor = 'white',
            areaTopColor = '#2a4a9c', // Заменяем полупрозрачный цвет на обычный
            areaBottomColor = '#1a2a5c', // Заменяем более прозрачный цвет на обычный
        } = {},
    } = props;

    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const [resizeObserver, setResizeObserver] = useState(null);
    const lastDataRef = useRef([]);

    // Функция для преобразования 8-значного HEX в 6-значный (убираем альфа-канал)
    const normalizeColor = (color) => {
        if (!color) return '#133592';
        
        // Если цвет в формате #RRGGBBAA, убираем альфа-канал
        if (color.length === 9 && color.startsWith('#')) {
            return color.substring(0, 7);
        }
        
        return color;
    };

    // Функция для преобразования времени HH:MM:SS.mmm в секунды с миллисекундами
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

        // Удаляем дубликаты и сортируем по времени
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

        const uniqueData = Array.from(uniqueDataMap.values());
        uniqueData.sort((a, b) => a.time - b.time);

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

        // Нормализуем цвета (убираем альфа-канал)
        const normalizedLineColor = normalizeColor(lineColor);
        const normalizedAreaTopColor = normalizeColor(areaTopColor);
        const normalizedAreaBottomColor = normalizeColor(areaBottomColor);

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
            lineColor: normalizedLineColor, 
            topColor: normalizedAreaTopColor, 
            bottomColor: normalizedAreaBottomColor 
        });

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

        return () => {
            observer.disconnect();
            chart.remove();
        };
    }, [backgroundColor, textColor, lineColor, areaTopColor, areaBottomColor]);

    // Эффект для обновления данных
    useEffect(() => {
        if (seriesRef.current && data && data.length > 0) {
            const processedData = processChartData(data);
            
            if (processedData.length > 0) {
                console.log('Updating chart with data:', processedData);
                
                // Всегда обновляем данные, не сравниваем с предыдущими
                seriesRef.current.setData(processedData);
                lastDataRef.current = processedData;
                
                if (chartRef.current) {
                    chartRef.current.timeScale().fitContent();
                }
            } else {
                console.log('No valid data to display');
                seriesRef.current.setData([]);
            }
        } else if (seriesRef.current && (!data || data.length === 0)) {
            console.log('Clearing chart data');
            seriesRef.current.setData([]);
        }
    }, [data, isUpdating]);

    // Эффект для обновления цвета при изменении
    useEffect(() => {
        if (seriesRef.current) {
            // Нормализуем цвета (убираем альфа-канал)
            const normalizedLineColor = normalizeColor(lineColor);
            const normalizedAreaTopColor = normalizeColor(areaTopColor);
            const normalizedAreaBottomColor = normalizeColor(areaBottomColor);
            
            seriesRef.current.applyOptions({
                lineColor: normalizedLineColor,
                topColor: normalizedAreaTopColor,
                bottomColor: normalizedAreaBottomColor
            });
        }
    }, [lineColor, areaTopColor, areaBottomColor]);

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
            {(!data || data.length === 0) && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#888',
                    textAlign: 'center'
                }}>
                    <i className="bi bi-bar-chart" style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}></i>
                    <span>Нет данных для отображения</span>
                </div>
            )}
        </div>
    );
};

export default Chart;