import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const WebhookEventSchema = new Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '30d' // Automatically clean up after 30 days
  }
});

const WebhookEvent = models.WebhookEvent ?? model('WebhookEvent', WebhookEventSchema);
export default WebhookEvent;
