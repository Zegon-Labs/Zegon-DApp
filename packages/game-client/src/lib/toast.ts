import { sileo } from "sileo";
import { playSfx } from "../services/sfx.js";

export const notify = {
  success(title: string, description?: string) {
    playSfx("ui_toast_success");
    sileo.success({ title, ...(description ? { description } : {}) });
  },
  error(title: string, description?: string) {
    playSfx("ui_toast_error");
    sileo.error({ title, ...(description ? { description } : {}) });
  },
  warning(title: string, description?: string) {
    playSfx("ui_toast_info");
    sileo.warning({ title, ...(description ? { description } : {}) });
  },
  info(title: string, description?: string) {
    playSfx("ui_toast_info");
    sileo.info({ title, ...(description ? { description } : {}) });
  },
};
