const ActivityLog = require("../models/ActivityLog");

const logActivity = async (
  req,
  userId,
  action,
  actionType,
  details = {},
  status = "success",
) => {
  try {
    // Get user details if userId is provided
    let userName = "Unknown";
    let userEmail = "Unknown";
    let userRole = "user";

    if (userId) {
      const User = require("../models/user");
      const user = await User.findById(userId);
      if (user) {
        userName = user.name;
        userEmail = user.email;
        userRole = user.role;
      }
    }

    const activityLog = new ActivityLog({
      userId: userId || null,
      userName,
      userEmail,
      userRole,
      action,
      actionType,
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent") || "",
      status,
    });

    await activityLog.save();
    console.log(`📝 Activity logged: ${action} by ${userName}`);
  } catch (err) {
    console.error("Error logging activity:", err);
  }
};

module.exports = { logActivity };
