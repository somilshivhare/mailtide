import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  company: {
    type: String,
    trim: true,
    default: ''
  },
  website: {
    type: String,
    trim: true,
    default: ''
  },
  industry: {
    type: String,
    trim: true,
    default: ''
  },
  timezone: {
    type: String,
    trim: true,
    default: 'UTC'
  },
  bio: {
    type: String,
    trim: true,
    default: ''
  },
  avatar: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Helper to format avatar URL dynamically based on environment BASE_URL
const formatAvatarUrl = (avatar) => {
  if (!avatar) return '';
  const baseUrl = (process.env.BASE_URL || '').replace(/\/$/, '');
  
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    try {
      const url = new URL(avatar);
      return `${baseUrl}${url.pathname}`;
    } catch (err) {
      return avatar;
    }
  }
  const relativePath = avatar.startsWith('/') ? avatar : `/${avatar}`;
  return `${baseUrl}${relativePath}`;
};

// Pre-save hook to migrate/sanitize stored avatar URLs to relative paths
UserSchema.pre('save', function () {
  if (this.avatar) {
    if (this.avatar.startsWith('http://') || this.avatar.startsWith('https://')) {
      try {
        const url = new URL(this.avatar);
        this.avatar = url.pathname;
      } catch (err) {
        // Ignore parsing errors and save as is
      }
    }
  }
});

// Configure JSON and Object serialization to format URLs dynamically
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (ret.avatar) {
      ret.avatar = formatAvatarUrl(ret.avatar);
    }
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

UserSchema.set('toObject', {
  transform: (doc, ret) => {
    if (ret.avatar) {
      ret.avatar = formatAvatarUrl(ret.avatar);
    }
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

const User = models.User ?? model('User', UserSchema);

export default User;
