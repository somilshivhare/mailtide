import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';

const { JWT_SECRET } = process.env;

export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const registerUser = async ({ name, email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const err = new Error('Email already registered');
    err.statusCode = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email: normalizedEmail,
    password: hashedPassword,
    provider: 'local'
  });

  const token = generateToken({ id: user._id, email: user.email });

  return {
    token,
    user: user.toJSON()
  };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    const err = new Error('Invalid credentials');
    err.statusCode = 400;
    throw err;
  }

  // If user signed up via Google only and has no password
  if (!user.password && user.provider === 'google') {
    const err = new Error('Please sign in using Continue with Google');
    err.statusCode = 400;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const err = new Error('Invalid credentials');
    err.statusCode = 450;
    throw err;
  }

  const token = generateToken({ id: user._id, email: user.email });

  return {
    token,
    user: user.toJSON()
  };
};

export const getUserById = async (id) => {
  const user = await User.findById(id).select('-password');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

export const updateUserProfile = async (id, profileData) => {
  const user = await User.findById(id);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  user.name = profileData.name.trim();
  user.company = (profileData.company || '').trim();
  user.website = (profileData.website || '').trim();
  user.industry = (profileData.industry || '').trim();
  user.timezone = (profileData.timezone || 'UTC').trim();
  user.bio = (profileData.bio || '').trim();

  await user.save();
  return user;
};

export const updateUserAvatar = async (id, { path, filename }) => {
  const user = await User.findById(id);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  // Delete old avatar from Cloudinary if it exists
  if (user.avatar && user.avatar.publicId) {
    try {
      await cloudinary.uploader.destroy(user.avatar.publicId);
      console.log(`[Cloudinary] Deleted old avatar: ${user.avatar.publicId}`);
    } catch (destroyErr) {
      console.error(`[Cloudinary] Failed to delete old avatar: ${destroyErr.message}`);
    }
  }

  user.avatar = {
    url: path,
    publicId: filename
  };
  
  await user.save();
  return user;
};
