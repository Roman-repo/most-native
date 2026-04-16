import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAYBNM9q7nrJzaLftmD7XfRChmzc9vEPUg",
  authDomain: "pulse-chat-6b66e.firebaseapp.com",
  databaseURL: "https://pulse-chat-6b66e-default-rtdb.firebaseio.com",
  projectId: "pulse-chat-6b66e",
  storageBucket: "pulse-chat-6b66e.firebasestorage.app",
  messagingSenderId: "1036467352069",
  appId: "1:1036467352069:web:34d67625e45eec3fcf626c"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);
