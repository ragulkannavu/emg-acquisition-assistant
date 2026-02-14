import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Session } from '@/lib/types';

// ─── User Profile ───

export interface UserProfile {
  displayName: string;
  role: string;
  institution: string;
  bio: string;
  email: string;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function saveUserProfile(userId: string, profile: UserProfile): Promise<void> {
  await setDoc(doc(db, 'users', userId), {
    ...profile,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ─── Sessions ───

function sessionsRef(userId: string) {
  return collection(db, 'users', userId, 'sessions');
}

export async function saveSession(userId: string, session: Omit<Session, 'id'>): Promise<string> {
  const docRef = await addDoc(sessionsRef(userId), {
    ...session,
    created_at: serverTimestamp(),
  });
  return docRef.id;
}

export async function getUserSessions(userId: string): Promise<Session[]> {
  const q = query(sessionsRef(userId), orderBy('created_at', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Session[];
}

export async function deleteSessionFromCloud(userId: string, sessionId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'sessions', sessionId));
}
