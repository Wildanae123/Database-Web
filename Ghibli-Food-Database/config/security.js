const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const logger = require('./logger');

class SecurityManager {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'ghibli-food-db-secret-key-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    
    // Rate limiting configurations
    this.rateLimits = {
      general: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      }),
      
      strict: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20, // limit each IP to 20 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      }),
      
      login: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 login attempts per windowMs
        message: 'Too many login attempts from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true,
      })
    };
  }

  // Password hashing and verification
  async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(this.bcryptRounds);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      logger.error('Error hashing password:', error);
      throw new Error('Password hashing failed');
    }
  }

  async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Error verifying password:', error);
      return false;
    }
  }

  // JWT token management
  generateToken(payload) {
    try {
      return jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn,
        issuer: 'ghibli-food-database',
        audience: 'ghibli-food-users'
      });
    } catch (error) {
      logger.error('Error generating JWT token:', error);
      throw new Error('Token generation failed');
    }
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'ghibli-food-database',
        audience: 'ghibli-food-users'
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else {
        logger.error('Error verifying JWT token:', error);
        throw new Error('Token verification failed');
      }
    }
  }

  // Middleware for JWT authentication
  authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token is required' });
    }

    try {
      const decoded = this.verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      logger.warn('Authentication failed:', { error: error.message, ip: req.ip });
      return res.status(403).json({ error: error.message });
    }
  }

  // Role-based authorization middleware
  authorizeRoles(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!roles.includes(req.user.role)) {
        logger.warn('Authorization failed:', { 
          userId: req.user.id, 
          userRole: req.user.role, 
          requiredRoles: roles,
          ip: req.ip
        });
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  }

  // Admin-only middleware
  requireAdmin() {
    return this.authorizeRoles('admin');
  }

  // Input validation and sanitization
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password) {
    // Minimum 8 characters, at least one letter and one number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remove potential XSS characters
    return input
      .replace(/[<>]/g, '')
      .trim()
      .substring(0, 1000); // Limit length
  }

  // SQL injection prevention patterns
  isQuerySafe(query) {
    const dangerousPatterns = [
      /drop\s+table/i,
      /drop\s+database/i,
      /truncate/i,
      /alter\s+table.*drop/i,
      /delete\s+from\s+(?!.*where)/i, // DELETE without WHERE
      /update\s+.*set\s+(?!.*where)/i, // UPDATE without WHERE
      /union.*select/i,
      /exec\s*\(/i,
      /sp_executesql/i,
      /xp_cmdshell/i,
      /;\s*(drop|delete|update|insert|create|alter)/i
    ];

    return !dangerousPatterns.some(pattern => pattern.test(query));
  }

  // Audit logging
  logSecurityEvent(event, details, req = null) {
    const logData = {
      event,
      details,
      timestamp: new Date().toISOString(),
      ip: req?.ip,
      userAgent: req?.headers['user-agent'],
      userId: req?.user?.id,
      userRole: req?.user?.role
    };

    logger.warn('Security Event:', logData);
  }

  // Session management
  generateSessionId() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  // Database connection security
  createSecureConnectionConfig() {
    return {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 20, // maximum number of connections
      statement_timeout: 30000,
      query_timeout: 30000
    };
  }

  // Environment validation
  validateEnvironment() {
    const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'ghibli-food-db-secret-key-change-in-production') {
      logger.warn('Using default JWT secret. Please set JWT_SECRET environment variable in production.');
    }
  }

  // Middleware for input validation
  validateInput(schema) {
    return (req, res, next) => {
      try {
        // Basic validation - in production, use a library like Joi or express-validator
        for (const [field, rules] of Object.entries(schema)) {
          const value = req.body[field];
          
          if (rules.required && !value) {
            return res.status(400).json({ error: `${field} is required` });
          }
          
          if (value && rules.email && !this.validateEmail(value)) {
            return res.status(400).json({ error: `${field} must be a valid email` });
          }
          
          if (value && rules.password && !this.validatePassword(value)) {
            return res.status(400).json({ 
              error: `${field} must be at least 8 characters with at least one letter and one number` 
            });
          }
          
          if (value && rules.maxLength && value.length > rules.maxLength) {
            return res.status(400).json({ 
              error: `${field} must be no more than ${rules.maxLength} characters` 
            });
          }
          
          // Sanitize input
          if (typeof value === 'string') {
            req.body[field] = this.sanitizeInput(value);
          }
        }
        
        next();
      } catch (error) {
        logger.error('Input validation error:', error);
        res.status(400).json({ error: 'Invalid input data' });
      }
    };
  }

  // CSRF protection (basic implementation)
  generateCSRFToken() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  verifyCSRFToken(token, expectedToken) {
    return token === expectedToken;
  }
}

module.exports = new SecurityManager();