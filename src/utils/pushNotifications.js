import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import { db } from '../firebase'
import { doc, updateDoc } from 'firebase/firestore'

export async function registerPushNotifications(uid) {
  if (!Capacitor.isNativePlatform()) return

  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') return

  await PushNotifications.register()

  PushNotifications.addListener('registration', async (token) => {
    try {
      await updateDoc(doc(db, 'users', uid), { fcmToken: token.value })
    } catch (e) {
      console.error('Failed to save push token', e)
    }
  })

  PushNotifications.addListener('registrationError', (err) => {
    console.error('Push registration error', err)
  })
}
