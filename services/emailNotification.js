const nodemailer = require("nodemailer");
const User = require("../models/user");
const Message = require("../models/Message");

// Create transporter using Brevo SMTP
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: "a82dc3001@smtp-brevo.com",
    pass: process.env.BREVO_SMTP_KEY,
  },
});

const sendMessageNotification = async (
  toUserId,
  fromUserId,
  message,
  itemName,
) => {
  try {
    // Get user details
    const toUser = await User.findById(toUserId);
    const fromUser = await User.findById(fromUserId);

    if (!toUser || !fromUser) {
      console.log("User not found");
      return false;
    }

    // Check if user wants email notifications (you can add this preference later)
    // For now, send to all users

    const messagePreview =
      message.length > 100 ? message.substring(0, 100) + "..." : message;

    const mailOptions = {
      from: '"Campus Lost & Found" <wakila971@gmail.com>',
      to: toUser.email,
      subject: `📬 New Message from ${fromUser.name} on Campus Lost & Found`,
      html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
                        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
                        .header h1 { color: white; margin: 0; font-size: 24px; }
                        .content { padding: 30px; }
                        .message-box { background: #f0f4ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #4F46E5; }
                        .message-text { color: #333; font-size: 16px; line-height: 1.5; margin: 0; }
                        .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
                        .footer { padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
                        .badge { display: inline-block; background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #4b5563; margin-bottom: 10px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Campus Lost & Found</h1>
                        </div>
                        <div class="content">
                            <div class="badge">New Message</div>
                            <h2 style="color: #333; margin-top: 0;">Hello ${toUser.name},</h2>
                            <p style="color: #555;">You have received a new message from <strong>${fromUser.name}</strong>.</p>
                            ${itemName ? `<p style="color: #555;">Regarding item: <strong>${itemName}</strong></p>` : ""}
                            <div class="message-box">
                                <p class="message-text">"${messagePreview}"</p>
                            </div>
                            <p style="color: #555;">Click the button below to view the message and reply:</p>
                            <div style="text-align: center;">
                                <a href="https://campus-lost-found-frontend-xeac.vercel.app/messages" class="button">View Message</a>
                            </div>
                            <p style="color: #888; font-size: 14px; margin-top: 20px;">You can also reply directly from the website.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2024 Campus Lost & Found. All rights reserved.</p>
                            <p>This is an automated notification. Please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
      text: `
                Campus Lost & Found - New Message Notification
                
                Hello ${toUser.name},
                
                You have received a new message from ${fromUser.name}.
                ${itemName ? `Regarding item: ${itemName}` : ""}
                
                Message: "${messagePreview}"
                
                To view and reply to this message, please visit:
                https://campus-lost-found-frontend-xeac.vercel.app/messages
                
                This is an automated notification. Please do not reply to this email.
                
                © 2024 Campus Lost & Found. All rights reserved.
            `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email notification sent to ${toUser.email}`);

    // Mark email as sent
    await Message.updateOne(
      {
        fromUserId: fromUserId,
        toUserId: toUserId,
        message: message,
        createdAt: { $gt: new Date(Date.now() - 60000) },
      },
      { emailSent: true, emailSentAt: new Date() },
    );

    return true;
  } catch (err) {
    console.error("❌ Email notification error:", err.message);
    return false;
  }
};

module.exports = { sendMessageNotification };
