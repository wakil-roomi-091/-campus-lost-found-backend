const brevo = require("@getbrevo/brevo");

let apiInstance = null;

const initBrevo = () => {
  if (!process.env.BREVO_API_KEY) {
    console.error("❌ BREVO_API_KEY not set in environment variables");
    return false;
  }

  apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY,
  );
  console.log("✅ Brevo API initialized");
  return true;
};

const sendOTPEmail = async (email, otp, userName) => {
  try {
    if (!apiInstance) {
      const init = initBrevo();
      if (!init) return false;
    }

    console.log(`📧 Sending OTP to ${email} via Brevo API...`);
    const startTime = Date.now();

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = "Email Verification - Campus Lost & Found";
    sendSmtpEmail.to = [{ email: email, name: userName }];
    sendSmtpEmail.sender = {
      name: "Campus Lost & Found",
      email: "wakila971@gmail.com",
    };
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Campus Lost & Found</h1>
        </div>
        <div style="padding: 30px; background: white;">
          <h2>Email Verification</h2>
          <p>Hello <strong>${userName}</strong>,</p>
          <p>Your verification code is: <strong style="font-size: 24px; letter-spacing: 5px;">${otp}</strong></p>
          <p>This code expires in <strong>90 seconds</strong>.</p>
        </div>
      </div>
    `;
    sendSmtpEmail.textContent = `Your verification code is: ${otp}\n\nThis code expires in 90 seconds.`;

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    const duration = Date.now() - startTime;
    console.log(`✅ OTP email sent to ${email} in ${duration}ms`);
    return true;
  } catch (err) {
    console.error("❌ Brevo API error:", err.message);
    if (err.response) {
      console.error("Response data:", err.response.data);
    }
    return false;
  }
};

// Initialize on load
initBrevo();

module.exports = { sendOTPEmail };
