import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { DataProvider, useData } from './src/context/DataContext';

import WarehouseScreen from './src/screens/WarehouseScreen';
import ArrivalScreen from './src/screens/ArrivalScreen';
import ExpenseScreen from './src/screens/ExpenseScreen';
import RepairScreen from './src/screens/RepairScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ContainerManagementScreen from './src/screens/ContainerManagementScreen';
import FieldConfigurationScreen from './src/screens/FieldConfigurationScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';
import EquipmentDetailScreen from './src/screens/EquipmentDetailScreen';
import PartDetailScreen from './src/screens/PartDetailScreen';
import PartTypesManagementScreen from './src/screens/PartTypesManagementScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import LoginScreen from './src/screens/LoginScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import UserManagementScreen from './src/screens/UserManagementScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function SettingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="SettingsMain" 
        component={SettingsScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ContainerManagement" 
        component={ContainerManagementScreen} 
        options={{ 
          headerTitle: 'Управление контейнерами',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name="FieldConfiguration" 
        component={FieldConfigurationScreen} 
        options={{ 
          headerTitle: 'Настройка полей',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name="Statistics" 
        component={StatisticsScreen} 
        options={{ 
          headerTitle: 'Статистика',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name="PartTypesManagement" 
        component={PartTypesManagementScreen} 
        options={{ 
          headerTitle: 'Типы запчастей',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name="Reports" 
        component={ReportsScreen} 
        options={{ 
          headerTitle: 'Отчеты',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name="UserManagement" 
        component={UserManagementScreen} 
        options={{ 
          headerTitle: 'Сотрудники',
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}

function WarehouseStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="WarehouseMain" 
        component={WarehouseScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PartDetail" 
        component={PartDetailScreen} 
        options={{ 
          headerTitle: 'Карточка товара',
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}

function ArrivalStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ArrivalMain" 
        component={ArrivalScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PartDetail" 
        component={PartDetailScreen} 
        options={{ 
          headerTitle: 'Карточка товара',
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}

function ExpenseStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ExpenseMain" 
        component={ExpenseScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PartDetail" 
        component={PartDetailScreen} 
        options={{ 
          headerTitle: 'Карточка товара',
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}

function RepairStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="RepairMain" 
        component={RepairScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="EquipmentDetail" 
        component={EquipmentDetailScreen} 
        options={{ 
          headerTitle: 'Информация о технике',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name="PartDetail" 
        component={PartDetailScreen} 
        options={{ 
          headerTitle: 'Карточка товара',
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}

function MainTabNavigator() {
  const { isDarkTheme, getThemeColors } = useData();
  const themeColors = getThemeColors();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Warehouse') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Arrival') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Expense') {
            iconName = focused ? 'remove-circle' : 'remove-circle-outline';
          } else if (route.name === 'Repair') {
            iconName = focused ? 'construct' : 'construct-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
        tabBarStyle: {
          backgroundColor: themeColors.tabBarBackground,
          borderTopColor: themeColors.border,
          borderTopWidth: 1,
          paddingTop: 4,
          paddingBottom: 20,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Warehouse" 
        component={WarehouseStack}
        options={{
          tabBarLabel: 'Склад',
        }}
      />
      <Tab.Screen 
        name="Arrival" 
        component={ArrivalStack}
        options={{
          tabBarLabel: 'Приход',
        }}
      />
      <Tab.Screen 
        name="Expense" 
        component={ExpenseStack}
        options={{
          tabBarLabel: 'Расход',
        }}
      />
      <Tab.Screen 
        name="Repair" 
        component={RepairStack}
        options={{
          tabBarLabel: 'Ремонт',
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsStack}
        options={{
          tabBarLabel: 'Настройки',
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { isDarkTheme, getThemeColors } = useData();
  const { user, loading, isFirstLaunch, isAuthenticated } = useAuth();
  const themeColors = getThemeColors();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }}>
        <Text style={{ color: themeColors.text, fontSize: 18, marginBottom: 16 }}>Загрузка...</Text>
      </View>
    );
  }

  // Show welcome screen on first launch
  if (isFirstLaunch && !isAuthenticated()) {
    return (
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Main" component={MainTabNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated()) {
    return (
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Main" component={MainTabNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Main authenticated app  
  const navigationTheme = {
    ...isDarkTheme ? DarkTheme : DefaultTheme,
    colors: {
      ...(isDarkTheme ? DarkTheme.colors : DefaultTheme.colors),
      primary: themeColors.primary,
      background: themeColors.background,
      card: themeColors.surface,
      text: themeColors.text,
      border: themeColors.border,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen 
          name="AuthModal" 
          component={AuthModalStack}
          options={{ 
            presentation: 'modal',
            headerShown: false 
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AuthModalStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ 
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen} 
        options={{ 
          headerShown: false
        }}
      />
    </Stack.Navigator>
  );
}

  export default function App() {
    return (
      <AuthProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </AuthProvider>
    );
  }
