import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import auth from '../middleware/auth.js';
import campaignController from '../controllers/campaign.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
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

router.post('/upload-image', auth, upload.single('image'), campaignController.uploadImage, (err, req, res, next) => {
  // Catch Multer/file filter/file size errors
  res.status(400).json({ error: err.message });
});

router.post('/:id/send-test', auth, campaignController.sendTestEmail);

export default router;
