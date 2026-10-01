// Bridge between the EasyShoppingDZ web UI and Android features.
// Everything is a safe no-op when running in a normal browser.
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();
const REMINDER_ID = 1;
const REMINDER_DELAY_MS = 3 * 60 * 60 * 1000; // 3 hours
const ASKED_KEY = 'esdz_notif_asked';

const $ = (s) => document.querySelector(s);
const savedCartCount = () => {
  try {
    const c = JSON.parse(localStorage.getItem('esdz') || '{}').cart || {};
    return Object.values(c).reduce((a, b) => a + b, 0);
  } catch { return 0; }
};

async function hasPermission() {
  const p = await LocalNotifications.checkPermissions();
  return p.display === 'granted';
}

async function ensurePermission() {
  if (await hasPermission()) return true;
  const p = await LocalNotifications.requestPermissions();
  return p.display === 'granted';
}

async function setupChannels() {
  await LocalNotifications.createChannel({
    id: 'orders', name: 'Order updates',
    description: 'Confirmation and delivery status of your orders',
    importance: 4, visibility: 1, vibration: true,
  });
  await LocalNotifications.createChannel({
    id: 'reminders', name: 'Cart reminders',
    description: 'A gentle nudge if you leave items in your cart',
    importance: 3, visibility: 1,
  });
}

const buzz = (style = ImpactStyle.Light) => { if (isNative) Haptics.impact({ style }).catch(() => {}); };

async function orderPlaced(orderId, total, etaMin, store) {
  if (!isNative) return;
  Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
    if (!(await ensurePermission())) return;
    const base = parseInt(orderId.replace(/\D/g, ''), 10) * 10;
    const now = Date.now();
    const at = (ms) => ({ at: new Date(now + ms), allowWhileIdle: true });
    const min = 60 * 1000;
    const extra = { orderId };
    await LocalNotifications.schedule({
      notifications: [
        { id: base, channelId: 'orders', title: `Order ${orderId} confirmed`,
          body: `${store} is preparing your order. Estimated delivery: ${etaMin} min.`,
          schedule: at(1500), extra },
        { id: base + 1, channelId: 'orders', title: 'Your order is on the way',
          body: `Order ${orderId} has left ${store}.`,
          schedule: at(Math.max(1, Math.round(etaMin * 0.4)) * min), extra },
        { id: base + 2, channelId: 'orders', title: 'Your order has arrived',
          body: `Order ${orderId} has been delivered. Enjoy!`,
          schedule: at(etaMin * min), extra },
      ],
    });
  } catch (e) { console.warn('notify failed', e); }
}

// Ask for notification permission once, in context, the first time something is added to the cart.
async function firstCartAdd() {
  buzz();
  if (!isNative || localStorage.getItem(ASKED_KEY)) return;
  try { localStorage.setItem(ASKED_KEY, '1'); } catch {}
  try { await ensurePermission(); } catch {}
}

async function scheduleCartReminder() {
  const n = savedCartCount();
  if (!n || !(await hasPermission())) return;
  await LocalNotifications.schedule({
    notifications: [{
      id: REMINDER_ID, channelId: 'reminders',
      title: 'You left something in your cart',
      body: `${n} item${n > 1 ? 's are' : ' is'} still waiting for you at EasyShoppingDZ.`,
      schedule: { at: new Date(Date.now() + REMINDER_DELAY_MS), allowWhileIdle: true },
      extra: { openCart: true },
    }],
  });
}

function applyBarStyle() {
  const dark = document.documentElement.dataset.theme === 'dark' ||
    (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  // Style.Dark = light icons for dark backgrounds
  SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
}

async function initNative() {
  applyBarStyle();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyBarStyle);
  await setupChannels().catch(() => {});

  // Android Back button: close open panels first, then clear search, then minimize.
  App.addListener('backButton', () => {
    if (document.querySelector('.ov.on')) return window.closeAll();
    const q = $('#q');
    if (q && q.value) { q.value = ''; q.dispatchEvent(new Event('input')); return; }
    App.minimizeApp();
  });

  // Cart reminder: schedule when the app goes to background, cancel when it returns.
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] }).catch(() => {});
    else scheduleCartReminder().catch(() => {});
  });

  // Tapping a notification.
  LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
    const x = notification.extra || {};
    if (x.openCart) document.querySelector('.fab')?.click();
  });

  await SplashScreen.hide().catch(() => {});
}

window.Native = { isNative, orderPlaced, firstCartAdd };
if (isNative) initNative();
