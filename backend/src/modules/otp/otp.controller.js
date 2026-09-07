const { AppError } = require("../../middleware/error.middleware");
const { generateOtp, verifyOtp, issueVerificationToken } = require("../../utils/otpService");

async function requestOtp(req, res, next) {
  try {
    const { phone } = req.body;
    if (!phone) throw new AppError("Phone number is required", 400);

    const otp = await generateOtp(phone);   // ← add await

    console.log(`[OTP] Generated OTP for ${phone}: ${otp}`);
    res.json({ success: true, message: "OTP sent" });
  } catch (error) {
    next(error);
  }
}

async function verifyOtpHandler(req, res, next) {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) throw new AppError("Phone and OTP are required", 400);

    const isValid = await verifyOtp(phone, otp);   // ← add await
    if (!isValid) throw new AppError("Invalid or expired OTP", 400);

    const token = issueVerificationToken(phone);
    res.json({ success: true, data: { verified: true, token } });
  } catch (error) {
    next(error);
  }
}

module.exports = { requestOtp, verifyOtpHandler };