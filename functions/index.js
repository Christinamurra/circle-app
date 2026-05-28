const functions = require('firebase-functions/v1')
const { initializeApp } = require('firebase-admin/app')
const { getMessaging } = require('firebase-admin/messaging')

initializeApp()

exports.sendNudgeNotification = functions.firestore
  .document('users/{uid}')
  .onWrite(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()

    if (!after?.nudge) return
    if (JSON.stringify(before?.nudge) === JSON.stringify(after?.nudge)) return

    const fcmToken = after.fcmToken
    if (!fcmToken) return

    const fromName = after.nudge.from || 'Someone'

    try {
      await getMessaging().send({
        token: fcmToken,
        notification: {
          title: '👋 You got nudged!',
          body: `${fromName} is rooting for you — time to show up!`,
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      })
    } catch (e) {
      console.error('Push failed', e)
    }
  })
