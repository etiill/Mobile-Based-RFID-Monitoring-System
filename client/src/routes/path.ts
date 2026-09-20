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
    PROFILE: `${APP_ROOT}/profile`,

    // Admin Routes
    ADMIN: {
      REGISTRATION: `${APP_ROOT}/registration`,
      PUPILS: `${APP_ROOT}/pupils`,
    },

    // Teacher Routes
    TEACHER: {
      RFID_SCAN: `${APP_ROOT}/rfid_scan`,
      MY_STUDENTS: `${APP_ROOT}/my_students`,
      ATTENDANCE: `${APP_ROOT}/attendance`,
      PICKUP_LOGS: `${APP_ROOT}/pickup_logs`,
      REPORTS: `${APP_ROOT}/reports`,
    },

    // Guardian Routes
    GUARDIAN: {
      DASHBOARD: `${APP_ROOT}/dashboard`,
    }
  },

} as const