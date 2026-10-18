import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { getTickets, updateTicket } from './storage';
import { checkTicket } from './api';

export const BG_TASK = 'pv-draw-check';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDrawReminder(drawDate: string): Promise<void> {
  const date = new Date(drawDate);
  date.setHours(20, 5, 0, 0);
  if (date > new Date()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Çekiliş Zamanı!',
        body: 'Biletini kontrol etmeye hazır mısın?',
        data: { drawDate },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  }
}

export async function sendWinNotification(prize: number): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🏆 Kazandınız!',
      body: `Tebrikler! ${prize.toLocaleString('tr-TR')}€ ikramiye kazandınız.`,
      sound: true,
    },
    trigger: null,
  });
}

export async function sendNoWinNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Çekiliş Tamamlandı',
      body: 'Bu sefer olmadı. Bir sonraki çekilişte şansını dene!',
    },
    trigger: null,
  });
}

TaskManager.defineTask(BG_TASK, async () => {
  try {
    const tickets = await getTickets();
    const pending = tickets.filter((t) => t.status === 'pending');
    for (const ticket of pending) {
      try {
        const result = await checkTicket({
          lotteryId: ticket.lotteryId,
          balls: ticket.mainBalls,
          bonus: ticket.starBalls,
        });
        await updateTicket(ticket.id, {
          status: result.wins > 0 ? 'won' : 'checked',
          checkResult: result,
        });
        if (result.wins > 0) {
          await sendWinNotification(result.total_prize);
        } else {
          await sendNoWinNotification();
        }
      } catch {
        // skip failed checks silently
      }
    }
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundTask(): Promise<void> {
  try {
    await BackgroundFetch.registerTaskAsync(BG_TASK, {
      minimumInterval: 60 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch {
    // already registered
  }
}
