/**
 * Email service for sending campaigns
 * Handles SMTP configuration and email delivery
 */
import nodemailer from 'nodemailer';
import { prisma } from './database.js';
import type { Campaign, Recipient } from '../../generated/prisma/index.js';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  campaignId?: string;
  recipientId?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig;

  constructor() {
    this.config = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    };
    
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        tls: {
          rejectUnauthorized: false
        }
      });
      
      console.log('Email transporter initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('Email configuration is valid');
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return false;
    }
  }

  /**
   * Send a single email
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    try {
      const mailOptions = {
        from: `"${process.env.FROM_NAME || 'Email Marketing'}" <${process.env.FROM_EMAIL || this.config.auth.user}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        subject: options.subject,
        html: this.addTrackingPixel(options.html, options.campaignId, options.recipientId),
        text: options.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${options.to}:`, result.messageId);
      
      // Update campaign recipient status
      if (options.campaignId && options.recipientId) {
        await this.updateCampaignRecipientStatus(
          options.campaignId,
          options.recipientId,
          'sent'
        );
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to send email to ${options.to}:`, error);
      
      // Update campaign recipient status to failed
      if (options.campaignId && options.recipientId) {
        await this.updateCampaignRecipientStatus(
          options.campaignId,
          options.recipientId,
          'failed'
        );
      }
      
      return false;
    }
  }

  /**
   * Send campaign to multiple recipients
   */
  async sendCampaign(campaignId: string): Promise<{ sent: number; failed: number }> {
    try {
      // Get campaign details
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          template: true,
          campaignRecipients: {
            include: {
              recipient: true
            },
            where: {
              status: 'pending'
            }
          }
        }
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status !== 'scheduled' && campaign.status !== 'draft') {
        throw new Error('Campaign cannot be sent in current status');
      }

      let sent = 0;
      let failed = 0;

      // Update campaign status to sending
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'sending',
          sentAt: new Date()
        }
      });

      // Send emails to all recipients
      for (const campaignRecipient of campaign.campaignRecipients) {
        const recipient = campaignRecipient.recipient;
        
        // Skip unsubscribed or bounced recipients
        if (recipient.status !== 'active') {
          await this.updateCampaignRecipientStatus(
            campaignId,
            recipient.id,
            'skipped'
          );
          continue;
        }

        // Use template content if available, otherwise use campaign content
        const emailContent = campaign.template ? campaign.template.content : campaign.content;
        const emailSubject = campaign.template ? campaign.template.subject : campaign.subject;
        
        const personalizedContent = this.personalizeContent(
          emailContent,
          recipient
        );
        
        const personalizedSubject = this.personalizeContent(
          emailSubject,
          recipient
        );

        const emailSent = await this.sendEmail({
          to: recipient.email,
          subject: personalizedSubject,
          html: personalizedContent,
          campaignId,
          recipientId: recipient.id
        });

        if (emailSent) {
          sent++;
        } else {
          failed++;
        }

        // Add small delay to avoid overwhelming SMTP server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update campaign status to sent
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'sent'
        }
      });

      console.log(`Campaign ${campaignId} completed: ${sent} sent, ${failed} failed`);
      return { sent, failed };
    } catch (error) {
      console.error(`Failed to send campaign ${campaignId}:`, error);
      
      // Update campaign status to failed
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'failed'
        }
      });
      
      throw error;
    }
  }

  /**
   * Personalize email content with recipient data
   */
  private personalizeContent(content: string, recipient: Recipient): string {
    let personalizedContent = content;
    
    // Replace common placeholders
    personalizedContent = personalizedContent.replace(/{{firstName}}/g, recipient.firstName || '');
    personalizedContent = personalizedContent.replace(/{{lastName}}/g, recipient.lastName || '');
    personalizedContent = personalizedContent.replace(/{{email}}/g, recipient.email);
    personalizedContent = personalizedContent.replace(/{{fullName}}/g, 
      `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim());
    
    // Add unsubscribe link
    const unsubscribeUrl = `${process.env.APP_URL || 'http://localhost:3000'}/unsubscribe?token=${recipient.id}`;
    personalizedContent = personalizedContent.replace(/{{unsubscribeUrl}}/g, unsubscribeUrl);
    
    return personalizedContent;
  }

  /**
   * Add tracking pixel to email content
   */
  private addTrackingPixel(content: string, campaignId?: string, recipientId?: string): string {
    if (!campaignId || !recipientId) {
      return content;
    }

    const trackingUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/analytics/track?campaignId=${campaignId}&recipientId=${recipientId}&eventType=open`;
    const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
    
    // Add tracking pixel before closing body tag
    if (content.includes('</body>')) {
      return content.replace('</body>', `${trackingPixel}</body>`);
    } else {
      return content + trackingPixel;
    }
  }

  /**
   * Update campaign recipient status
   */
  private async updateCampaignRecipientStatus(
    campaignId: string,
    recipientId: string,
    status: 'pending' | 'sent' | 'failed' | 'skipped'
  ): Promise<void> {
    try {
      await prisma.campaignRecipient.updateMany({
        where: {
          campaignId,
          recipientId
        },
        data: {
          status,
          sentAt: status === 'sent' ? new Date() : undefined
        }
      });
    } catch (error) {
      console.error('Failed to update campaign recipient status:', error);
    }
  }

  /**
   * Send email using template data
   */
  async sendEmailFromTemplate(templateData: {
    toEmails?: string[];
    ccEmails?: string[];
    bccEmails?: string[];
    fromEmail?: string;
    subject: string;
    content: string;
    campaignId?: string;
    recipientId?: string;
  }): Promise<boolean> {
    const mailOptions: any = {
      from: templateData.fromEmail || `"${process.env.FROM_NAME || 'Email Marketing'}" <${process.env.FROM_EMAIL || this.config.auth.user}>`,
      subject: templateData.subject,
      html: this.addTrackingPixel(templateData.content, templateData.campaignId, templateData.recipientId)
    };

    // Add recipients
    if (templateData.toEmails && templateData.toEmails.length > 0) {
      mailOptions.to = templateData.toEmails.join(', ');
    }

    // Add CC recipients
    if (templateData.ccEmails && templateData.ccEmails.length > 0) {
      mailOptions.cc = templateData.ccEmails.join(', ');
    }

    // Add BCC recipients
    if (templateData.bccEmails && templateData.bccEmails.length > 0) {
      mailOptions.bcc = templateData.bccEmails.join(', ');
    }

    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully:`, result.messageId);
      
      // Update campaign recipient status
      if (templateData.campaignId && templateData.recipientId) {
        await this.updateCampaignRecipientStatus(
          templateData.campaignId,
          templateData.recipientId,
          'sent'
        );
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to send email:`, error);
      
      // Update campaign recipient status to failed
      if (templateData.campaignId && templateData.recipientId) {
        await this.updateCampaignRecipientStatus(
          templateData.campaignId,
          templateData.recipientId,
          'failed'
        );
      }
      
      return false;
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(to: string, subject: string, content: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `[TEST] ${subject}`,
      html: content
    });
  }

  /**
   * Get email sending statistics
   */
  async getEmailStats(campaignId: string): Promise<{
    total: number;
    sent: number;
    pending: number;
    failed: number;
    skipped: number;
  }> {
    const stats = await prisma.campaignRecipient.groupBy({
      by: ['status'],
      where: {
        campaignId
      },
      _count: {
        id: true
      }
    });

    const total = stats.reduce((sum, stat) => sum + stat._count.id, 0);
    const sent = stats.find(s => s.status === 'sent')?._count.id || 0;
    const pending = stats.find(s => s.status === 'pending')?._count.id || 0;
    const failed = stats.find(s => s.status === 'failed')?._count.id || 0;
    const skipped = stats.find(s => s.status === 'skipped')?._count.id || 0;

    return { total, sent, pending, failed, skipped };
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default EmailService;