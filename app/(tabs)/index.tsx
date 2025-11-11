import { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Button, View, ScrollView, Platform, PermissionsAndroid } from 'react-native';
import { NativeModules } from 'react-native';
import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  useStripeTerminal,
} from '@stripe/stripe-terminal-react-native';

const { PrinterModule } = NativeModules;
const SERVER_URL = 'https://printer-production-cc72.up.railway.app';

export default function HomeScreen() {
  const [status, setStatus] = useState<string>('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'warning' | ''>('');
  const [isStripeReady, setIsStripeReady] = useState(false);

  const { discoverReaders, connectReader, connectedReader, initialize } = useStripeTerminal();

  // Initialize Stripe Terminal when component mounts
  useEffect(() => {
    const initStripe = async () => {
      try {
        const result = await initialize();
        if (result.error) {
          showStatus(`⚠️ Stripe init error: ${result.error.message}`, 'warning');
        } else {
          setIsStripeReady(true);
          showStatus('✅ Stripe Terminal ready', 'success');
        }
      } catch (err: any) {
        showStatus(`❌ Failed to init Stripe: ${err.message}`, 'error');
      }
    };

    initStripe();
  }, []);

  const showStatus = (message: string, type: 'success' | 'error' | 'warning' | '') => {
    setStatus(message);
    setStatusType(type);
  };

  /** 🖨️ PRINTER TESTS **/

  const handleCheckService = async () => {
    try {
      const result = await PrinterModule.checkPrinterService();
      showStatus(result, result.includes('✅') ? 'success' : 'warning');
    } catch (e: any) {
      showStatus(e.message || 'Error checking printer', 'error');
    }
  };

  const handlePrintTest = async () => {
    try {
      const result = await PrinterModule.printText('Hello from React Native!');
      await PrinterModule.autoCutPaper();
      showStatus(result, 'success');
    } catch (e: any) {
      showStatus(e.message || 'Error printing text', 'error');
    }
  };

  const handlePrintFormatted = async () => {
    try {
      const result = await PrinterModule.printTextWithFormat('Formatted Hello!', {
        textSize: 28,
        alignment: 1,
        bold: true,
      });
      await PrinterModule.autoCutPaper();
      showStatus(result, 'success');
    } catch (e: any) {
      showStatus(e.message || 'Error printing formatted text', 'error');
    }
  };

  const handlePrintQR = async () => {
    try {
      const result = await PrinterModule.printQRCode('https://example.com', {
        width: 300,
        height: 300,
        alignment: 1,
      });
      await PrinterModule.autoCutPaper();
      showStatus(result, 'success');
    } catch (e: any) {
      showStatus(e.message || 'Error printing QR code', 'error');
    }
  };

  const handlePrintBarcode = async () => {
    try {
      const result = await PrinterModule.printBarcode('123456789012', {
        width: 300,
        height: 150,
        type: 1, // CODE128
        alignment: 1,
        textPosition: 2, // 0=none, 1=above, 2=below
      });
      await PrinterModule.autoCutPaper();
      showStatus(result, 'success');
    } catch (e: any) {
      showStatus(e.message || 'Error printing barcode', 'error');
    }
  };

  const handleSendEscPos = async () => {
    try {
      // ESC @ = Initialize printer
      const result = await PrinterModule.sendEscPosCommand([0x1B, 0x40]);
      showStatus(result, 'success');
    } catch (e: any) {
      showStatus(e.message || 'Error sending ESC/POS command', 'error');
    }
  };

  /** 💳 STRIPE TESTING **/

  const handleTestStripeConnection = async () => {
    try {
      showStatus('Connecting to Stripe server...', '');
      const res = await fetch(`${SERVER_URL}/connection_token`, { method: 'POST' });
      const data = await res.json();

      if (data?.secret) {
        showStatus('✅ Stripe connection successful!', 'success');
      } else {
        showStatus('⚠️ Could not fetch token', 'warning');
      }
    } catch (err: any) {
      showStatus(`❌ Error: ${err.message}`, 'error');
    }
  };

  const handleDiscoverReader = async () => {
    if (!isStripeReady) {
      showStatus('⚠️ Stripe Terminal not initialized yet', 'warning');
      return;
    }

    try {
      showStatus('🔄 Discovering readers...', '');

      const discoverResult: any = await discoverReaders({
        discoveryMethod: 'bluetoothScan',
        simulated: true,
      });

      if (discoverResult.error) {
        showStatus(`❌ ${discoverResult.error.message}`, 'error');
        return;
      }

      const readers = discoverResult.readers ?? [];
      showStatus(`📡 Found ${readers.length} reader(s)`, 'success');
    } catch (err: any) {
      showStatus(`❌ ${err.message}`, 'error');
    }
  };

  const getStatusColor = () => {
    switch (statusType) {
      case 'success':
        return '#2ecc71';
      case 'error':
        return '#e74c3c';
      case 'warning':
        return '#f39c12';
      default:
        return '#bdc3c7';
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      {/* 🖨️ Printer Testing */}
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">🖨️ Printer Testing</ThemedText>

        <View style={styles.buttonContainer}>
          <Button title="Check Service" onPress={handleCheckService} />
          <Button title="Print Text" onPress={handlePrintTest} />
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Print Formatted" onPress={handlePrintFormatted} />
          <Button title="Print QR" onPress={handlePrintQR} />
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Print Barcode" onPress={handlePrintBarcode} />
          <Button title="Send ESC/POS Reset" onPress={handleSendEscPos} />
        </View>
      </ThemedView>

      {/* 💳 Stripe */}
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">💳 Stripe Tap-to-Pay Test</ThemedText>
        
        {!isStripeReady && (
          <ThemedText style={{ color: '#f39c12', marginBottom: 8 }}>
            ⏳ Initializing Stripe Terminal...
          </ThemedText>
        )}

        <View style={styles.buttonContainer}>
          <Button title="Test Stripe Connection" color="#635BFF" onPress={handleTestStripeConnection} />
          <Button 
            title="Discover Reader" 
            color= "#28a745" 
            onPress={handleDiscoverReader}
            
          />
        </View>

        {connectedReader && (
          <ThemedText style={{ color: '#2ecc71', marginTop: 8 }}>
            🔌 Connected Reader: {connectedReader.label}
          </ThemedText>
        )}
      </ThemedView>

      {status ? (
        <View style={[styles.statusBox, { borderColor: getStatusColor() }]}>
          <ThemedText style={{ color: getStatusColor() }}>{status}</ThemedText>
        </View>
      ) : null}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 10,
    marginBottom: 16,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  statusBox: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
});