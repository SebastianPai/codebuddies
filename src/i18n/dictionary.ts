import { es } from "./translations/es";
import { en } from "./translations/en";
import { zh } from "./translations/zh";

import commonEs from "./namespaces/common/es.json";
import commonEn from "./namespaces/common/en.json";
import commonZh from "./namespaces/common/zh.json";
import adminEs from "./namespaces/admin/es.json";
import adminEn from "./namespaces/admin/en.json";
import adminZh from "./namespaces/admin/zh.json";
import dashboardEs from "./namespaces/dashboard/es.json";
import dashboardEn from "./namespaces/dashboard/en.json";
import dashboardZh from "./namespaces/dashboard/zh.json";
import appEs from "./namespaces/app/es.json";
import appEn from "./namespaces/app/en.json";
import appZh from "./namespaces/app/zh.json";
import authEs from "./namespaces/auth/es.json";
import authEn from "./namespaces/auth/en.json";
import authZh from "./namespaces/auth/zh.json";
import gamificationEs from "./namespaces/gamification/es.json";
import gamificationEn from "./namespaces/gamification/en.json";
import gamificationZh from "./namespaces/gamification/zh.json";
import chatEs from "./namespaces/chat/es.json";
import chatEn from "./namespaces/chat/en.json";
import chatZh from "./namespaces/chat/zh.json";
import referralsEs from "./namespaces/referrals/es.json";
import referralsEn from "./namespaces/referrals/en.json";
import referralsZh from "./namespaces/referrals/zh.json";
import animationsEs from "./namespaces/animations/es.json";
import animationsEn from "./namespaces/animations/en.json";
import animationsZh from "./namespaces/animations/zh.json";
import itemsEs from "./namespaces/items/es.json";
import itemsEn from "./namespaces/items/en.json";
import itemsZh from "./namespaces/items/zh.json";
import editorEs from "./namespaces/editor/es.json";
import editorEn from "./namespaces/editor/en.json";
import editorZh from "./namespaces/editor/zh.json";
import siteEs from "./namespaces/site/es.json";
import siteEn from "./namespaces/site/en.json";
import siteZh from "./namespaces/site/zh.json";
import navbarEs from "./namespaces/navbar/es.json";
import navbarEn from "./namespaces/navbar/en.json";
import navbarZh from "./namespaces/navbar/zh.json";

export const dictionary = {
  es: { ...es, common: commonEs, admin: adminEs, dashboard: dashboardEs, app: appEs, auth: authEs, gamification: gamificationEs, chat: chatEs, referrals: referralsEs, animations: animationsEs, items: itemsEs, editor: editorEs, site: siteEs, navbar: { ...es.navbar, ...navbarEs } },
  "en-us": { ...en, common: commonEn, admin: adminEn, dashboard: dashboardEn, app: appEn, auth: authEn, gamification: gamificationEn, chat: chatEn, referrals: referralsEn, animations: animationsEn, items: itemsEn, editor: editorEn, site: siteEn, navbar: { ...en.navbar, ...navbarEn } },
  "zh-Hans": { ...zh, common: commonZh, admin: adminZh, dashboard: dashboardZh, app: appZh, auth: authZh, gamification: gamificationZh, chat: chatZh, referrals: referralsZh, animations: animationsZh, items: itemsZh, editor: editorZh, site: siteZh, navbar: { ...zh.navbar, ...navbarZh } },
};
