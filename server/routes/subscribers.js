import { Router } from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import crypto from 'crypto';
import { Readable } from 'stream';
import Subscriber from '../models/Subscriber.js';
import Campaign from '../models/Campaign.js';
import Job from '../models/Job.js';
import auth from '../middleware/auth.js';
import emailService from '../services/email/index.js';
import mongoose from 'mongoose';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Email validation helper
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

// Generate unique unsubscribe token
const generateUnsubscribeToken = () => {
  return crypto.randomBytes(24).toString('hex');
};

/**
 * GET /api/subscribers
 * Paginated list of subscribers for the authenticated creator.
 * Filters: status. Search: name/email.
 */
router.get('/', auth, async (req, res) => {
  const { page = 1, limit = 10, search = '', status } = req.query;
  const creatorId = req.user.id;

  try {
    const query = { creatorId };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [subscribers, total] = await Promise.all([
      Subscriber.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Subscriber.countDocuments(query)
    ]);

    res.status(200).json({
      subscribers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error(`Get subscribers error: ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/subscribers/stats
 * Count breakdown of active, unsubscribed, invalid, and total.
 */
router.get('/stats', auth, async (req, res) => {
  const creatorId = req.user.id;

  try {
    const stats = await Subscriber.aggregate([
      { $match: { creatorId: new mongoose.Types.ObjectId(creatorId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          unsubscribed: { $sum: { $cond: [{ $eq: ['$status', 'unsubscribed'] }, 1, 0] } },
          invalid: { $sum: { $cond: [{ $eq: ['$status', 'invalid'] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || { total: 0, active: 0, unsubscribed: 0, invalid: 0 };
    res.status(200).json(result);
  } catch (err) {
    console.error(`Get subscribers stats error: ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/subscribers
 * Add a single subscriber.
 */
router.post('/', auth, async (req, res) => {
  const { name, email } = req.body;
  const creatorId = req.user.id;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Subscriber.findOne({ creatorId, email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: 'Subscriber with this email already exists' });
    }

    const subscriber = await Subscriber.create({
      creatorId,
      name: name.trim(),
      email: normalizedEmail,
      status: 'active',
      unsubscribeToken: generateUnsubscribeToken()
    });

    res.status(201).json(subscriber);
  } catch (err) {
    console.error(`Create subscriber error: ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/subscribers/import
 * CSV bulk subscriber import.
 */
router.post('/import', auth, upload.single('file'), async (req, res) => {
  const creatorId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file uploaded' });
  }

  const results = [];
  const errors = [];
  let imported = 0;
  let skipped = 0;

  try {
    // Read buffer and parse CSV
    const stream = Readable.from(req.file.buffer.toString('utf-8'));
    
    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('data', (row) => {
          // Normalize column headers to lowercase to support flexible CSVs
          const normalizedRow = {};
          Object.keys(row).forEach(key => {
            normalizedRow[key.toLowerCase().trim()] = row[key];
          });
          results.push(normalizedRow);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Prepare bulk operations and de-duplicate within the CSV payload itself
    const validOperations = [];
    const uniqueEmailsInUpload = new Set();

    for (const row of results) {
      const email = row.email || row.mail || row['email address'];
      const name = row.name || row['first name'] || row['full name'] || 'Subscriber';

      if (!email) {
        errors.push({ row, error: 'Email column is missing' });
        skipped++;
        continue;
      }

      const cleanEmail = email.toLowerCase().trim();
      if (!isValidEmail(cleanEmail)) {
        errors.push({ email: cleanEmail, error: 'Invalid email format' });
        skipped++;
        continue;
      }

      // Skip duplicates within the uploaded CSV itself to avoid redundant operations
      if (uniqueEmailsInUpload.has(cleanEmail)) {
        skipped++;
        continue;
      }
      uniqueEmailsInUpload.add(cleanEmail);

      validOperations.push({
        updateOne: {
          filter: { creatorId, email: cleanEmail },
          update: {
            $setOnInsert: {
              creatorId,
              name: name.trim(),
              status: 'active',
              unsubscribeToken: generateUnsubscribeToken(),
              createdAt: new Date()
            }
          },
          upsert: true
        }
      });
    }

    // Process bulk operations in chunks of 2000 to keep connection usage bounded
    const chunkSize = 2000;
    for (let i = 0; i < validOperations.length; i += chunkSize) {
      const chunk = validOperations.slice(i, i + chunkSize);
      const result = await Subscriber.bulkWrite(chunk, { ordered: false });
      imported += result.upsertedCount;
      skipped += result.matchedCount;
    }

    res.status(200).json({
      imported,
      skipped,
      errors
    });
  } catch (err) {
    console.error(`Import subscribers error: ${err.message}`);
    res.status(500).json({ error: 'Server error parsing CSV file' });
  }
});

/**
 * DELETE /api/subscribers/:id
 * Delete a subscriber.
 */
router.delete('/:id', auth, async (req, res) => {
  const creatorId = req.user.id;
  const { id } = req.params;

  try {
    const subscriber = await Subscriber.findOneAndDelete({ _id: id, creatorId });
    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }
    res.status(200).json({ message: 'Subscriber deleted successfully' });
  } catch (err) {
    console.error(`Delete subscriber error: ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/subscribers/:id/send-direct
 * Send a custom direct transactional email to a single subscriber.
 * Auto-creates/reuses a hidden system campaign to track opens/clicks/bounces.
 */
router.post('/:id/send-direct', auth, async (req, res) => {
  const { id } = req.params;
  const { subject, body } = req.body;
  const creatorId = req.user.id;

  if (!subject || !body) {
    return res.status(400).json({ error: 'Subject and body are required' });
  }

  try {
    const subscriber = await Subscriber.findOne({ _id: id, creatorId });
    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    if (subscriber.status !== 'active') {
      return res.status(400).json({ error: 'Cannot send emails to unsubscribed or invalid subscribers' });
    }

    // 1. Find or create the system transactional campaign for this creator
    let campaign = await Campaign.findOne({
      creatorId,
      title: '[System] Direct Transactional Messages'
    });

    if (!campaign) {
      campaign = await Campaign.create({
        creatorId,
        title: '[System] Direct Transactional Messages',
        subject: 'Direct Message',
        body: 'Direct Transactional Message',
        status: 'sent',
        sentAt: new Date()
      });
    }

    // 2. Personalize the body
    let htmlBody = body;
    htmlBody = htmlBody.replace(/\{\{\s*name\s*\}\}/g, subscriber.name);
    htmlBody = htmlBody.replace(/\{\{\s*email\s*\}\}/g, subscriber.email);

    // 3. Build and append unsubscribe link
    const unsubscribeLink = `${process.env.BASE_URL}/api/unsubscribe?token=${subscriber.unsubscribeToken}`;
    const unsubscribeFooter = `
      <br/>
      <hr style="border: 0; border-top: 1px solid #ffffff15; margin: 30px 0 15px 0;" />
      <p style="font-size: 11px; font-family: 'Inter', sans-serif; color: #8888aa; text-align: center; line-height: 1.5;">
        You are receiving this because you subscribed to updates from ${subscriber.name || 'our mailing list'}.<br/>
        If you wish to stop receiving these emails, you can 
        <a href="${unsubscribeLink}" style="color: #7c6aff; text-decoration: underline;">unsubscribe here</a>.
      </p>
    `;

    if (htmlBody.includes('{{unsubscribe}}') || htmlBody.includes('{{ unsubscribe }}')) {
      htmlBody = htmlBody.replace(/\{\{\s*unsubscribe\s*\}\}/g, unsubscribeLink);
    } else {
      htmlBody += unsubscribeFooter;
    }

    // 4. Send the email using the unified EmailService abstraction layer
    const result = await emailService.sendCampaignEmail(subscriber.email, subject.trim(), htmlBody);

    if (!result.success) {
      return res.status(500).json({ error: result.error?.message || 'Failed to send direct email.' });
    }

    // 5. Create a Job record to track delivery status, opens, clicks via webhook
    await Job.create({
      campaignId: campaign._id,
      subscriberId: subscriber._id,
      email: subscriber.email,
      name: subscriber.name,
      status: 'sent',
      resendId: result.messageId
    });

    // Increment campaign counts
    await Campaign.updateOne(
      { _id: campaign._id },
      { $inc: { totalSubscribers: 1, totalSent: 1 } }
    );

    res.status(200).json({ message: 'Direct email sent successfully', messageId: result.messageId });
  } catch (err) {
    console.error(`Send direct email error: ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
