import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

export default function WelcomeScreen({ navigation }) {
  const { signInAsGuest } = useAuth();

  const handleGuestMode = async () => {
    const result = await signInAsGuest();
    if (result.success) {
      navigation.replace('Main');
    } else {
      Alert.alert('Ошибка', 'Не удалось войти в гостевой режим');
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Логотип и заголовок */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>📦</Text>
            </View>
            <Text style={styles.title}>Skladreact</Text>
            <Text style={styles.subtitle}>
              Управление складом запчастей
            </Text>
          </View>

          {/* Преимущества */}
          <View style={styles.features}>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🚀</Text>
              <Text style={styles.featureText}>Быстрый учет запчастей</Text>
            </View>
            
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>📊</Text>
              <Text style={styles.featureText}>Отчеты и аналитика</Text>
            </View>
            
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>👥</Text>
              <Text style={styles.featureText}>Командная работа</Text>
            </View>
            
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>📱</Text>
              <Text style={styles.featureText}>Синхронизация устройств</Text>
            </View>
          </View>

          {/* Блок "Бесплатно" */}
          <View style={styles.freeBlock}>
            <Text style={styles.freeTitle}>💫 Полностью бесплатно!</Text>
            <Text style={styles.freeText}>
              Без ограничений по функциям, пользователям или времени
            </Text>
          </View>
        </View>

        {/* Кнопки */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.primaryButtonText}>
              Создать компанию бесплатно 🎉
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.secondaryButtonText}>Уже есть аккаунт? Войти</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleGuestMode}
          >
            <Text style={styles.guestButtonText}>📱 Попробовать без регистрации</Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  features: {
    marginBottom: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 15,
    width: 30,
  },
  featureText: {
    fontSize: 16,
    color: 'white',
    flex: 1,
  },
  freeBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  freeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  freeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttons: {
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  primaryButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#667eea',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: 'white',
    textDecorationLine: 'underline',
  },
  guestButton: {
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  guestButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
});