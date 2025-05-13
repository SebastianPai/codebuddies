// src/services/achievementService.js
import User from "../models/User.js";
import Progress from "../models/ProgressModel.js";
import Achievement from "../models/Achievement.js";

export const checkAchievements = async (userId) => {
  const user = await User.findById(userId);
  const achievements = await Achievement.find();
  const newAchievements = [];

  for (const achievement of achievements) {
    const alreadyHasAchievement = user.achievements.some(
      (a) => a.achievementId.toString() === achievement._id.toString()
    );

    if (!alreadyHasAchievement) {
      let conditionMet = false;
      switch (achievement.condition.type) {
        case "exercises_completed": {
          const progress = await Progress.find({ user: userId });
          const totalExercises = progress.reduce(
            (sum, p) => sum + p.completedExercises.length,
            0
          );
          conditionMet = totalExercises >= achievement.condition.value;
          break;
        }
        case "courses_completed": {
          conditionMet =
            user.completedCourses.length >= achievement.condition.value;
          break;
        }
        case "specific_courses": {
          const requiredCourses = achievement.condition.value; // Array de IDs
          conditionMet = requiredCourses.every((courseId) =>
            user.completedCourses.includes(courseId)
          );
          break;
        }
        case "level_reached": {
          conditionMet = user.level >= achievement.condition.value;
          break;
        }
      }

      if (conditionMet) {
        user.achievements.push({
          achievementId: achievement._id,
          awardedAt: new Date(),
        });
        newAchievements.push({
          id: achievement._id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          image: achievement.image,
        });
        //create notification
        await notificationService.createNotification(
          userId,
          "achievement_earned",
          `¡Has ganado el logro "${achievement.name}"!`,
          { achievementId: achievement._id }
        );
      }
    }
  }

  await user.save();
  return newAchievements;
};

export const getAchievements = async (userId) => {
  const user = await User.findById(userId)
    .select("achievements")
    .populate("achievements.achievementId");
  return user.achievements.map((a) => ({
    id: a.achievementId._id,
    name: a.achievementId.name,
    description: a.achievementId.description,
    icon: a.achievementId.icon,
    image: a.achievementId.image,
    awardedAt: a.awardedAt,
  }));
};
