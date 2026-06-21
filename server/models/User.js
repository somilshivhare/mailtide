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

// Run migration to clean legacy localhost URLs once database is connected
mongoose.connection.once('open', async () => {
  try {
    const users = await User.find({ avatar: { $regex: 'localhost' } });
    if (users.length > 0) {
      console.log(`[Migration] Found ${users.length} users with legacy localhost avatars.`);
      for (const user of users) {
        if (user.avatar && user.avatar.includes('localhost')) {
          try {
            const match = user.avatar.match(/https?:\/\/localhost(:\d+)?(\/uploads\/[^\s]+)/);
            if (match && match[2]) {
              user.avatar = match[2];
              await user.save();
              console.log(`[Migration] Cleaned user avatar path for ${user.email} to: ${user.avatar}`);
            } else {
              const url = new URL(user.avatar);
              user.avatar = url.pathname;
              await user.save();
              console.log(`[Migration] Cleaned user avatar path (URL parse) for ${user.email} to: ${user.avatar}`);
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

