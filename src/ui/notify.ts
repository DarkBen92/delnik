/** Системное уведомление (если разрешено и поддерживается). Ошибки глушим. */
export function systemNotify(enabled: boolean, title: string, body: string): void {
  try {
    if (!enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
    if (sw?.ready) {
      sw.ready.then((r) => r.showNotification(title, { body, icon: 'icon-192.png' })).catch(() => {
        try { new Notification(title, { body }); } catch { /* ignore */ }
      });
    } else {
      new Notification(title, { body });
    }
  } catch {
    /* ignore */
  }
}
