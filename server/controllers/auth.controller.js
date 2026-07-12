import * as authService from '../services/auth.service.js';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const result = await authService.registerUser({ name, email, password });
    
    res.cookie('token', result.token, cookieOptions);
    return res.status(201).json(result);
  } catch (err) {
    console.error(`Register controller error: ${err.message}`);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await authService.loginUser({ email, password });
    
    res.cookie('token', result.token, cookieOptions);
    return res.status(200).json(result);
  } catch (err) {
    console.error(`Login controller error: ${err.message}`);
    return res.status(err.statusCode || 400).json({ error: err.message || 'Invalid credentials' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.id);
    return res.status(200).json(user);
  } catch (err) {
    console.error(`GetMe controller error: ${err.message}`);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  }
};

export const updateProfile = async (req, res) => {
  const { name, company, website, industry, timezone, bio } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const user = await authService.updateUserProfile(req.user.id, {
      name, company, website, industry, timezone, bio
    });
    return res.status(200).json(user);
  } catch (err) {
    console.error(`UpdateProfile controller error: ${err.message}`);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  }
};

export const checkCloudinaryConfig = (req, res, next) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return res.status(500).json({ error: 'Image upload is not configured on the server. Cloudinary credentials are missing.' });
  }
  next();
};

export const uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  try {
    const user = await authService.updateUserAvatar(req.user.id, {
      path: req.file.path || req.file.secure_url || req.file.url,
      filename: req.file.filename
    });
    return res.status(200).json(user);
  } catch (err) {
    console.error(`UploadAvatar controller error: ${err.message}`);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  }
};

export const handleAvatarUploadError = (err, req, res, next) => {
  console.error('Avatar upload error:', err);
  let errMsg = err.message || 'An error occurred during file upload';
  if (err.code === 'LIMIT_FILE_SIZE') {
    errMsg = 'File size is too large. Max limit is 2MB.';
  }
  return res.status(400).json({ error: errMsg });
};

export const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  return res.status(200).json({ message: 'Logged out successfully' });
};

export const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=auth_failed`);
    }

    const token = authService.generateToken({ id: user._id, email: user.email });
    res.cookie('token', token, cookieOptions);
    
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/`);
  } catch (err) {
    console.error(`Google callback controller error: ${err.message}`);
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=server_error`);
  }
};
