import { initializeApp } from 'firebase/app'
import { initializeAuth, indexedDBLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyCzqJvLpwlAs84Ed2wCXBXrFO4qIZeYjEs",
  authDomain: "circle-7ebf2.firebaseapp.com",
  projectId: "circle-7ebf2",
  storageBucket: "circle-7ebf2.firebasestorage.app",
  messagingSenderId: "1077625687527",
  appId: "1:1077625687527:web:083c6c793aae43e1f8142"
}

const app = initializeApp(firebaseConfig)
export const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence
})
export const db = getFirestore(app)
export const storage = getStorage(app)
