# PRD: Приложение учета склада запчастей спецтехники

## Обзор проекта

Мобильное приложение для учета запчастей на складе, специализированное для работы с деталями спецтехники (тракторы, КамАЗы и другая техника). Приложение разрабатывается на React Native Expo CLI с хранением данных на российских серверах.

## Основные цели

- Эффективный учет запчастей спецтехники
- Отслеживание прихода и расхода деталей
- Ведение истории ремонтных работ
- Синхронизация данных между устройствами
- Гибкая настройка характеристик запчастей

## Технические требования

### Платформа
- React Native Expo CLI
- Поддержка iOS и Android
- База данных на российских серверах
- Офлайн режим с синхронизацией

### Устройства и синхронизация
- Работа на смартфонах и планшетах
- Синхронизация внутри аккаунта
- Отслеживание изменений по устройствам
- История операций с указанием источника изменений

## Функциональные требования

### Главная навигация (Bottom Tab Bar)
1. **Склад** - просмотр и управление запчастями
2. **Приход** - регистрация поступления товаров
3. **Расход** - учет выдачи запчастей
4. **Ремонт** - ведение ремонтных работ
5. **Настройки** - конфигурация приложения

### Модуль "Склад"
- Каталог всех запчастей
- Фильтрация и поиск
- Информация о количестве и местоположении
- Распределение по контейнерам
- Сканирование штрих-кодов и QR-кодов

### Модуль "Приход"
- Регистрация новых поступлений
- Добавление запчастей в систему
- Привязка к поставщикам
- Документооборот

### Модуль "Расход"
- Списание запчастей
- Указание цели использования
- Привязка к заказам/работам
- Контроль остатков

### Модуль "Ремонт"
- **Техника:**
  - Добавление единиц техники
  - Характеристики техники (настраиваемые поля)
  - История ремонтов
  
- **Ремонтные работы:**
  - Создание ремонтного заказа
  - Привязка к технике
  - Списание использованных запчастей
  - Добавление работ и услуг
  - Настраиваемые поля для записи информации

### Модуль "Настройки"
- **Пользовательские характеристики:**
  - Добавление типов запчастей
  - Настройка специфичных характеристик
  - Управление категориями
  
- **Системные настройки:**
  - Управление аккаунтом
  - Настройки синхронизации
  - Конфигурация контейнеров
  - Управление доступом

## Структура данных

### Запчасти
- Название
- Артикул/код
- Тип (настраиваемый)
- Характеристики (настраиваемые поля)
- Количество
- Контейнер/местоположение
- Штрих-код/QR-код
- Поставщик
- Цена

### Контейнеры
- Название/номер
- Описание
- Местоположение
- Вместимость

### Техника
- Тип техники
- Модель
- Серийный номер
- Год выпуска
- Настраиваемые характеристики
- История ремонтов

### История операций
- Тип операции (приход/расход/ремонт)
- Дата и время
- Пользователь
- Устройство
- Детали операции

## Дополнительные возможности

### Сканирование
- Поддержка штрих-кодов
- Поддержка QR-кодов
- Быстрое добавление/поиск запчастей

### Отчетность
- Отчеты по остаткам
- История движения запчастей
- Отчеты по ремонтам
- Экспорт данных

### Безопасность
- Авторизация пользователей
- Разграничение доступа
- Резервное копирование
- Шифрование данных

## Критерии успеха

1. Простота использования персоналом склада
2. Быстрая синхронизация между устройствами
3. Надежность работы в условиях слабого интернета
4. Гибкость настройки под специфику предприятия
5. Точность учета остатков запчастей

## Этапы разработки

### Этап 1: MVP
- Базовый учет запчастей
- Простые операции прихода/расхода
- Основная навигация

### Этап 2: Расширенный функционал
- Модуль ремонтов
- Сканирование кодов
- Настраиваемые поля

### Этап 3: Оптимизация
- Улучшение производительности
- Расширенная отчетность
- Дополнительные интеграции