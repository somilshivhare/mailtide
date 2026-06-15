import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const JobSchema = new Schema({
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true
  },
  subscriberId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscriber',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'skipped'],
    default: 'queued'
  },
  resendId: {
    type: String,
    index: true
  },
  opened: {
    type: Boolean,
    default: false
  },
  clicked: {
    type: Boolean,
    default: false
  },
  bounced: {
    type: Boolean,
    default: false
  },
  openedAt: {
    type: Date
  },
  clickedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Job = models.Job ?? model('Job', JobSchema);

export default Job;
