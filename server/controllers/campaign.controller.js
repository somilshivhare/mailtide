import campaignService from '../services/campaign.service.js';
import CampaignImage from '../models/CampaignImage.js';

class CampaignController {
  async getCampaigns(req, res) {
    const { page = 1, limit = 10, status } = req.query;
    const creatorId = req.user.id;

    try {
      const result = await campaignService.getCampaigns({ creatorId, page, limit, status });
      return res.status(200).json(result);
    } catch (err) {
      console.error(`Get campaigns error: ${err.message}`);
      return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Server error' });
    }
  }

  async createCampaign(req, res) {
    const { title, subject, body } = req.body;
    const creatorId = req.user.id;

    if (!title || !subject || !body) {
      return res.status(400).json({ error: 'Title, subject, and body are required' });
    }

    try {
      const campaign = await campaignService.createCampaign({ creatorId, title, subject, body });
      return res.status(201).json(campaign);
    } catch (err) {
      console.error(`Create campaign error: ${err.message}`);
      return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Server error' });
    }
  }

  async getCampaign(req, res) {
    const { id } = req.params;
    const creatorId = req.user.id;

    try {
      const campaign = await campaignService.getCampaignById({ id, creatorId });
      return res.status(200).json(campaign);
    } catch (err) {
      console.error(`Get campaign detail error: ${err.message}`);
      return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Server error' });
    }
  }

  async updateCampaign(req, res) {
    const { id } = req.params;
    const creatorId = req.user.id;
    const { title, subject, body } = req.body;

    try {
      const campaign = await campaignService.updateCampaign({ id, creatorId, title, subject, body });
      return res.status(200).json(campaign);
    } catch (err) {
      console.error(`Update campaign error: ${err.message}`);
      return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Server error' });
    }
  }

  async deleteCampaign(req, res) {
    const { id } = req.params;
    const creatorId = req.user.id;

    try {
      const result = await campaignService.deleteCampaign({ id, creatorId });
      return res.status(200).json(result);
    } catch (err) {
      console.error(`Delete campaign error: ${err.message}`);
      return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Server error' });
    }
  }

  async sendCampaign(req, res) {
    const { id } = req.params;
    const creatorId = req.user.id;
    const { scheduledAt } = req.body || {};

    try {
      const result = await campaignService.sendCampaign({ id, creatorId, scheduledAt });
      return res.status(200).json(result);
    } catch (err) {
      console.error(`[Diagnostic] Send campaign error: ${err.message}`);
      return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Server error' });
    }
  }

  async cancelCampaign(req, res) {
    const { id } = req.params;
    const creatorId = req.user.id;

    try {
      const result = await campaignService.cancelCampaign({ id, creatorId });
      return res.status(200).json(result);
    } catch (err) {
      console.error(`Cancel campaign error: ${err.message}`);
      return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Server error' });
    }
  }

  async getCampaignStatus(req, res) {
    const { id } = req.params;
    const creatorId = req.user.id;

    try {
      const result = await campaignService.getCampaignStatus({ id, creatorId });
      return res.status(200).json(result);
    } catch (err) {
      console.error(`Get campaign status error: ${err.message}`);
      return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Server error' });
    }
  }

  async resendNonOpeners(req, res) {
    const { id } = req.params;
    const creatorId = req.user.id;

    try {
      const result = await campaignService.resendNonOpeners({ id, creatorId });
      return res.status(200).json(result);
    } catch (err) {
      console.error(`Resend campaign non-openers error: ${err.message}`);
      return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Server error' });
    }
  }

  async uploadImage(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    try {
      const imageUrl = req.file.path || req.file.secure_url || req.file.url;
      const publicId = req.file.filename;

      // Save to database
      await CampaignImage.create({
        url: imageUrl,
        publicId: publicId
      });

      return res.status(200).json({
        url: imageUrl,
        publicId: publicId,
        campaignImage: {
          url: imageUrl,
          publicId: publicId
        }
      });
    } catch (err) {
      console.error(`Upload campaign image controller error: ${err.message}`);
      return res.status(500).json({ error: 'Failed to process campaign image upload' });
    }
  }

  async sendTestEmail(req, res) {
    const { id } = req.params;
    const creatorId = req.user.id;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required for testing' });
    }

    try {
      const result = await campaignService.sendTestEmail({ id, creatorId, email });
      return res.status(200).json(result);
    } catch (err) {
      console.error(`Send test email error: ${err.message}`);
      return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Server error' });
    }
  }
}

export default new CampaignController();
