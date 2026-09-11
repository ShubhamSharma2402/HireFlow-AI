import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAUdvq7_AVTlFXHlnnKBj9V0iODBzaeZXk",
  authDomain: "jobb-8efa6.firebaseapp.com",
  projectId: "jobb-8efa6",
  storageBucket: "jobb-8efa6.firebasestorage.app",
  messagingSenderId: "385469657597",
  appId: "1:385469657597:web:bd122f2058ad1376c8a994",
  measurementId: "G-7XFXS7LWQ0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
