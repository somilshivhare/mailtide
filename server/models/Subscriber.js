import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const SubscriberSchema = new Schema({
  creatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'invalid', 'unsubscribed', 'bounced', 'complained'],
    default: 'active'
  },
  unsubscribeToken: {
    type: String
  },
  softBounces: {
    type: Number,
    default: 0
  },
  bounced: {
    type: Boolean,
    default: false
  },
  unsubscribed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

SubscriberSchema.index({ creatorId: 1, email: 1 }, { unique: true });

const Subscriber = models.Subscriber ?? model('Subscriber', SubscriberSchema);

export default Subscriber;
