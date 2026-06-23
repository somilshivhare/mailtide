import { Router } from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';
import auth from '../middleware/auth.js';
import campaignController from '../controllers/campaign.controller.js';

// Configure multer storage on Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'mailtide/campaigns',
    allowed_formats: ['jpeg', 'png', 'jpg', 'gif', 'webp'],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `campaign-${uniqueSuffix}`;
    }
  }
});

// Configure file filter (images only)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const router = Router();

router.get('/', auth, campaignController.getCampaigns);
router.post('/', auth, campaignController.createCampaign);
router.get('/:id', auth, campaignController.getCampaign);
router.put('/:id', auth, campaignController.updateCampaign);
router.delete('/:id', auth, campaignController.deleteCampaign);
router.post('/:id/send', auth, campaignController.sendCampaign);
router.post('/:id/cancel', auth, campaignController.cancelCampaign);
router.get('/:id/status', auth, campaignController.getCampaignStatus);
router.post('/:id/resend-non-openers', auth, campaignController.resendNonOpeners);

router.post('/upload-image', auth, (req, res, next) => {
  // Check if Cloudinary credentials are configured
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return res.status(500).json({ error: 'Image upload is not configured on the server. Cloudinary credentials are missing.' });
  }
  next();
}, upload.single('image'), campaignController.uploadImage, (err, req, res, next) => {
  // Catch Multer/file filter/file size errors
  console.error('Campaign image upload error:', err);
  let errMsg = err.message || 'An error occurred during file upload';
  if (err.code === 'LIMIT_FILE_SIZE') {
    errMsg = 'File size is too large. Max limit is 5MB.';
  }
  res.status(400).json({ error: errMsg });
});

router.post('/:id/send-test', auth, campaignController.sendTestEmail);

export default router;
