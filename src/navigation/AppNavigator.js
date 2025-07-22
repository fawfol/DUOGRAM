// DUOGRAM/src/navigation/AppNavigator.js

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import LoginScreen from '../screens/Auth/LoginScreen';
import PairScreen from '../screens/Auth/PairScreen';
import AccountScreen from '../screens/AccountScreen';
import AuthLoadingScreen from '../screens/Auth/AuthLoadingScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="AuthLoading">
      <Stack.Screen
        name="AuthLoading"
        component={AuthLoadingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Pair"
        component={PairScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{
          headerShown: true,
          title: "Your Account",
          headerBackTitle: "Back",
          headerTitleStyle: {
            fontSize: 22,
            fontWeight: "bold",
          },
          headerTintColor: "#007AFF",
        }}
      />
    </Stack.Navigator>
  );
}
