import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDLyPmlO2huS5tsDqSxnoUOVMJHRvyhJy0",
  authDomain: "voidcore-studioss.firebaseapp.com",
  projectId: "voidcore-studioss",
  storageBucket: "voidcore-studioss.firebasestorage.app",
  messagingSenderId: "944702754357",
  appId: "1:944702754357:web:0850372368da31a1996b7c",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
