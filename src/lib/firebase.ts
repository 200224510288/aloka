import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase credentials connecting to the lottery-sales-tracker cloud project
const firebaseConfig = {
  apiKey: "AIzaSyDHu3Z3dYWLxPhOLRpwncs2aoIRcoweFmk",
  authDomain: "lottery-sales-tracker.firebaseapp.com",
  projectId: "lottery-sales-tracker",
  storageBucket: "lottery-sales-tracker.firebasestorage.app",
  messagingSenderId: "602138815206",
  appId: "1:602138815206:web:d1c3fbbb484ef75592e927",
};

// Safe singleton initialization for Result Generator
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Dedicated Firestore instance
export const db = getFirestore(app);

// Dedicated collection / branch for Result Generator
export const CLOUD_BRANCH_COLLECTION = 'result_generator_daily_sheets';
export const CLOUD_SOURCES_COLLECTION = 'result_generator_sources';
