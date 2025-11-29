
import { Order, User, PayoutRequest, SystemEmailTrigger } from '../types';
import * as api from './api';

// Mock Email Service to simulate Transactional Emails using System Templates

const LOG_STYLE = "background: #222; color: #bada55; padding: 4px; border-radius: 4px;";

/**
 * Helper to fetch the template, replace variables, and "send" (log) the email.
 */
const sendTemplateEmail = async (
    trigger: SystemEmailTrigger, 
    recipientEmail: string, 
    variables: Record<string, string>
) => {
    try {
        const [template, settings] = await Promise.all([
            api.getSystemEmailTemplate(trigger),
            api.getSystemSettings()
        ]);

        if (!template) {
            console.error(`Template for trigger ${trigger} not found.`);
            return;
        }

        let subject = template.subject;
        let body = template.body;

        // Inject Global Platform Variables
        const allVariables = {
            ...variables,
            platform_name: settings.platformName,
            support_email: settings.supportEmail
        };

        // Replace variables in Subject and Body
        Object.entries(allVariables).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            // Simple replaceAll
            subject = subject.split(placeholder).join(value);
            body = body.split(placeholder).join(value);
        });

        console.group(`📧 Sending System Email: [${trigger}] ${subject}`);
        console.log(`From: ${settings.platformName} <noreply@${settings.platformName.toLowerCase().replace(/\s+/g, '')}.com>`);
        console.log(`To: ${recipientEmail}`);
        console.log('%c[HTML Content]', LOG_STYLE);
        console.log(body);
        console.groupEnd();

    } catch (error) {
        console.error(`Failed to send email for ${trigger}`, error);
    }
};

export const sendOrderConfirmation = async (order: Order, eventName: string, eventDate: string, location: string) => {
    const ticketId = order.items[0]?.ticketType || 'TICKET';
    const qrCodeLink = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${order.orderId}`;
    
    // Create summary of tickets
    const ticketSummary = `<ul>${order.items.map(item => `<li>${item.quantity}x ${item.ticketType} - $${item.pricePerTicket.toFixed(2)}</li>`).join('')}</ul>`;

    await sendTemplateEmail('ORDER_CONFIRMATION', order.purchaserEmail, {
        user_name: order.purchaserName,
        event_name: eventName,
        event_date: new Date(eventDate).toLocaleString(),
        event_location: location,
        order_id: order.orderId,
        total_paid: `$${order.totalPaid.toFixed(2)}`,
        ticket_summary: ticketSummary,
        qr_code_link: `<img src="${qrCodeLink}" alt="QR Code" />`
    });
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
    const resetLink = `${window.location.origin}/reset-password?token=${token}`;
    
    await sendTemplateEmail('PASSWORD_RESET', email, {
        user_name: 'User', // We might not have name if only email provided, simplified
        reset_link: resetLink
    });
};

export const sendPayoutNotification = async (request: PayoutRequest) => {
    await sendTemplateEmail('PAYOUT_PROCESSED', request.userEmail, {
        user_name: request.userName,
        amount: `$${request.amount.toFixed(2)}`,
        payout_id: request.id
    });
};

export const sendEventReminder = async (email: string, eventName: string, eventDate: string) => {
    await sendTemplateEmail('EVENT_REMINDER', email, {
        user_name: 'Valued Attendee', // Generic for bulk
        event_name: eventName,
        event_date: new Date(eventDate).toLocaleString(),
        event_location: 'Check event page' // Simplified
    });
};

// Exposed for Admin "Send Test" functionality
export const sendTestSystemEmail = async (trigger: SystemEmailTrigger, to: string, subject: string, body: string) => {
    return api.sendTestSystemEmail(trigger, to, subject, body);
}
