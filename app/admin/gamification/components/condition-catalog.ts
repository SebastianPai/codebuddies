export type ConditionDefinition = {
  key: string;
  group: string;
  labelKey: string;
  descriptionKey: string;
  example: string;
  defaultValue: number;
};

export const conditionGroups = [
  "Perfil",
  "Cursos",
  "Referidos",
  "Compras",
  "Experiencia",
  "Monedas",
  "Conexión",
  "Habitaciones",
  "Amigos",
  "Eventos",
  "Sistema",
];

export const conditionGroupLabelKeys: Record<string, string> = {
  "Perfil": "gamification.conditionGroupProfile",
  "Cursos": "gamification.conditionGroupCourses",
  "Referidos": "gamification.conditionGroupReferrals",
  "Compras": "gamification.conditionGroupPurchases",
  "Experiencia": "gamification.conditionGroupExperience",
  "Monedas": "gamification.conditionGroupCoins",
  "Conexión": "gamification.conditionGroupConnection",
  "Habitaciones": "gamification.conditionGroupRooms",
  "Amigos": "gamification.conditionGroupFriends",
  "Eventos": "gamification.conditionGroupEvents",
  "Sistema": "gamification.conditionGroupSystem",
};

export const conditionCatalog: ConditionDefinition[] = [
  { key: "COMPLETE_PROFILE", group: "Perfil", labelKey: "gamification.conditionCompleteProfileLabel", descriptionKey: "gamification.conditionCompleteProfileDescription", example: "0 / 1", defaultValue: 1 },
  { key: "VERIFY_EMAIL", group: "Perfil", labelKey: "gamification.conditionVerifyEmailLabel", descriptionKey: "gamification.conditionVerifyEmailDescription", example: "0 / 1", defaultValue: 1 },
  { key: "CHANGE_AVATAR", group: "Perfil", labelKey: "gamification.conditionChangeAvatarLabel", descriptionKey: "gamification.conditionChangeAvatarDescription", example: "0 / 1", defaultValue: 1 },
  { key: "FIRST_COURSE", group: "Cursos", labelKey: "gamification.conditionFirstCourseLabel", descriptionKey: "gamification.conditionFirstCourseDescription", example: "0 / 1", defaultValue: 1 },
  { key: "COMPLETE_COURSES", group: "Cursos", labelKey: "gamification.conditionCompleteCoursesLabel", descriptionKey: "gamification.conditionCompleteCoursesDescription", example: "2 / 5", defaultValue: 5 },
  { key: "COMPLETE_LESSONS", group: "Cursos", labelKey: "gamification.conditionCompleteLessonsLabel", descriptionKey: "gamification.conditionCompleteLessonsDescription", example: "8 / 20", defaultValue: 20 },
  { key: "COMPLETE_EXERCISES", group: "Cursos", labelKey: "gamification.conditionCompleteExercisesLabel", descriptionKey: "gamification.conditionCompleteExercisesDescription", example: "15 / 50", defaultValue: 50 },
  { key: "FIRST_REFERRAL", group: "Referidos", labelKey: "gamification.conditionFirstReferralLabel", descriptionKey: "gamification.conditionFirstReferralDescription", example: "0 / 1", defaultValue: 1 },
  { key: "REFER_USERS", group: "Referidos", labelKey: "gamification.conditionReferUsersLabel", descriptionKey: "gamification.conditionReferUsersDescription", example: "5 / 10", defaultValue: 10 },
  { key: "VALID_REFERRALS", group: "Referidos", labelKey: "gamification.conditionValidReferralsLabel", descriptionKey: "gamification.conditionValidReferralsDescription", example: "3 / 5", defaultValue: 5 },
  { key: "BUY_FIRST_ITEM", group: "Compras", labelKey: "gamification.conditionBuyFirstItemLabel", descriptionKey: "gamification.conditionBuyFirstItemDescription", example: "0 / 1", defaultValue: 1 },
  { key: "BUY_ITEMS", group: "Compras", labelKey: "gamification.conditionBuyItemsLabel", descriptionKey: "gamification.conditionBuyItemsDescription", example: "2 / 5", defaultValue: 5 },
  { key: "BUY_FURNITURE", group: "Habitaciones", labelKey: "gamification.conditionBuyFurnitureLabel", descriptionKey: "gamification.conditionBuyFurnitureDescription", example: "1 / 3", defaultValue: 3 },
  { key: "GAIN_XP", group: "Experiencia", labelKey: "gamification.conditionGainXpLabel", descriptionKey: "gamification.conditionGainXpDescription", example: "750 / 1000", defaultValue: 1000 },
  { key: "LEVEL_UP", group: "Experiencia", labelKey: "gamification.conditionLevelUpLabel", descriptionKey: "gamification.conditionLevelUpDescription", example: "8 / 10", defaultValue: 10 },
  { key: "EARN_COINS", group: "Monedas", labelKey: "gamification.conditionEarnCoinsLabel", descriptionKey: "gamification.conditionEarnCoinsDescription", example: "250 / 500", defaultValue: 500 },
  { key: "SPEND_COINS", group: "Monedas", labelKey: "gamification.conditionSpendCoinsLabel", descriptionKey: "gamification.conditionSpendCoinsDescription", example: "100 / 300", defaultValue: 300 },
  { key: "LOGIN_DAYS", group: "Conexión", labelKey: "gamification.conditionLoginDaysLabel", descriptionKey: "gamification.conditionLoginDaysDescription", example: "3 / 7", defaultValue: 7 },
  { key: "MAINTAIN_STREAK", group: "Conexión", labelKey: "gamification.conditionMaintainStreakLabel", descriptionKey: "gamification.conditionMaintainStreakDescription", example: "10 / 30", defaultValue: 30 },
  { key: "CREATE_FIRST_ROOM", group: "Habitaciones", labelKey: "gamification.conditionCreateFirstRoomLabel", descriptionKey: "gamification.conditionCreateFirstRoomDescription", example: "0 / 1", defaultValue: 1 },
  { key: "VISIT_ROOMS", group: "Habitaciones", labelKey: "gamification.conditionVisitRoomsLabel", descriptionKey: "gamification.conditionVisitRoomsDescription", example: "2 / 5", defaultValue: 5 },
  { key: "ADD_FRIENDS", group: "Amigos", labelKey: "gamification.conditionAddFriendsLabel", descriptionKey: "gamification.conditionAddFriendsDescription", example: "4 / 10", defaultValue: 10 },
  { key: "ACCEPT_FRIENDS", group: "Amigos", labelKey: "gamification.conditionAcceptFriendsLabel", descriptionKey: "gamification.conditionAcceptFriendsDescription", example: "2 / 5", defaultValue: 5 },
  { key: "CREATE_POSTS", group: "Eventos", labelKey: "gamification.conditionCreatePostsLabel", descriptionKey: "gamification.conditionCreatePostsDescription", example: "1 / 3", defaultValue: 3 },
  { key: "UNLOCK_ACHIEVEMENTS", group: "Sistema", labelKey: "gamification.conditionUnlockAchievementsLabel", descriptionKey: "gamification.conditionUnlockAchievementsDescription", example: "4 / 10", defaultValue: 10 },
  { key: "ENTER_RANKING", group: "Sistema", labelKey: "gamification.conditionEnterRankingLabel", descriptionKey: "gamification.conditionEnterRankingDescription", example: "0 / 1", defaultValue: 1 },
];

export function findCondition(key: string) {
  return conditionCatalog.find((condition) => condition.key === key) ?? conditionCatalog[0];
}
