// Un import trío (es/en-us/de) por namespace — cada namespace vive en
// su propia carpeta bajo ./namespaces para que distintas tandas de trabajo
// puedan agregar/traducir la suya sin pisarse entre sí. Este archivo es el
// único lugar que las une todas; si agregás un namespace nuevo, sumalo acá.

import commonEs from "./namespaces/common/es.json";
import commonEn from "./namespaces/common/en-us.json";
import commonDe from "./namespaces/common/de.json";

import settingsEs from "./namespaces/settings/es.json";
import settingsEn from "./namespaces/settings/en-us.json";
import settingsDe from "./namespaces/settings/de.json";

import quickmenuEs from "./namespaces/quickmenu/es.json";
import quickmenuEn from "./namespaces/quickmenu/en-us.json";
import quickmenuDe from "./namespaces/quickmenu/de.json";

import avatarEs from "./namespaces/avatar/es.json";
import avatarEn from "./namespaces/avatar/en-us.json";
import avatarDe from "./namespaces/avatar/de.json";

import friendsEs from "./namespaces/friends/es.json";
import friendsEn from "./namespaces/friends/en-us.json";
import friendsDe from "./namespaces/friends/de.json";

import chatEs from "./namespaces/chat/es.json";
import chatEn from "./namespaces/chat/en-us.json";
import chatDe from "./namespaces/chat/de.json";

import notificationsEs from "./namespaces/notifications/es.json";
import notificationsEn from "./namespaces/notifications/en-us.json";
import notificationsDe from "./namespaces/notifications/de.json";

import dialogEs from "./namespaces/dialog/es.json";
import dialogEn from "./namespaces/dialog/en-us.json";
import dialogDe from "./namespaces/dialog/de.json";

import roomsEs from "./namespaces/rooms/es.json";
import roomsEn from "./namespaces/rooms/en-us.json";
import roomsDe from "./namespaces/rooms/de.json";

import commerceEs from "./namespaces/commerce/es.json";
import commerceEn from "./namespaces/commerce/en-us.json";
import commerceDe from "./namespaces/commerce/de.json";

import buildmodeEs from "./namespaces/buildmode/es.json";
import buildmodeEn from "./namespaces/buildmode/en-us.json";
import buildmodeDe from "./namespaces/buildmode/de.json";

import pcEs from "./namespaces/pc/es.json";
import pcEn from "./namespaces/pc/en-us.json";
import pcDe from "./namespaces/pc/de.json";

import hudEs from "./namespaces/hud/es.json";
import hudEn from "./namespaces/hud/en-us.json";
import hudDe from "./namespaces/hud/de.json";

import codestudioGeneralEs from "./namespaces/codestudioGeneral/es.json";
import codestudioGeneralEn from "./namespaces/codestudioGeneral/en-us.json";
import codestudioGeneralDe from "./namespaces/codestudioGeneral/de.json";

import codestudioOpsEs from "./namespaces/codestudioOps/es.json";
import codestudioOpsEn from "./namespaces/codestudioOps/en-us.json";
import codestudioOpsDe from "./namespaces/codestudioOps/de.json";

import codestudioMiscEs from "./namespaces/codestudioMisc/es.json";
import codestudioMiscEn from "./namespaces/codestudioMisc/en-us.json";
import codestudioMiscDe from "./namespaces/codestudioMisc/de.json";

import editworldEs from "./namespaces/editworld/es.json";
import editworldEn from "./namespaces/editworld/en-us.json";
import editworldDe from "./namespaces/editworld/de.json";

export const dictionary = {
  es: {
    common: commonEs,
    settings: settingsEs,
    quickmenu: quickmenuEs,
    avatar: avatarEs,
    friends: friendsEs,
    chat: chatEs,
    notifications: notificationsEs,
    dialog: dialogEs,
    rooms: roomsEs,
    commerce: commerceEs,
    buildmode: buildmodeEs,
    pc: pcEs,
    hud: hudEs,
    codestudioGeneral: codestudioGeneralEs,
    codestudioOps: codestudioOpsEs,
    codestudioMisc: codestudioMiscEs,
    editworld: editworldEs,
  },
  "en-us": {
    common: commonEn,
    settings: settingsEn,
    quickmenu: quickmenuEn,
    avatar: avatarEn,
    friends: friendsEn,
    chat: chatEn,
    notifications: notificationsEn,
    dialog: dialogEn,
    rooms: roomsEn,
    commerce: commerceEn,
    buildmode: buildmodeEn,
    pc: pcEn,
    hud: hudEn,
    codestudioGeneral: codestudioGeneralEn,
    codestudioOps: codestudioOpsEn,
    codestudioMisc: codestudioMiscEn,
    editworld: editworldEn,
  },
  de: {
    common: commonDe,
    settings: settingsDe,
    quickmenu: quickmenuDe,
    avatar: avatarDe,
    friends: friendsDe,
    chat: chatDe,
    notifications: notificationsDe,
    dialog: dialogDe,
    rooms: roomsDe,
    commerce: commerceDe,
    buildmode: buildmodeDe,
    pc: pcDe,
    hud: hudDe,
    codestudioGeneral: codestudioGeneralDe,
    codestudioOps: codestudioOpsDe,
    codestudioMisc: codestudioMiscDe,
    editworld: editworldDe,
  },
};
