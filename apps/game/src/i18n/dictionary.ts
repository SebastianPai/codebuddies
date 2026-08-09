// Un import trío (es/en-us/zh-Hans) por namespace — cada namespace vive en
// su propia carpeta bajo ./namespaces para que distintas tandas de trabajo
// puedan agregar/traducir la suya sin pisarse entre sí. Este archivo es el
// único lugar que las une todas; si agregás un namespace nuevo, sumalo acá.

import commonEs from "./namespaces/common/es.json";
import commonEn from "./namespaces/common/en-us.json";
import commonZh from "./namespaces/common/zh-Hans.json";

import settingsEs from "./namespaces/settings/es.json";
import settingsEn from "./namespaces/settings/en-us.json";
import settingsZh from "./namespaces/settings/zh-Hans.json";

import quickmenuEs from "./namespaces/quickmenu/es.json";
import quickmenuEn from "./namespaces/quickmenu/en-us.json";
import quickmenuZh from "./namespaces/quickmenu/zh-Hans.json";

import avatarEs from "./namespaces/avatar/es.json";
import avatarEn from "./namespaces/avatar/en-us.json";
import avatarZh from "./namespaces/avatar/zh-Hans.json";

import friendsEs from "./namespaces/friends/es.json";
import friendsEn from "./namespaces/friends/en-us.json";
import friendsZh from "./namespaces/friends/zh-Hans.json";

import chatEs from "./namespaces/chat/es.json";
import chatEn from "./namespaces/chat/en-us.json";
import chatZh from "./namespaces/chat/zh-Hans.json";

import notificationsEs from "./namespaces/notifications/es.json";
import notificationsEn from "./namespaces/notifications/en-us.json";
import notificationsZh from "./namespaces/notifications/zh-Hans.json";

import dialogEs from "./namespaces/dialog/es.json";
import dialogEn from "./namespaces/dialog/en-us.json";
import dialogZh from "./namespaces/dialog/zh-Hans.json";

import roomsEs from "./namespaces/rooms/es.json";
import roomsEn from "./namespaces/rooms/en-us.json";
import roomsZh from "./namespaces/rooms/zh-Hans.json";

import commerceEs from "./namespaces/commerce/es.json";
import commerceEn from "./namespaces/commerce/en-us.json";
import commerceZh from "./namespaces/commerce/zh-Hans.json";

import buildmodeEs from "./namespaces/buildmode/es.json";
import buildmodeEn from "./namespaces/buildmode/en-us.json";
import buildmodeZh from "./namespaces/buildmode/zh-Hans.json";

import pcEs from "./namespaces/pc/es.json";
import pcEn from "./namespaces/pc/en-us.json";
import pcZh from "./namespaces/pc/zh-Hans.json";

import hudEs from "./namespaces/hud/es.json";
import hudEn from "./namespaces/hud/en-us.json";
import hudZh from "./namespaces/hud/zh-Hans.json";

import codestudioGeneralEs from "./namespaces/codestudioGeneral/es.json";
import codestudioGeneralEn from "./namespaces/codestudioGeneral/en-us.json";
import codestudioGeneralZh from "./namespaces/codestudioGeneral/zh-Hans.json";

import codestudioOpsEs from "./namespaces/codestudioOps/es.json";
import codestudioOpsEn from "./namespaces/codestudioOps/en-us.json";
import codestudioOpsZh from "./namespaces/codestudioOps/zh-Hans.json";

import codestudioMiscEs from "./namespaces/codestudioMisc/es.json";
import codestudioMiscEn from "./namespaces/codestudioMisc/en-us.json";
import codestudioMiscZh from "./namespaces/codestudioMisc/zh-Hans.json";

import editworldEs from "./namespaces/editworld/es.json";
import editworldEn from "./namespaces/editworld/en-us.json";
import editworldZh from "./namespaces/editworld/zh-Hans.json";

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
  "zh-Hans": {
    common: commonZh,
    settings: settingsZh,
    quickmenu: quickmenuZh,
    avatar: avatarZh,
    friends: friendsZh,
    chat: chatZh,
    notifications: notificationsZh,
    dialog: dialogZh,
    rooms: roomsZh,
    commerce: commerceZh,
    buildmode: buildmodeZh,
    pc: pcZh,
    hud: hudZh,
    codestudioGeneral: codestudioGeneralZh,
    codestudioOps: codestudioOpsZh,
    codestudioMisc: codestudioMiscZh,
    editworld: editworldZh,
  },
};
