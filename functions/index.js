const { onDocumentWritten } = require('firebase-functions/v2/firestore')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')

initializeApp()

// Fires when users/{uid}.nudge field is written
exports.sendNudgeNotification = onDocumentWritten('users/{uid}', async (event) => {
  const before = event.data?.before?.data()
  const after = event.data?.after?.data()

  // Only trigger when nudge is newly added
  if (!after?.nudge || JSON.stringify(before?.nudge) === JSON.stringify(after?.nudge)) return

  const fcmToken = after.fcmToken
  if (!fcmToken) return

  const nudge = after.nudge
  const fromName = nudge.from || 'Someone'

  try {
    await getMessaging().send({
      token: fcmToken,
      notification: {
        title: '👋 You got nudged!',
        body: `${fromName} is rooting for you — time to show up!`,
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    })
  } catch (e) {
    console.error('Failed to send push notification', e)
  }
})
