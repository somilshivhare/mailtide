import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const { JWT_SECRET } = process.env;
if (!JWT_SECRET) {
  console.error('Error: JWT_SECRET env var is missing');
  process.exit(1);
}

const auth = (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const [, token] = authorization.split(' ');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

export default auth;
