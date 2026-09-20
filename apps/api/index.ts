import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
app.use(express.json());

const TelemetrySchema = z.object({
  version: z.number(),
  gateway_id: z.string(),
  session_id: z.string(),
  samples: z.array(z.object({
    device_id: z.string(),
    record_seq: z.number(),
    temperature_c: z.number(),
    acceleration_mg: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    }),
  })),
});

let clients: any[] = [];

app.get('/api/v1/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  clients.push(res);
  req.on('close', () => clients = clients.filter(c => c !== res));
});

app.post('/api/v1/telemetry', async (req, res) => {
  try {
    const data = TelemetrySchema.parse(req.body);
    
    for (const sample of data.samples) {
      await prisma.telemetry.create({
        data: {
          deviceId: sample.device_id,
          gatewayId: data.gateway_id,
          sessionId: data.session_id,
          recordSeq: sample.record_seq,
          temperatureC: sample.temperature_c,
          accelerationX: sample.acceleration_mg.x,
          accelerationY: sample.acceleration_mg.y,
          accelerationZ: sample.acceleration_mg.z,
        }
      }).catch((e: any) => console.error("Skip duplicate:", e));

      // Broadcast update
      clients.forEach(client => client.write(`data: ${JSON.stringify(sample)}\n\n`));
    }
    
    res.status(200).json({ success: true, received: data.samples.length });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Invalid payload' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
