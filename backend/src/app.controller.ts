import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return {
      status: 'online',
      message: "Local's Cut Barber Booking API is running successfully!",
      docs: '/api/docs',
      timestamp: new Date().toISOString(),
    };
  }
}
