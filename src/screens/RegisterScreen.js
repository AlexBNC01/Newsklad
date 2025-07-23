import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../config/api';

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1 - регистрация, 2 - подтверждение email
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    company_name: '',
    full_name: '',
    email: '',
    password: '',
  });
  
  const [verificationData, setVerificationData] = useState({
    user_id: '',
    code: '',
    email: ''
  });

  const validateForm = () => {
    if (!formData.company_name.trim()) {
      Alert.alert('Ошибка', 'Введите название компании');
      return false;
    }
    if (!formData.full_name.trim()) {
      Alert.alert('Ошибка', 'Введите ваше полное имя');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Ошибка', 'Введите email');
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен содержать минимум 6 символов');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await authAPI.register(formData);
      
      if (result.success) {
        setVerificationData({
          user_id: result.data.user_id,
          email: result.data.email,
          code: ''
        });
        setStep(2);
        
        Alert.alert(
          'Проверьте почту! 📧',
          `Мы отправили код подтверждения на ${result.data.email}. Код действителен 15 минут.`
        );
      }
    } catch (error) {
      Alert.alert('Ошибка регистрации', error.message || 'Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (verificationData.code.length !== 6) {
      Alert.alert('Ошибка', 'Введите код из 6 цифр');
      return;
    }

    setLoading(true);
    try {
      const result = await authAPI.verifyEmail({
        user_id: verificationData.user_id,
        code: verificationData.code
      });

      if (result.success) {
        // Сохраняем токены
        await AsyncStorage.multiSet([
          ['access_token', result.data.tokens.access_token],
          ['refresh_token', result.data.tokens.refresh_token],
        ]);

        Alert.alert(
          'Добро пожаловать! 🎉',
          'Email подтвержден! Ваша компания создана и готова к работе.',
          [{ 
            text: 'Начать работу', 
            onPress: () => navigation.goBack()
          }]
        );
      }
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Неверный код подтверждения');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const result = await authAPI.resendVerification(verificationData.user_id);
      if (result.success) {
        Alert.alert('Успешно', 'Новый код отправлен на вашу почту');
      }
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось отправить код');
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
          {/* Кнопка закрытия */}
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep(1)}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              
              <Text style={styles.title}>Подтверждение email 📧</Text>
              <Text style={styles.subtitle}>
                Мы отправили код подтверждения на{'\n'}
                <Text style={styles.email}>{verificationData.email}</Text>
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.codeInputContainer}>
                <TextInput
                  style={styles.codeInput}
                  placeholder="000000"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  value={verificationData.code}
                  onChangeText={(text) => 
                    setVerificationData({...verificationData, code: text.replace(/[^0-9]/g, '')})
                  }
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  (loading || verificationData.code.length !== 6) && styles.buttonDisabled
                ]}
                onPress={handleVerifyEmail}
                disabled={loading || verificationData.code.length !== 6}
              >
                {loading ? (
                  <ActivityIndicator color="#667eea" />
                ) : (
                  <Text style={styles.buttonText}>Подтвердить email</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Не получили код?</Text>
                <TouchableOpacity onPress={handleResendCode} disabled={loading}>
                  <Text style={styles.resendLink}>Отправить повторно</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
        {/* Кнопка закрытия */}
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            <Text style={styles.title}>Создайте свою компанию 🏢</Text>
            <Text style={styles.subtitle}>
              Полностью бесплатно • Неограниченные возможности
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={20} color="rgba(255, 255, 255, 0.7)" />
              <TextInput
                style={styles.input}
                placeholder="Название компании"
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={formData.company_name}
                onChangeText={(text) => setFormData({...formData, company_name: text})}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="rgba(255, 255, 255, 0.7)" />
              <TextInput
                style={styles.input}
                placeholder="Ваше полное имя"
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={formData.full_name}
                onChangeText={(text) => setFormData({...formData, full_name: text})}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="rgba(255, 255, 255, 0.7)" />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text.toLowerCase()})}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="rgba(255, 255, 255, 0.7)" />
              <TextInput
                style={styles.input}
                placeholder="Пароль (минимум 6 символов)"
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={formData.password}
                onChangeText={(text) => setFormData({...formData, password: text})}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="rgba(255, 255, 255, 0.7)" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#667eea" />
              ) : (
                <Text style={styles.buttonText}>Создать компанию 🚀</Text>
              )}
            </TouchableOpacity>

            <View style={styles.agreementContainer}>
              <Text style={styles.agreementText}>
                Регистрируясь, вы соглашаетесь с{' '}
                <Text style={styles.linkText}>условиями использования</Text>
                {' '}и{' '}
                <Text style={styles.linkText}>политикой конфиденциальности</Text>
              </Text>
            </View>
          </View>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Уже есть аккаунт? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Войти</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    left: -10,
    top: 20,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  email: {
    fontWeight: 'bold',
    color: 'white',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    paddingLeft: 10,
    fontSize: 16,
    color: 'white',
  },
  codeInputContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  codeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 200,
  },
  button: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#667eea',
  },
  agreementContainer: {
    marginBottom: 30,
  },
  agreementText: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  linkText: {
    color: 'white',
    textDecorationLine: 'underline',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  resendLink: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  loginText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  loginLink: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});