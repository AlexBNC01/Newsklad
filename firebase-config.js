// Firebase configuration
// Замените эти значения на ваши реальные данные из Firebase Console

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Конфигурация Firebase
// ВНИМАНИЕ: Эти данные нужно заменить на ваши реальные ключи из Firebase Console
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);

// Инициализация сервисов
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

// Структура базы данных Firestore:
/*

/companies/{companyId}
  - name: string
  - settings: object
  - subscription: object
  - createdAt: timestamp
  - updatedAt: timestamp

/users/{userId}
  - email: string
  - displayName: string
  - companyId: string
  - role: 'admin' | 'manager' | 'worker'
  - permissions: object
  - createdAt: timestamp
  - lastActive: timestamp

/companies/{companyId}/parts/{partId}
  - name: string
  - article: string
  - type: string
  - quantity: number
  - price: number
  - containerId: string
  - photos: array
  - barcode: string
  - description: string
  - createdAt: timestamp
  - updatedAt: timestamp

/companies/{companyId}/equipment/{equipmentId}
  - type: string
  - model: string
  - serialNumber: string
  - licensePlate: string
  - year: string
  - status: string
  - engineHours: number
  - mileage: number
  - photos: array
  - createdAt: timestamp
  - updatedAt: timestamp

/companies/{companyId}/transactions/{transactionId}
  - type: 'arrival' | 'expense'
  - partId: string
  - partName: string
  - quantity: number
  - description: string
  - equipmentId: string (optional)
  - userId: string
  - timestamp: timestamp
  - device: string

/companies/{companyId}/repairs/{repairId}
  - equipmentId: string
  - status: 'В процессе' | 'Завершен'
  - startDate: timestamp
  - endDate: timestamp (optional)
  - parts: array
  - staff: array
  - totalCost: number
  - laborCost: number
  - description: string
  - photos: array
  - createdAt: timestamp
  - updatedAt: timestamp

/companies/{companyId}/containers/{containerId}
  - name: string
  - location: string
  - description: string
  - createdAt: timestamp

/companies/{companyId}/staff/{staffId}
  - name: string
  - position: string
  - hourlyRate: number
  - phone: string
  - isActive: boolean
  - createdAt: timestamp

/invites/{inviteId}
  - email: string
  - companyId: string
  - role: string
  - invitedBy: string
  - status: 'pending' | 'accepted' | 'expired'
  - createdAt: timestamp
  - expiresAt: timestamp

*/