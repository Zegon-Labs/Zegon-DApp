import { sileo } from "sileo";

export const notify = {
  success(title: string, description?: string) {
    sileo.success({ title, ...(description ? { description } : {}) });
  },
  error(title: string, description?: string) {
    sileo.error({ title, ...(description ? { description } : {}) });
  },
  warning(title: string, description?: string) {
    sileo.warning({ title, ...(description ? { description } : {}) });
  },
  info(title: string, description?: string) {
    sileo.info({ title, ...(description ? { description } : {}) });
  },
};
