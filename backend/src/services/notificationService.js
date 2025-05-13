import Notification from "../models/Notification.js";

export const createNotification = async (userId, type, message, data = {}) => {
  try {
    const notification = new Notification({
      userId,
      type,
      message,
      data,
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error en createNotification:", error.message);
    throw error;
  }
};

export const getNotifications = async (userId, options = {}) => {
  const { limit = 20, skip = 0, unreadOnly = false } = options;
  try {
    const query = { userId };
    if (unreadOnly) query.isRead = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return notifications;
  } catch (error) {
    console.error("Error en getNotifications:", error.message);
    throw error;
  }
};

export const markNotificationAsRead = async (userId, notificationId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      throw new Error("Notificación no encontrada o no pertenece al usuario");
    }
    return notification;
  } catch (error) {
    console.error("Error en markNotificationAsRead:", error.message);
    throw error;
  }
};

export const markAllNotificationsAsRead = async (userId) => {
  try {
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    return true;
  } catch (error) {
    console.error("Error en markAllNotificationsAsRead:", error.message);
    throw error;
  }
};
