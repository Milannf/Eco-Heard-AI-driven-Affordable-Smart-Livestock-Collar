#pragma once
// Salin ke gateway_config.h, lalu isi jaringan tujuan dan IP komputer server.
// Router, A dan B harus memakai kanal 2.4 GHz yang sama di sensor_packet.h.
constexpr char GATEWAY_WIFI_SSID[] = "";
constexpr char GATEWAY_WIFI_PASSWORD[] = "";
constexpr bool GATEWAY_LOCAL_CSV_ONLY = true;
constexpr char GATEWAY_API_URL[] = "http://IP_KOMPUTER:3001/api/telemetry/batch";
constexpr char GATEWAY_ROOT_CA[] = "";
