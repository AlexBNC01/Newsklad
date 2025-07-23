# 🔥 Настройка Firebase для многопользовательской работы

## 📋 Шаги настройки Firebase

### 1. Создание проекта Firebase
1. Идите на [Firebase Console](https://console.firebase.google.com/)
2. Нажмите **"Создать проект"**
3. Укажите название: `sklreact-warehouse` (или любое другое)
4. Отключите Google Analytics (не обязательно для склада)
5. Создайте проект

### 2. Настройка Authentication
1. В боковом меню выберите **Authentication**
2. Перейдите на вкладку **Sign-in method**
3. Включите **Email/Password** провайдер
4. При необходимости включите **Google** провайдер

### 3. Настройка Firestore Database
1. В боковом меню выберите **Firestore Database**
2. Нажмите **"Создать базу данных"**
3. Выберите **"Начать в тестовом режиме"** (для разработки)
4. Выберите регион (например, `europe-west1`)

### 4. Настройка правил Firestore
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Пользователи могут читать/писать только свои данные и данные своей компании
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /companies/{companyId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId == companyId;
    }
    
    match /companies/{companyId}/{document=**} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId == companyId;
    }
    
    match /invites/{inviteId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager'];
    }
  }
}
```

### 5. Настройка Storage (для фотографий)
1. В боковом меню выберите **Storage**
2. Нажмите **"Начать"**
3. Выберите **"Начать в тестовом режиме"**
4. Выберите тот же регион

### 6. Настройка правил Storage
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /companies/{companyId}/{allPaths=**} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId == companyId;
    }
  }
}
```

### 7. Получение конфигурации
1. В **Project Overview** нажмите на **шестеренку** → **Project settings**
2. Прокрутите вниз до **"Your apps"**
3. Нажмите **"Add app"** → выберите **Web** (символ `</>`))
4. Укажите nickname: `SKL React Warehouse`
5. Скопируйте конфигурацию `firebaseConfig`

### 8. Обновление конфигурации в коде
Откройте файл `firebase-config.js` и замените:
```javascript
const firebaseConfig = {
  apiKey: "your-api-key-here", // <-- Замените
  authDomain: "your-project.firebaseapp.com", // <-- Замените
  projectId: "your-project-id", // <-- Замените
  storageBucket: "your-project.appspot.com", // <-- Замените
  messagingSenderId: "123456789", // <-- Замените
  appId: "your-app-id" // <-- Замените
};
```

### 9. Установка зависимостей Firebase
```bash
npm install firebase
```

## 🚀 Следующие шаги

### A. Реальная интеграция с Firebase
После настройки Firebase нужно будет:

1. **AuthContext.js** - заменить заглушки на реальные вызовы Firebase
2. **DataContext.js** - интегрировать с Firestore для синхронизации данных
3. **Тестирование** - проверить регистрацию, вход и синхронизацию

### B. Дополнительные функции

1. **Cloud Functions** для:
   - Отправки приглашений по email
   - Автоматического создания структуры данных компании
   - Обработки подписок и платежей

2. **Firebase Cloud Messaging** для:
   - Push-уведомлений о новых операциях
   - Уведомлений о низких остатках
   - Напоминаний о техническом обслуживании

3. **Analytics** для:
   - Отслеживания использования приложения
   - Оптимизации функций
   - Понимания потребностей пользователей

## 🔐 Система ролей и разрешений

### Роли:
- **Администратор** - полный доступ
- **Менеджер** - управление операциями, просмотр отчетов  
- **Сотрудник** - базовые операции со складом

### Разрешения:
- `canManageUsers` - управление пользователями
- `canManageEquipment` - управление техникой
- `canManageInventory` - управление складом
- `canViewReports` - просмотр отчетов
- `canExportData` - экспорт данных

## 💰 Ценообразование Firebase (ориентировочно)

### Бесплатный план (Spark):
- 50,000 операций чтения/день
- 20,000 операций записи/день
- 1 GB хранилища
- 10 GB трафика/месяц

### Платный план (Blaze):
- $0.06 за 100,000 операций чтения
- $0.18 за 100,000 операций записи
- $0.18 за GB хранилища/месяц
- $0.12 за GB трафика

**Для малого бизнеса:** ~$5-15/месяц
**Для среднего бизнеса:** ~$15-50/месяц

## 📞 Поддержка

При возникновении вопросов по настройке Firebase:
1. Проверьте [документацию Firebase](https://firebase.google.com/docs)
2. Обратитесь к разработчику приложения