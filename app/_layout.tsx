import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { StripeTerminalProvider } from '@stripe/stripe-terminal-react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

const SERVER_URL = 'https://printer-production-cc72.up.railway.app';

// This function is required by TerminalProvider. 
// It fetches a connection token from your backend.
const fetchConnectionToken = async () => {
  const response = await fetch(`${SERVER_URL}/connection_token`, { method: 'POST' });
  const data = await response.json();

  if (!data.secret) {
    throw new Error('Failed to fetch connection token secret from backend.');
  }
  return data.secret;
};

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <StripeTerminalProvider
      logLevel="verbose"
      tokenProvider={fetchConnectionToken}
    >
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </StripeTerminalProvider>
  );
}