import { Router } from 'express';
import passport from 'passport';
import * as authController from '../controllers/auth.controller.js';
import authMiddleware from '../middleware/auth.js';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// Configure multer storage for avatars on Cloudinary (keep existing configuration)
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'mailtide/avatars',
    allowed_formats: ['jpeg', 'png', 'jpg', 'gif', 'webp'],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `avatar-${uniqueSuffix}`;
    }
  }
});

const avatarFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'), false);
  }
};

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

const router = Router();

// Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.put('/profile', authMiddleware, authController.updateProfile);

router.post('/profile/avatar', 
  authMiddleware, 
  authController.checkCloudinaryConfig, 
  uploadAvatar.single('avatar'), 
  authController.uploadAvatar, 
  authController.handleAvatarUploadError
);

router.post('/logout', authController.logout);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login?error=oauth_failed', session: false }),
  authController.googleCallback
);

export default router;
