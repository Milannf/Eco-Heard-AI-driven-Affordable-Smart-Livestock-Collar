#pragma once

#include "sensor_packet.h"

struct ReceivedPacket {
  uint8_t senderMac[6];
  SensorPacket sensor;
};

void setupTelemetryUploader();
void queueTelemetry(const ReceivedPacket& packet);
