import axios from 'axios';

const simulateTelemetry = async () => {
  const payload = {
    version: 1,
    gateway_id: "AA:BB:CC:DD:EE:FF",
    session_id: "test-session-123",
    samples: [
      {
        device_id: "AA:BB:CC:DD:EE:11",
        record_seq: 1,
        temperature_c: 38.5,
        acceleration_mg: { x: 20.5, y: -40.1, z: 997.2 }
      }
    ]
  };

  try {
    const response = await axios.post('http://localhost:3000/api/v1/telemetry', payload);
    console.log('Response:', response.data);
  } catch (error: any) {
    console.error('Error sending telemetry:', error.message);
  }
};

simulateTelemetry();
