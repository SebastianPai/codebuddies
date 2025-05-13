import * as notificationService from "../services/notificationService.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit, skip, unreadOnly } = req.query;
    const notifications = await notificationService.getNotifications(userId, {
      limit: parseInt(limit) || 20,
      skip: parseInt(skip) || 0,
      unreadOnly: unreadOnly === "true",
    });
    res.status(200).json({ notifications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationId } = req.params;
    const notification = await notificationService.markNotificationAsRead(
      userId,
      notificationId
    );
    res
      .status(200)
      .json({ message: "Notificación marcada como leída", notification });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    await notificationService.markAllNotificationsAsRead(userId);
    res
      .status(200)
      .json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
