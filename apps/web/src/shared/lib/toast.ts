import { toast as reactToast } from "react-toastify";

export const toast = {
  success: (message: string) => reactToast.success(message),
  error: (message: string) => reactToast.error(message),
  warning: (message: string) => reactToast.warning(message),
  info: (message: string) => reactToast.info(message),
};

export const appToast = toast;
