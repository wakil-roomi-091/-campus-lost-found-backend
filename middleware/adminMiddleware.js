const jwt = require("jsonwebtoken");
const User = require("../models/user");

module.exports = async function (req, res, next) {
  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ msg: "No token, authorization denied" });
    }

    // ✅ FIXED: Use environment variable instead of hardcoded "secretkey"
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user is admin
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ msg: "User not found" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied. Admin only." });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error("Admin middleware error:", err);
    res.status(401).json({ msg: "Token is not valid" });
  }
};
