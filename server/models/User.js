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
    required: function() {
      return this.provider === 'local';
    }
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  emailVerified: {
    type: Boolean,
    default: false
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
    url: { type: String, default: '' },
    publicId: { type: String, default: '' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const isExternalUrl = (url) => {
  if (typeof url !== 'string') return false;
  return url.includes('cloudinary.com') || url.includes('googleusercontent.com');
};

// Helper to format avatar URL dynamically based on environment BASE_URL
const formatAvatarUrl = (avatar) => {
  if (!avatar) return '';
  let avatarUrl = '';
  if (typeof avatar === 'string') {
    avatarUrl = avatar;
  } else if (avatar && typeof avatar === 'object') {
    avatarUrl = avatar.url || '';
  }

  if (!avatarUrl) return '';
  if (avatarUrl.startsWith('/a/')) {
    return `https://lh3.googleusercontent.com${avatarUrl}`;
  }
  if (isExternalUrl(avatarUrl)) return avatarUrl;
  const envBaseUrl = process.env.BASE_URL;
  if (!envBaseUrl) {
    throw new Error('BASE_URL environment variable is missing');
  }
  const baseUrl = envBaseUrl.replace(/\/$/, '');
  
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    try {
      const url = new URL(avatarUrl);
      if (isExternalUrl(url.href)) return url.href;
      return `${baseUrl}${url.pathname}`;
    } catch (err) {
      return avatarUrl;
    }
  }
  const relativePath = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
  return `${baseUrl}${relativePath}`;
};

// Pre-save hook to migrate/sanitize stored avatar URLs to relative paths
UserSchema.pre('save', function () {
  if (this.avatar && this.avatar.url) {
    if (isExternalUrl(this.avatar.url)) {
      // Keep full Cloudinary/Google URL
      return;
    }
    if (this.avatar.url.startsWith('http://') || this.avatar.url.startsWith('https://')) {
      try {
        const url = new URL(this.avatar.url);
        this.avatar.url = url.pathname;
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

// Run migration to clean legacy localhost URLs once database is connected
mongoose.connection.once('open', async () => {
  try {
    // 1. Convert string avatars to object structure
    const allUsers = await User.find({});
    for (const user of allUsers) {
      if (user.avatar && typeof user.avatar === 'string') {
        user.avatar = {
          url: user.avatar,
          publicId: ''
        };
        await user.save();
        console.log(`[Migration] Converted string avatar to object for user: ${user.email}`);
      }
    }

    // 2. Clean legacy localhost URLs inside avatar.url
    const usersWithLocalhost = await User.find({ 'avatar.url': { $regex: 'localhost' } });
    if (usersWithLocalhost.length > 0) {
      console.log(`[Migration] Found ${usersWithLocalhost.length} users with legacy localhost avatars.`);
      for (const user of usersWithLocalhost) {
        if (user.avatar && user.avatar.url && user.avatar.url.includes('localhost')) {
          try {
            const match = user.avatar.url.match(/https?:\/\/localhost(:\d+)?(\/uploads\/[^\s]+)/);
            if (match && match[2]) {
              user.avatar.url = match[2];
              await user.save();
              console.log(`[Migration] Cleaned user avatar url path for ${user.email} to: ${user.avatar.url}`);
            } else {
              const url = new URL(user.avatar.url);
              user.avatar.url = url.pathname;
              await user.save();
              console.log(`[Migration] Cleaned user avatar url path (URL parse) for ${user.email} to: ${user.avatar.url}`);
            }
          } catch (err) {
            console.error(`[Migration] Failed to migrate avatar for user ${user.email}: ${err.message}`);
          }
        }
      }
      console.log('[Migration] Avatar migration completed.');
    }
  } catch (err) {
    console.error(`[Migration] Error running avatar migration: ${err.message}`);
  }
});

export default User;

