import express from 'express';
import { z } from 'zod';
import { analyzeEmailFraud, analyzeUrlFraud, quickCheckSafety } from '../services/engine/emailUrlDetector.js';

export const fraudRouter = express.Router();

const EmailAnalysisSchema = z.object({
  sender: z.string().optional().default(''),
  subject: z.string().optional().default(''),
  body: z.string().optional().default(''),
  rawHeaders: z.string().optional().default('')
});

const UrlAnalysisSchema = z.object({
  url: z.string().min(1, 'Target URL or domain cannot be empty')
});

const QuickCheckSchema = z.object({
  input: z.string().min(1, 'Target input (Email or URL) cannot be empty')
});

/**
 * POST /api/v1/fraud/quick-check
 * Unified safety checker: accepts ANY Email address, Email content, or URL and returns a definitive decision (SAFE / UNSAFE / SUSPICIOUS).
 */
fraudRouter.post('/quick-check', (req, res) => {
  const parseResult = QuickCheckSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      status: 'error',
      error: 'Invalid input payload',
      details: parseResult.error.issues
    });
  }

  const { input } = parseResult.data;
  const result = quickCheckSafety(input);

  return res.json({
    status: 'success',
    report: result
  });
});

/**
 * POST /api/v1/fraud/email/analyze
 * Inspects email envelope, authentication headers, sender domain, and urgency phrasing
 */
fraudRouter.post('/email/analyze', (req, res) => {
  const parseResult = EmailAnalysisSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      status: 'error',
      error: 'Invalid email payload',
      details: parseResult.error.issues
    });
  }

  const { sender, subject, body, rawHeaders } = parseResult.data;
  const result = analyzeEmailFraud(sender, subject, body, rawHeaders);

  return res.json({
    status: 'success',
    report: result
  });
});

/**
 * POST /api/v1/fraud/url/analyze
 * Evaluates target URI for raw IP obfuscation, userinfo redirection, brand spoofing, and abuse TLDs
 */
fraudRouter.post('/url/analyze', (req, res) => {
  const parseResult = UrlAnalysisSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      status: 'error',
      error: 'Invalid URL payload',
      details: parseResult.error.issues
    });
  }

  const { url } = parseResult.data;
  const result = analyzeUrlFraud(url);

  return res.json({
    status: 'success',
    report: result
  });
});
