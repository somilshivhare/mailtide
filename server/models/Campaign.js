import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const CampaignSchema = new Schema({
  creatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'queued', 'sending', 'sent', 'failed'],
    default: 'draft'
  },
  totalSubscribers: {
    type: Number,
    default: 0
  },
  totalSent: {
    type: Number,
    default: 0
  },
  totalDelivered: {
    type: Number,
    default: 0
  },
  totalOpened: {
    type: Number,
    default: 0
  },
  totalClicked: {
    type: Number,
    default: 0
  },
  totalBounced: {
    type: Number,
    default: 0
  },
  totalComplained: {
    type: Number,
    default: 0
  },
  totalUnsubscribed: {
    type: Number,
    default: 0
  },
  scheduledAt: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Campaign = models.Campaign ?? model('Campaign', CampaignSchema);

export default Campaign;
