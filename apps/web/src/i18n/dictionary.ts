import { es } from "./translations/es";
import { en } from "./translations/en";
import { de } from "./translations/de";

import commonEs from "./namespaces/common/es.json";
import commonEn from "./namespaces/common/en.json";
import commonDe from "./namespaces/common/de.json";
import adminEs from "./namespaces/admin/es.json";
import adminEn from "./namespaces/admin/en.json";
import adminDe from "./namespaces/admin/de.json";
import dashboardEs from "./namespaces/dashboard/es.json";
import dashboardEn from "./namespaces/dashboard/en.json";
import dashboardDe from "./namespaces/dashboard/de.json";
import appEs from "./namespaces/app/es.json";
import appEn from "./namespaces/app/en.json";
import appDe from "./namespaces/app/de.json";
import authEs from "./namespaces/auth/es.json";
import authEn from "./namespaces/auth/en.json";
import authDe from "./namespaces/auth/de.json";
import gamificationEs from "./namespaces/gamification/es.json";
import gamificationEn from "./namespaces/gamification/en.json";
import gamificationDe from "./namespaces/gamification/de.json";
import chatEs from "./namespaces/chat/es.json";
import chatEn from "./namespaces/chat/en.json";
import chatDe from "./namespaces/chat/de.json";
import referralsEs from "./namespaces/referrals/es.json";
import referralsEn from "./namespaces/referrals/en.json";
import referralsDe from "./namespaces/referrals/de.json";
import animationsEs from "./namespaces/animations/es.json";
import animationsEn from "./namespaces/animations/en.json";
import animationsDe from "./namespaces/animations/de.json";
import itemsEs from "./namespaces/items/es.json";
import itemsEn from "./namespaces/items/en.json";
import itemsDe from "./namespaces/items/de.json";
import editorEs from "./namespaces/editor/es.json";
import editorEn from "./namespaces/editor/en.json";
import editorDe from "./namespaces/editor/de.json";
import siteEs from "./namespaces/site/es.json";
import siteEn from "./namespaces/site/en.json";
import siteDe from "./namespaces/site/de.json";
import navbarEs from "./namespaces/navbar/es.json";
import navbarEn from "./namespaces/navbar/en.json";
import navbarDe from "./namespaces/navbar/de.json";
import pricingEs from "./namespaces/pricing/es.json";
import pricingEn from "./namespaces/pricing/en.json";
import pricingDe from "./namespaces/pricing/de.json";
import battlePassEs from "./namespaces/battlePass/es.json";
import battlePassEn from "./namespaces/battlePass/en.json";
import battlePassDe from "./namespaces/battlePass/de.json";

export const dictionary = {
  es: { ...es, common: commonEs, admin: adminEs, dashboard: dashboardEs, app: appEs, auth: authEs, gamification: gamificationEs, chat: chatEs, referrals: referralsEs, animations: animationsEs, items: itemsEs, editor: editorEs, site: siteEs, navbar: { ...es.navbar, ...navbarEs }, pricing: pricingEs, battlePass: battlePassEs },
  "en-us": { ...en, common: commonEn, admin: adminEn, dashboard: dashboardEn, app: appEn, auth: authEn, gamification: gamificationEn, chat: chatEn, referrals: referralsEn, animations: animationsEn, items: itemsEn, editor: editorEn, site: siteEn, navbar: { ...en.navbar, ...navbarEn }, pricing: pricingEn, battlePass: battlePassEn },
  de: { ...de, common: commonDe, admin: adminDe, dashboard: dashboardDe, app: appDe, auth: authDe, gamification: gamificationDe, chat: chatDe, referrals: referralsDe, animations: animationsDe, items: itemsDe, editor: editorDe, site: siteDe, navbar: { ...de.navbar, ...navbarDe }, pricing: pricingDe, battlePass: battlePassDe },
};
