const APP_ROOT = "/app"

export const PATHS = {
  // Public/Guest Routes
  HOME: "/",
  LOGIN: "/login",

  // App / Protected Routes
  APP: {
    ROOT: APP_ROOT,
    DASHBOARD: `${APP_ROOT}/dashboard`,
    USERS: `${APP_ROOT}/users`,
    REGISTRATION: `${APP_ROOT}/registration`,
  },
} as const