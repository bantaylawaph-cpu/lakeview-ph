// resources/js/lib/dashboardEvents.js
// Helper utilities to notify dashboards about data changes

/**
 * Notify organization dashboard that data has changed
 * Call this after creating/updating/deleting members, tests, or approvals
 */
export function notifyOrgDataChanged() {
  try {
    window.dispatchEvent(new Event('lv-org-data-changed'));
  } catch (e) {
    console.warn('[dashboardEvents] Failed to dispatch lv-org-data-changed', e);
  }
}

/**
 * Notify contributor dashboard that data has changed
 * Call this after creating/updating/deleting user's own tests
 */
export function notifyContribDataChanged() {
  try {
    window.dispatchEvent(new Event('lv-contrib-data-changed'));
  } catch (e) {
    console.warn('[dashboardEvents] Failed to dispatch lv-contrib-data-changed', e);
  }
}

/**
 * Notify all dashboards that data has changed
 * Use this for actions that affect both dashboards
 */
export function notifyAllDashboards() {
  notifyOrgDataChanged();
  notifyContribDataChanged();
}

export default {
  notifyOrgDataChanged,
  notifyContribDataChanged,
  notifyAllDashboards,
};
