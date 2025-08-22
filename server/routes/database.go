package routes

import (
	"net/http"
	"EPS/database"
	"EPS/models"

	"github.com/gin-gonic/gin"
)

func GetDatabases(c *gin.Context) {

	// userID := c.MustGet("userID").(uint) // Получаем ID пользователя из middleware

	var databases []models.Current_measurements
	if err := database.DB.Find(&databases).Error; err != nil { 	//запись данных из БД в переменную databases
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch databases"})
		return
	}

	// Формируем ответ с дополнительной информацией
	type Measurements struct {
		ID                uint 
		Measurement_time  string
		Current_value     float32
		Circuit_id 				string
		Sensor_model 			string
		Is_overload    		bool 
	}

	var result []Measurements
	for _, db := range databases {
		// var creator models.User
		// database.DB.First(&creator, db.ID_creator)

		result = append(result, Measurements{
			ID:        					db.ID,
			Measurement_time:   db.Measurement_time,
			Current_value: 			db.Current_value,
		})
	}

	c.JSON(http.StatusOK, gin.H{"databases": result})

}

