import React from 'react';
import { View, Text, Button, Alert, StyleSheet, Platform } from 'react-native';
import { NativeModules } from 'react-native';

// Safely get the module
const PrinterModule = NativeModules.PrinterModule;

if (!PrinterModule && __DEV__) {
  console.warn(
    '⚠️ PrinterModule is not available. ' +
      'If you are running in Expo Go, use a custom dev build (npx expo run:android).'
  );
}

export default function HomeScreen() {
  const checkPrinter = async () => {
    if (!PrinterModule) {
      Alert.alert(
        'Unavailable',
        'Printer module not found. Run "npx expo run:android" to use native features.'
      );
      return;
    }

    try {
      const result = await PrinterModule.checkPrinterService();
      Alert.alert('Printer Status', result);
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    }
  };

  const handlePrint = async () => {
    if (!PrinterModule) {
      Alert.alert(
        'Unavailable',
        'Printer module not found. Run "npx expo run:android" to use native features.'
      );
      return;
    }

    try {
      const result = await PrinterModule.printText('Hello from Printer!\nTest Receipt\n\n');
      Alert.alert('Success', result);
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    }
  };

  const printReceipt = async () => {
    if (!PrinterModule) {
      Alert.alert(
        'Unavailable',
        'Printer module not found. Run "npx expo run:android" to use native features.'
      );
      return;
    }

    try {
      await PrinterModule.printTextWithFormat('RECEIPT\n', {
        textSize: 32,
        alignment: 1, // center
        bold: true,
      });

      await PrinterModule.printText('------------------------\n');
      await PrinterModule.printText('Item 1    $10.00\n');
      await PrinterModule.printText('Item 2    $20.00\n');
      await PrinterModule.printText('------------------------\n');

      await PrinterModule.printTextWithFormat('Total: $30.00\n\n', {
        textSize: 28,
        bold: true,
      });

      await PrinterModule.printQRCode('RECEIPT-12345', {
        width: 200,
        height: 200,
        alignment: 1,
      });

      Alert.alert('Success', 'Receipt printed!');
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Printer Test App</Text>

      <Button title="Check Printer Status" onPress={checkPrinter} />
      <View style={styles.spacer} />

      <Button title="Print Simple Text" onPress={handlePrint} />
      <View style={styles.spacer} />

      <Button title="Print Full Receipt" onPress={printReceipt} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  spacer: {
    height: 15,
  },
});
