// src/services/rankingService.js
import User from "../models/User.js";
import Ranking from "../models/RankingModel.js";

const getPeriodStart = (period) => {
  const now = new Date();
  if (period === "weekly") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lunes
    return new Date(now.setDate(diff)).setHours(0, 0, 0, 0);
  } else if (period === "monthly") {
    return new Date(now.getFullYear(), now.getMonth(), 1).setHours(0, 0, 0, 0);
  }
};

export const updateRanking = async (userId, xp) => {
  const periods = ["weekly", "monthly"];
  for (const period of periods) {
    const periodStart = getPeriodStart(period);
    let ranking = await Ranking.findOne({ user: userId, period, periodStart });

    if (!ranking) {
      ranking = new Ranking({ user: userId, period, periodStart, xp: 0 });
    }

    ranking.xp += xp;
    await ranking.save();
  }
};

export const getRankings = async (period) => {
  const periodStart = getPeriodStart(period);
  const rankings = await Ranking.find({ period, periodStart })
    .populate({
      path: "user",
      select: "name xp level profilePicture activeBorder",
      populate: { path: "activeBorder" },
    })
    .sort({ xp: -1 })
    .limit(10)
    .lean();

  return rankings.map((r, index) => ({
    rank: index + 1,
    userId: r.user._id.toString(),
    name: r.user.name,
    xp: r.xp,
    level: r.user.level,
    profilePicture: r.user.profilePicture,
    activeBorder: r.user.activeBorder
      ? {
          id: r.user.activeBorder._id.toString(),
          name: r.user.activeBorder.name,
          description: r.user.activeBorder.description,
          properties: r.user.activeBorder.properties || {},
          image: r.user.activeBorder.image || "",
        }
      : null,
  }));
};

export const getUserRank = async (userId, period) => {
  const periodStart = getPeriodStart(period);
  const rankings = await Ranking.find({ period, periodStart })
    .populate({
      path: "user",
      select: "name xp level profilePicture activeBorder",
      populate: { path: "activeBorder" },
    })
    .sort({ xp: -1 })
    .lean();

  const userRanking = rankings.find((r) => r.user._id.toString() === userId);
  if (!userRanking) {
    const user = await User.findById(userId)
      .select("activeBorder")
      .populate("activeBorder")
      .lean();
    return {
      rank: null,
      xp: 0,
      level: 0,
      activeBorder:
        user && user.activeBorder
          ? {
              id: user.activeBorder._id.toString(),
              name: user.activeBorder.name,
              description: user.activeBorder.description,
              properties: user.activeBorder.properties || {},
              image: user.activeBorder.image || "",
            }
          : null,
    };
  }

  const rank = rankings.findIndex((r) => r.user._id.toString() === userId) + 1;
  return {
    rank,
    xp: userRanking.xp,
    level: userRanking.user.level,
    activeBorder: userRanking.user.activeBorder
      ? {
          id: userRanking.user.activeBorder._id.toString(),
          name: userRanking.user.activeBorder.name,
          description: userRanking.user.activeBorder.description,
          properties: userRanking.user.activeBorder.properties || {},
          image: userRanking.user.activeBorder.image || "",
        }
      : null,
  };
};
