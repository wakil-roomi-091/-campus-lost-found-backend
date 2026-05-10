const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  console.log("========== AUTH MIDDLEWARE ==========");

  const token = req.header("Authorization");
  console.log("1. Raw token header:", token);

  if (!token) {
    console.log("2. No token provided");
    return res.status(401).json({ msg: "No token" });
  }

  // Check if token has Bearer prefix and remove it
  const tokenValue = token.startsWith("Bearer ") ? token.slice(7) : token;
  console.log("3. Token value:", tokenValue.substring(0, 30) + "...");
  console.log("4. Token length:", tokenValue.length);

  try {
    // ✅ FIXED: Use environment variable instead of hardcoded "secretkey"
    const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);
    console.log("5. Decoded token:", decoded);
    console.log("6. User ID:", decoded.id);
    console.log("========== AUTH SUCCESS ==========");

    req.user = decoded;
    next();
  } catch (err) {
    console.log("5. JWT Error:", err.message);
    console.log("========== AUTH FAILED ==========");
    res.status(401).json({ msg: "Invalid token: " + err.message });
  }
};
