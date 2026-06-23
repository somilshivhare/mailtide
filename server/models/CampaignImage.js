import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const CampaignImageSchema = new Schema({
  url: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const CampaignImage = models.CampaignImage ?? model('CampaignImage', CampaignImageSchema);

export default CampaignImage;
