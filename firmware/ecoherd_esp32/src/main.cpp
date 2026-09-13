#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

const int LED_PIN = LED_BUILTIN;

// Nyimpen suhu saat ini, defaultnya 5 derajat ya
int currentTemperature = 5; 

TaskHandle_t xLedTaskHandle    = NULL;
TaskHandle_t xSerialTaskHandle = NULL;

void vSerialTask(void* pv) {
    String line;
    Serial.setTimeout(5);
    TickType_t xLastWakeTime = xTaskGetTickCount();
    const TickType_t xPeriod = pdMS_TO_TICKS(50); 

    while (true) {
        // Ngecek kalo lo masukin input di Serial
        if (Serial.available() > 0) {
            line = Serial.readStringUntil('\n');
            line.trim();

            if (line.startsWith("Temperature:")) {
                String tempString = line.substring(12);
                int tempValue = tempString.toInt();

                // Kalo lo masukin suhu ngaco, gue pangkas ke batas aman di sini
                if (tempValue < -20) {
                    tempValue = -20;
                } else if (tempValue > 50) {
                    tempValue = 50;
                }
                
                // Update suhu globalnya
                currentTemperature = tempValue; 
            }
        }
        // Jeda dikit biar task ini ga rakus CPU
        vTaskDelayUntil(&xLastWakeTime, xPeriod);
    }
}

void vLedTask(void* pv) {
    pinMode(LED_PIN, OUTPUT);
    int lastTemperature = -999;
    uint32_t currentInterval = 1000;
    String currentStatus = "NORMAL";

    while (true) {
        // Tentu-in seberapa cepet LED-nya mesti kedap-kedip
        if (currentTemperature <= 5) {
            currentStatus = "NORMAL";
            currentInterval = 1000;
        } else if (currentTemperature > 5 && currentTemperature < 15) {
            currentStatus = "WARNING";
            currentInterval = 500;
        } else {
            currentStatus = "CRITICAL";
            currentInterval = 200;
        }

        // Gue nge-print ke Serial kalo suhu berubah aja, biar ga nyepam
        if (currentTemperature != lastTemperature) {
            Serial.printf("[%s] Temperature=%d C | LED interval=%lu ms\n", 
                          currentStatus.c_str(), 
                          currentTemperature, 
                          (unsigned long)currentInterval);
            lastTemperature = currentTemperature;
        }

        // Eksekusi nyala-mati LED
        digitalWrite(LED_PIN, HIGH);
        vTaskDelay(pdMS_TO_TICKS(currentInterval / 2));
        digitalWrite(LED_PIN, LOW);
        vTaskDelay(pdMS_TO_TICKS(currentInterval / 2));
    }
}

void setup() {
    Serial.begin(115200);
    delay(100);

    const uint32_t STACK_WORDS = 2048;

    // Bikin tasknya. Serial gue kasih prioritas lebih gede (2) daripada LED (1)
    xTaskCreate(vSerialTask, "SerialTask", STACK_WORDS, NULL, 2, &xSerialTaskHandle);
    xTaskCreate(vLedTask, "LedTask", STACK_WORDS, NULL, 1, &xLedTaskHandle);
}

void loop() {
    // Kosongin aja bro, kan kita udah handle semuanya di FreeRTOS
}
