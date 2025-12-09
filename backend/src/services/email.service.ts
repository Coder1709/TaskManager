import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { config } from '../config';
import logger from '../config/logger';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    constructor() {
        if (config.email.provider === 'sendgrid' && config.email.sendgrid.apiKey) {
            sgMail.setApiKey(config.email.sendgrid.apiKey);
            logger.info('Email service initialized with SendGrid');
        } else if (config.email.provider === 'smtp') {
            this.transporter = nodemailer.createTransport({
                host: config.email.smtp.host,
                port: config.email.smtp.port,
                secure: config.email.smtp.secure,
                auth: {
                    user: config.email.smtp.user,
                    pass: config.email.smtp.pass,
                },
            });
            logger.info('Email service initialized with SMTP');
        } else {
            logger.warn('No email provider configured - emails will be logged only');
        }
    }

    async send(options: EmailOptions): Promise<boolean> {
        const { to, subject, html, text } = options;

        // In development without credentials, just log
        if (config.env === 'development' && !config.email.sendgrid.apiKey && !config.email.smtp.user) {
            logger.info(`[DEV EMAIL] To: ${to}`);
            logger.info(`[DEV EMAIL] Subject: ${subject}`);
            logger.info(`[DEV EMAIL] Content: ${text || html}`);
            return true;
        }

        try {
            if (config.email.provider === 'sendgrid') {
                await sgMail.send({
                    to,
                    from: config.email.from,
                    subject,
                    html,
                    text: text || html.replace(/<[^>]*>/g, ''),
                });
            } else if (this.transporter) {
                await this.transporter.sendMail({
                    from: config.email.from,
                    to,
                    subject,
                    html,
                    text: text || html.replace(/<[^>]*>/g, ''),
                });
            } else {
                logger.warn(`Email not sent (no provider): ${to} - ${subject}`);
                return false;
            }

            logger.info(`Email sent to ${to}: ${subject}`);
            return true;
        } catch (error) {
            logger.error(`Failed to send email to ${to}:`, error);
            return false;
        }
    }

    async sendOtp(email: string, otp: string, name: string): Promise<boolean> {
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Lite Jira</h1>
              <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 14px;">Task Management System</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px; font-weight: 600;">Verify Your Email</h2>
              <p style="margin: 0 0 20px; color: #64748b; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
              <p style="margin: 0 0 30px; color: #64748b; font-size: 16px; line-height: 1.6;">Thank you for signing up! Please use the following verification code to complete your registration:</p>
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px dashed #cbd5e1; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #6366f1;">${otp}</span>
              </div>
              <p style="margin: 0 0 10px; color: #64748b; font-size: 14px;">This code will expire in <strong>10 minutes</strong>.</p>
              <p style="margin: 0; color: #94a3b8; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">&copy; 2024 Lite Jira. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

        return this.send({
            to: email,
            subject: 'Verify Your Email - Lite Jira',
            html,
            text: `Hi ${name},\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`,
        });
    }

    async sendDailySummary(
        email: string,
        name: string,
        summary: string,
        tasks: Array<{ title: string; status: string; project: string; id: string }>
    ): Promise<boolean> {
        const taskRows = tasks
            .map(
                (t) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${t.title}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><span style="padding: 4px 8px; border-radius: 4px; background-color: #e0e7ff; color: #4f46e5; font-size: 12px; font-weight: 500;">${t.status}</span></td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${t.project}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><a href="${config.frontend.url}/tasks/${t.id}" style="color: #6366f1; text-decoration: none;">View</a></td>
        </tr>
      `
            )
            .join('');

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Task Summary</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 700px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Daily Summary</h1>
              <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 14px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #64748b; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-left: 4px solid #6366f1; border-radius: 0 8px 8px 0; padding: 20px; margin-bottom: 30px;">
                <p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.7;">${summary}</p>
              </div>
              <h3 style="margin: 0 0 15px; color: #1e293b; font-size: 18px; font-weight: 600;">Your Tasks</h3>
              <table style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 12px; text-align: left; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Task</th>
                    <th style="padding: 12px; text-align: left; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Status</th>
                    <th style="padding: 12px; text-align: left; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Project</th>
                    <th style="padding: 12px; text-align: left; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Link</th>
                  </tr>
                </thead>
                <tbody>
                  ${taskRows || '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #94a3b8;">No tasks for this period</td></tr>'}
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
              <a href="${config.frontend.url}/reports" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; margin-bottom: 15px;">View Full Report</a>
              <p style="margin: 15px 0 0; color: #94a3b8; font-size: 12px;">&copy; 2024 Lite Jira. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

        return this.send({
            to: email,
            subject: `Daily Task Summary - ${new Date().toLocaleDateString()}`,
            html,
        });
    }

    async sendWeeklySummary(
        email: string,
        name: string,
        summary: string,
        stats: { created: number; completed: number; inProgress: number; overdue: number },
        tasks: Array<{ title: string; status: string; project: string; id: string }>
    ): Promise<boolean> {
        const taskRows = tasks
            .slice(0, 20) // Limit to 20 tasks in email
            .map(
                (t) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${t.title}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><span style="padding: 4px 8px; border-radius: 4px; background-color: #e0e7ff; color: #4f46e5; font-size: 12px; font-weight: 500;">${t.status}</span></td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${t.project}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><a href="${config.frontend.url}/tasks/${t.id}" style="color: #6366f1; text-decoration: none;">View</a></td>
        </tr>
      `
            )
            .join('');

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Task Summary</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 700px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Weekly Summary</h1>
              <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 14px;">Week of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #64748b; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
              
              <!-- Stats Cards -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 5px;">
                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 20px; text-align: center;">
                      <div style="color: #ffffff; font-size: 28px; font-weight: 700;">${stats.completed}</div>
                      <div style="color: #d1fae5; font-size: 12px; text-transform: uppercase;">Completed</div>
                    </div>
                  </td>
                  <td style="padding: 5px;">
                    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 8px; padding: 20px; text-align: center;">
                      <div style="color: #ffffff; font-size: 28px; font-weight: 700;">${stats.created}</div>
                      <div style="color: #e0e7ff; font-size: 12px; text-transform: uppercase;">Created</div>
                    </div>
                  </td>
                  <td style="padding: 5px;">
                    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 8px; padding: 20px; text-align: center;">
                      <div style="color: #ffffff; font-size: 28px; font-weight: 700;">${stats.inProgress}</div>
                      <div style="color: #fef3c7; font-size: 12px; text-transform: uppercase;">In Progress</div>
                    </div>
                  </td>
                  <td style="padding: 5px;">
                    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 8px; padding: 20px; text-align: center;">
                      <div style="color: #ffffff; font-size: 28px; font-weight: 700;">${stats.overdue}</div>
                      <div style="color: #fee2e2; font-size: 12px; text-transform: uppercase;">Overdue</div>
                    </div>
                  </td>
                </tr>
              </table>

              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-left: 4px solid #6366f1; border-radius: 0 8px 8px 0; padding: 20px; margin-bottom: 30px;">
                <p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.7;">${summary}</p>
              </div>
              
              <h3 style="margin: 0 0 15px; color: #1e293b; font-size: 18px; font-weight: 600;">Task Overview</h3>
              <table style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 12px; text-align: left; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Task</th>
                    <th style="padding: 12px; text-align: left; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Status</th>
                    <th style="padding: 12px; text-align: left; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Project</th>
                    <th style="padding: 12px; text-align: left; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Link</th>
                  </tr>
                </thead>
                <tbody>
                  ${taskRows || '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #94a3b8;">No tasks for this period</td></tr>'}
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
              <a href="${config.frontend.url}/reports" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; margin-bottom: 15px;">View Full Report</a>
              <p style="margin: 15px 0 0; color: #94a3b8; font-size: 12px;">&copy; 2024 Lite Jira. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

        return this.send({
            to: email,
            subject: `Weekly Task Summary - Week of ${new Date().toLocaleDateString()}`,
            html,
        });
    }
}

export const emailService = new EmailService();
