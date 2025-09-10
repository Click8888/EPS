package routes

import (
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"EPS/database" // Импортируйте ваш пакет database

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var (
	generationMutex sync.Mutex
	isGenerating    bool
	stopGeneration  chan bool
)

type GenerationStatus struct {
	IsGenerating bool   `json:"isGenerating"`
	Status       string `json:"status"`
	Message      string `json:"message"`
}

// StartGenerationHandler запускает генерацию данных
func StartGenerationHandler(c *gin.Context) {
	fmt.Println("123")
	generationMutex.Lock()
	defer generationMutex.Unlock()

	if isGenerating {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Генерация уже запущена",
		})
		return
	}

	// Проверяем доступность БД
	if database.DB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Подключение к БД не инициализировано",
		})
		return
	}

	// Запускаем генерацию в отдельной горутине
	stopGeneration = make(chan bool)
	isGenerating = true

	go generateCurrentMeasurements(database.DB, stopGeneration)

	c.JSON(http.StatusOK, gin.H{
		"message": "Генерация данных запущена",
		"status":  "running",
	})
}

// StopGenerationHandler останавливает генерацию данных
func StopGenerationHandler(c *gin.Context) {
	generationMutex.Lock()
	defer generationMutex.Unlock()

	if !isGenerating {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Генерация не запущена",
		})
		return
	}

	// Отправляем сигнал остановки
	close(stopGeneration)
	isGenerating = false

	c.JSON(http.StatusOK, gin.H{
		"message": "Генерация данных остановлена",
		"status":  "stopped",
	})
}

// GenerationStatusHandler возвращает статус генерации
func GenerationStatusHandler(c *gin.Context) {
	generationMutex.Lock()
	defer generationMutex.Unlock()

	status := "stopped"
	if isGenerating {
		status = "running"
	}

	c.JSON(http.StatusOK, gin.H{
		"isGenerating": isGenerating,
		"status":       status,
		"message":      "Текущий статус генерации",
	})
}

// Функция генерации данных (адаптированная из generate.go)
func generateCurrentMeasurements(db *gorm.DB, stopChan chan bool) {
	ticker := time.NewTicker(25 * time.Millisecond)
	defer ticker.Stop()

	// Основной диапазон нормальных значений тока (1.8 - 2.6)
	baseMinCurrent := 1.8
	baseMaxCurrent := 2.6

	// Основной диапазон нормальных значений напряжения (2 - 10)
	baseMinVoltage := 2.0
	baseMaxVoltage := 10.0

	// Аномальные значения тока (перегрузки)
	currentOverloadValues := []float64{9.123, 0.045, 8.765, 0.123, 7.891, 0.234, 10.456, 0.067}

	// Аномальные значения напряжения (скачки/просадки)
	voltageOverloadValues := []float64{0.5, 15.0, 0.1, 18.0, 0.05, 20.0, 0.01, 25.0}

	counter := 1
	overloadCounter := 0
	currentTrendDirection := 1
	currentTrendValue := (baseMinCurrent + baseMaxCurrent) / 2
	currentTrendDuration := 0

	voltageTrendDirection := 1
	voltageTrendValue := (baseMinVoltage + baseMaxVoltage) / 2
	voltageTrendDuration := 0

	for {
		select {
		case <-stopChan:
			log.Println("Генерация данных остановлена")
			return
		case <-ticker.C:
			// Генерация данных
			data := generateDataPoint(counter, baseMinCurrent, baseMaxCurrent, baseMinVoltage, baseMaxVoltage,
				currentOverloadValues, voltageOverloadValues, &overloadCounter,
				&currentTrendDirection, &currentTrendValue, &currentTrendDuration,
				&voltageTrendDirection, &voltageTrendValue, &voltageTrendDuration)

			// Вставка в базу данных
			err := insertData(db, data)
			if err != nil {
				log.Printf("Ошибка вставки данных: %v", err)
				continue
			}

			if counter%100 == 0 {
				log.Printf("Вставлено %d записей. Ток: %.3fA, Напряжение: %.3fV, Перегрузка: %v",
					counter, data.CurrentValue, data.VoltageValue, data.IsOverload)
			}
			counter++
		}
	}
}

// Структура для данных измерений
type CurrentMeasurement struct {
	ID              int       `json:"id"`
	MeasurementTime time.Time `json:"measurement_time"`
	CurrentValue    float64   `json:"current_value"`
	VoltageValue    float64   `json:"voltage_value"`
	CircuitID       string    `json:"circuit_id"`
	SensorModel     string    `json:"sensor_model"`
	IsOverload      bool      `json:"is_overload"`
}

// Функция генерации точки данных
func generateDataPoint(counter int, baseMinCurrent, baseMaxCurrent, baseMinVoltage, baseMaxVoltage float64,
	currentOverloadValues, voltageOverloadValues []float64, overloadCounter *int,
	currentTrendDirection *int, currentTrendValue *float64, currentTrendDuration *int,
	voltageTrendDirection *int, voltageTrendValue *float64, voltageTrendDuration *int) CurrentMeasurement {

	now := time.Now()
	isOverload := false
	var currentVal float64
	var voltageVal float64

	// Обработка тренда для тока
	*currentTrendDuration--
	if *currentTrendDuration <= 0 {
		if rand.Float64() < 0.3 {
			*currentTrendDirection = -*currentTrendDirection
		}
		*currentTrendDuration = 50 + rand.Intn(150)
	}

	// Обработка тренда для напряжения
	*voltageTrendDuration--
	if *voltageTrendDuration <= 0 {
		if rand.Float64() < 0.3 {
			*voltageTrendDirection = -*voltageTrendDirection
		}
		*voltageTrendDuration = 50 + rand.Intn(150)
	}

	// Определяем, будет ли это перегрузка
	*overloadCounter++
	overloadChance := 0.08
	if rand.Float64() < overloadChance {
		isOverload = true
		currentVal = currentOverloadValues[rand.Intn(len(currentOverloadValues))]
		voltageVal = voltageOverloadValues[rand.Intn(len(voltageOverloadValues))]
		*overloadCounter = 0

		// После перегрузки сбрасываем тренды
		*currentTrendValue = (baseMinCurrent + baseMaxCurrent) / 2
		*currentTrendDirection = 1
		*currentTrendDuration = 50 + rand.Intn(150)

		*voltageTrendValue = (baseMinVoltage + baseMaxVoltage) / 2
		*voltageTrendDirection = 1
		*voltageTrendDuration = 50 + rand.Intn(150)
	} else {
		// Генерация нормального значения тока
		currentTrendStep := 0.005 * float64(*currentTrendDirection)
		*currentTrendValue += currentTrendStep

		if *currentTrendValue < baseMinCurrent {
			*currentTrendValue = baseMinCurrent
			*currentTrendDirection = 1
		}
		if *currentTrendValue > baseMaxCurrent {
			*currentTrendValue = baseMaxCurrent
			*currentTrendDirection = -1
		}

		currentNoise := (rand.Float64() - 0.5) * 0.1
		currentVal = *currentTrendValue + currentNoise

		if rand.Float64() < 0.05 {
			spike := rand.Float64() * 0.3
			if rand.Intn(2) == 0 {
				currentVal += spike
			} else {
				currentVal -= spike
			}
		}

		currentVal += rand.NormFloat64() * 0.02

		if currentVal < baseMinCurrent-0.2 {
			currentVal = baseMinCurrent - 0.2 + rand.Float64()*0.1
		}
		if currentVal > baseMaxCurrent+0.2 {
			currentVal = baseMaxCurrent + 0.2 - rand.Float64()*0.1
		}

		// Генерация нормального значения напряжения (2-10 В)
		voltageTrendStep := 0.02 * float64(*voltageTrendDirection)
		*voltageTrendValue += voltageTrendStep

		if *voltageTrendValue < baseMinVoltage {
			*voltageTrendValue = baseMinVoltage
			*voltageTrendDirection = 1
		}
		if *voltageTrendValue > baseMaxVoltage {
			*voltageTrendValue = baseMaxVoltage
			*voltageTrendDirection = -1
		}

		voltageNoise := (rand.Float64() - 0.5) * 0.1
		voltageVal = *voltageTrendValue + voltageNoise

		if rand.Float64() < 0.05 {
			spike := rand.Float64() * 0.5
			if rand.Intn(2) == 0 {
				voltageVal += spike
			} else {
				voltageVal -= spike
			}
		}

		voltageVal += rand.NormFloat64() * 0.05

		if voltageVal < baseMinVoltage-0.3 {
			voltageVal = baseMinVoltage - 0.3 + rand.Float64()*0.15
		}
		if voltageVal > baseMaxVoltage+0.3 {
			voltageVal = baseMaxVoltage + 0.3 - rand.Float64()*0.15
		}
	}

	// Округляем значения
	currentVal = math.Round(currentVal*1000) / 1000
	voltageVal = math.Round(voltageVal*1000) / 1000

	return CurrentMeasurement{
		ID:              counter,
		MeasurementTime: now,
		CurrentValue:    currentVal,
		VoltageValue:    voltageVal,
		CircuitID:       "circuit_B",
		SensorModel:     "I-Sensor-Pro",
		IsOverload:      isOverload,
	}
}

// Вставка данных в БД с использованием GORM
func insertData(db *gorm.DB, data CurrentMeasurement) error {
	// Создаем структуру для вставки
	measurement := map[string]interface{}{
		"measurement_time": formatTimeWithMilliseconds(data.MeasurementTime),
		"current_value":    data.CurrentValue,
		"voltage_value":    data.VoltageValue,
		"circuit_id":       data.CircuitID,
		"sensor_model":     data.SensorModel,
		"is_overload":      data.IsOverload,
	}

	// Выполняем вставку
	result := db.Table("current_measurements").Create(measurement)
	return result.Error
}

// Функция для форматирования времени с миллисекундами
func formatTimeWithMilliseconds(t time.Time) string {
	return t.Format("15:04:05.000")
}