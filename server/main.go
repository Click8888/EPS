package main

import (
	"fmt"
	"log"
	"EPS/database"
	//"github.com/Click8888/ElectricPowerSystem/middleware" что-то интересное
	//"github.com/Click8888/ElectricPowerSystem/routes" Конечные точки запросов
	"time"

	"github.com/gin-contrib/cors"
	"github.com/joho/godotenv"
	"github.com/gin-gonic/gin"
)

func main() {

	dbConfig := database.Config{
		Host:     "localhost",
		Port:     5432,
		User:     "postgres",
		Password: "antivzlom",
		DBName:   "test",
	}

	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	// Инициализация БД
	// Инициализация подключения
	if err := database.InitDB(dbConfig); err != nil {
		log.Fatalf("Ошибка подключения к БД: %v", err)
	}
	defer database.CloseDB()

	// Настройка роутера
	r := gin.Default()

	// Настройка CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.Use(func(c *gin.Context) {
		fmt.Printf("Received %s request for: %s\n", c.Request.Method, c.Request.URL.Path)
		c.Next()
	})

	// Публичные маршруты (без аутентификации)
	// r.POST("/api/register", routes.Register)
	// r.POST("/api/login", routes.Login)

	// Выведите все зарегистрированные маршруты
	fmt.Println("Registered routes:")
	for _, route := range r.Routes() {
		fmt.Printf("%-6s %s\n", route.Method, route.Path)
	}

	// Запуск сервера
	r.Run(":8080")
}