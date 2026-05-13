// server/config/emailServiceBrevo.js
const https = require("https");

const sendOTPEmail = async (email, otp, userName) => {
  try {
    console.log(`📧 Sending OTP to ${email} via Brevo HTTP API...`);
    const startTime = Date.now();

    const apiKey = process.env.BREVO_API_KEY;

    const data = JSON.stringify({
      sender: {
        name: "Campus Lost & Found",
        email: "wakila971@gmail.com",
      },
      to: [{ email: email, name: userName }],
      subject: "Email Verification - Campus Lost & Found",
      htmlContent: `
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
      `,
      textContent: `Your verification code is: ${otp}\n\nThis code expires in 90 seconds.`,
    });

    const options = {
      hostname: "api.brevo.com",
      path: "/v3/smtp/email",
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
    };

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode === 201 || res.statusCode === 200) {
            console.log(`✅ Brevo response: ${res.statusCode}`);
            resolve({ success: true });
          } else {
            console.error(`❌ Brevo error ${res.statusCode}: ${body}`);
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });
      req.on("error", reject);
      req.write(data);
      req.end();
    });

    const duration = Date.now() - startTime;
    console.log(`✅ OTP email sent to ${email} in ${duration}ms`);
    return true;
  } catch (err) {
    console.error("❌ Brevo API error:", err.message);
    return false;
  }
};

module.exports = { sendOTPEmail };
