import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "achievement_earned",
        "coins_added",
        "coins_deducted",
        "lives_added",
        "lives_deducted",
        "xp_added",
        "level_up",
        "streak_updated",
        "power_activated",
        "item_purchased",
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Mixed, // Detalles adicionales, como achievementId, amount, etc.
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: { expires: "30d" }, // Notificaciones expiran después de 30 días
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
