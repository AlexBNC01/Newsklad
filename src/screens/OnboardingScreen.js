import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Animated,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    title: '📦 Управление складом',
    description: 'Учет запчастей с фотографиями, штрих-кодами и организацией по контейнерам. Быстрый поиск и актуальные остатки.',
    icon: '📦',
    color: '#667eea',
  },
  {
    id: 2, 
    title: '🔧 Ремонты техники',
    description: 'Ведите историю ремонтов, назначайте персонал, отслеживайте использованные запчасти и считайте затраты.',
    icon: '🔧',
    color: '#f093fb',
  },
  {
    id: 3,
    title: '📊 Отчеты и аналитика', 
    description: 'Формируйте красивые PDF отчеты по любым параметрам. Анализируйте расходы и эффективность работы.',
    icon: '📊',
    color: '#4facfe',
  },
  {
    id: 4,
    title: '👥 Командная работа',
    description: 'Приглашайте сотрудников, настраивайте роли и разрешения. Все изменения синхронизируются мгновенно!',
    icon: '👥',
    color: '#43e97b',
  }
];

export default function OnboardingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (evt, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (Math.abs(gestureState.dx) > SCREEN_WIDTH * 0.3) {
          if (gestureState.dx > 0 && currentIndex > 0) {
            goToPrevious();
          } else if (gestureState.dx < 0 && currentIndex < slides.length - 1) {
            goToNext();
          } else {
            resetPosition();
          }
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const resetPosition = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      Animated.spring(translateX, {
        toValue: -SCREEN_WIDTH,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(currentIndex + 1);
        translateX.setValue(0);
      });
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      Animated.spring(translateX, {
        toValue: SCREEN_WIDTH,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(currentIndex - 1);
        translateX.setValue(0);
      });
    }
  };

  const handleStart = () => {
    navigation.replace('Main');
  };

  const handleSkip = () => {
    navigation.replace('Main');
  };

  const currentSlide = slides[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={currentSlide.color} />
      
      <LinearGradient
        colors={[currentSlide.color, `${currentSlide.color}dd`]}
        style={styles.gradient}
      >
        {/* Skip кнопка */}
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Пропустить</Text>
        </TouchableOpacity>

        {/* Основной контент */}
        <View style={styles.content} {...panResponder.panHandlers}>
          <Animated.View 
            style={[
              styles.slideContainer,
              { transform: [{ translateX }] }
            ]}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.slideIcon}>{currentSlide.icon}</Text>
            </View>
            
            <Text style={styles.slideTitle}>{currentSlide.title}</Text>
            <Text style={styles.slideDescription}>{currentSlide.description}</Text>
          </Animated.View>
        </View>

        {/* Индикаторы */}
        <View style={styles.indicators}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentIndex && styles.activeIndicator
              ]}
            />
          ))}
        </View>

        {/* Навигация */}
        <View style={styles.navigation}>
          {currentIndex > 0 && (
            <TouchableOpacity style={styles.navButton} onPress={goToPrevious}>
              <Ionicons name="arrow-back" size={24} color="white" />
              <Text style={styles.navText}>Назад</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.navSpacer} />
          
          {currentIndex < slides.length - 1 ? (
            <TouchableOpacity style={styles.navButton} onPress={goToNext}>
              <Text style={styles.navText}>Далее</Text>
              <Ionicons name="arrow-forward" size={24} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.startButton} onPress={handleStart}>
              <Text style={styles.startButtonText}>Начать работу 🚀</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Свайп подсказка (только на первом слайде) */}
        {currentIndex === 0 && (
          <View style={styles.swipeHint}>
            <Text style={styles.swipeHintText}>← Свайпните для навигации →</Text>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  slideContainer: {
    alignItems: 'center',
    width: SCREEN_WIDTH - 80,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  slideIcon: {
    fontSize: 60,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  slideDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: 'white',
    width: 20,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  navText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: 8,
  },
  navSpacer: {
    flex: 1,
  },
  startButton: {
    backgroundColor: 'white',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  swipeHint: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  swipeHintText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
});