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
    } = props;

    const chartContainerRef = useRef();
    const [chart, setChart] = useState(null);
    const [series, setSeries] = useState(null);
    const [resizeObserver, setResizeObserver] = useState(null);

    // Функция для преобразования времени HH:MM:SS в секунды с начала дня
    const timeToSeconds = (timeString) => {
        if (!timeString) return 0;
        
        const [hours, minutes, seconds] = timeString.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    };

    // Функция для форматирования секунд обратно в HH:MM:SS
    const secondsToTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Эффект для создания графика и обработки ресайза
    useEffect(() => {
        if (!chartContainerRef.current) return;

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
                    // Преобразуем время в секундах обратно в формат HH:MM:SS
                    return secondsToTime(time);
                }
            },
            grid: {
                vertLines: { color: '#444' },
                horzLines: { color: '#444' },
            },
            autoSize: true,
        });

        const newSeries = chart.addSeries(AreaSeries, { 
            lineColor, 
            topColor: areaTopColor, 
            bottomColor: areaBottomColor 
        });

        setChart(chart);
        setSeries(newSeries);

        // Создаем ResizeObserver
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.target === chartContainerRef.current) {
                    chart.applyOptions({
                        width: entry.contentRect.width,
                        height: entry.contentRect.height
                    });
                    chart.timeScale().fitContent();
                }
            }
        });

        observer.observe(chartContainerRef.current);
        setResizeObserver(observer);

        return () => {
            if (observer) {
                observer.disconnect();
            }
            chart.remove();
        };
    }, [backgroundColor, textColor, lineColor, areaTopColor, areaBottomColor]);

    // Эффект для обновления данных
    useEffect(() => {
        if (series && data && data.length > 0) {
            // Преобразуем время HH:MM:SS в секунды для библиотеки и сортируем по времени
            const formattedData = data
                .map(item => ({
                    time: timeToSeconds(item.time), // Преобразуем HH:MM:SS в секунды
                    value: item.value
                }))
                .sort((a, b) => a.time - b.time); // Сортируем по времени в порядке возрастания
            
            series.setData(formattedData);
            
            if (chart) {
                chart.timeScale().fitContent();
            }
        }
    }, [data, series, chart]);

    // Эффект для обработки ресайза окна
    useEffect(() => {
        const handleResize = () => {
            if (chart && chartContainerRef.current) {
                chart.applyOptions({ 
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight
                });
                chart.timeScale().fitContent();
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [chart]);

    return (
        <div
            ref={chartContainerRef}
            style={{ width: '100%', height: '100%', minHeight: '300px' }}
        />
    );
};

export default Chart;