package com.nadeen_3102.MyPrinterApp

import android.os.RemoteException
import android.util.Log
import com.facebook.react.bridge.*
import net.nyx.printerservice.print.PrintTextFormat
import net.nyx.printerservice.print.IPrinterService
import android.content.ComponentName
import android.content.Context
import android.content.ServiceConnection
import android.os.IBinder

class PrinterModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var printerService: IPrinterService? = null
  private val context: ReactApplicationContext = reactContext

  override fun getName() = "PrinterModule"

  private val connection = object : ServiceConnection {
    override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
      printerService = IPrinterService.Stub.asInterface(service)
      Log.d("PrinterModule", "✅ Printer service connected")
    }

    override fun onServiceDisconnected(name: ComponentName?) {
      printerService = null
      Log.e("PrinterModule", "❌ Printer service disconnected")
    }
  }

  init {
    try {
      val intent = android.content.Intent()
      intent.setPackage("net.nyx.printerservice")
      intent.action = "net.nyx.printerservice.IPrinterService"
      context.bindService(intent, connection, Context.BIND_AUTO_CREATE)
    } catch (e: Exception) {
      Log.e("PrinterModule", "❌ Failed to bind printer service: ${e.message}")
    }
  }

  // ✅ Check printer service and status
  @ReactMethod
  fun checkPrinterService(promise: Promise) {
    try {
      if (printerService == null) {
        promise.reject("NO_SERVICE", "❌ Printer service not connected")
        return
      }

      val status = printerService?.printerStatus ?: -1
      val message = when (status) {
        0 -> "✅ Printer is ready"
        1 -> "⚠️ Printer is busy"
        2 -> "❌ Printer out of paper"
        3 -> "⚠️ Printer overheating"
        4 -> "⚠️ Printer cover open"
        else -> "❓ Unknown printer status: $status"
      }

      promise.resolve(message)
    } catch (e: RemoteException) {
      promise.reject("STATUS_ERROR", "Error getting printer status: ${e.message}")
    } catch (e: Exception) {
      promise.reject("STATUS_ERROR", "Unexpected error: ${e.message}")
    }
  }

  // ✅ Print plain text
  @ReactMethod
  fun printText(text: String, promise: Promise) {
    try {
      if (printerService == null) {
        promise.reject("NO_SERVICE", "❌ Printer service not connected")
        return
      }

      val format = PrintTextFormat()
      val result = printerService?.printText(text, format) ?: -999

      when (result) {
        0 -> promise.resolve("✅ Printed successfully")
        -1 -> promise.reject("PRINT_ERROR", "❌ General printer error")
        -2 -> promise.reject("NO_PAPER", "❌ Out of paper")
        -3 -> promise.reject("NO_PRINTER", "⚠️ Printer device not found")
        else -> promise.reject("UNKNOWN_ERROR", "⚠️ Unknown print error (code $result)")
      }
    } catch (e: RemoteException) {
      promise.reject("PRINT_ERROR", "RemoteException: ${e.message}")
    } catch (e: Exception) {
      promise.reject("PRINT_ERROR", "Unexpected error: ${e.message}")
    }
  }

  // ✅ Print formatted text
  @ReactMethod
  fun printTextWithFormat(text: String, options: ReadableMap, promise: Promise) {
    try {
      if (printerService == null) {
        promise.reject("NO_SERVICE", "❌ Printer service not connected")
        return
      }

      val format = PrintTextFormat()
      if (options.hasKey("textSize")) format.textSize = options.getInt("textSize")
      if (options.hasKey("alignment")) format.ali = options.getInt("alignment")
      if (options.hasKey("bold")) format.style = if (options.getBoolean("bold")) 1 else 0

      val result = printerService?.printText(text, format) ?: -999

      when (result) {
        0 -> promise.resolve("✅ Printed with format successfully")
        -2 -> promise.reject("NO_PAPER", "❌ Out of paper")
        -3 -> promise.reject("NO_PRINTER", "⚠️ Printer not found")
        else -> promise.reject("PRINT_FAILED", "⚠️ Failed to print (code $result)")
      }
    } catch (e: Exception) {
      promise.reject("PRINT_ERROR", "Error printing formatted text: ${e.message}")
    }
  }

  // ✅ Print QR Code
  @ReactMethod
  fun printQRCode(data: String, options: ReadableMap, promise: Promise) {
    try {
      if (printerService == null) {
        promise.reject("NO_SERVICE", "❌ Printer service not connected")
        return
      }

      val width = if (options.hasKey("width")) options.getInt("width") else 300
      val height = if (options.hasKey("height")) options.getInt("height") else 300
      val alignment = if (options.hasKey("alignment")) options.getInt("alignment") else 1

      val result = printerService?.printQrCode(data, width, height, alignment) ?: -999

      when (result) {
        0 -> promise.resolve("✅ QR code printed successfully")
        -2 -> promise.reject("NO_PAPER", "❌ Out of paper while printing QR code")
        -3 -> promise.reject("NO_PRINTER", "⚠️ Printer not found for QR code")
        else -> promise.reject("QR_PRINT_FAILED", "⚠️ QR print failed (code $result)")
      }
    } catch (e: Exception) {
      promise.reject("PRINT_ERROR", "Error printing QR code: ${e.message}")
    }
  }

  // ✅ Print Barcode
  @ReactMethod
  fun printBarcode(data: String, options: ReadableMap, promise: Promise) {
    try {
      if (printerService == null) {
        promise.reject("NO_SERVICE", "❌ Printer service not connected")
        return
      }

      val width = if (options.hasKey("width")) options.getInt("width") else 300
      val height = if (options.hasKey("height")) options.getInt("height") else 160
      val barcodeType = if (options.hasKey("type")) options.getInt("type") else 1  // 1=CODE128
      val alignment = if (options.hasKey("alignment")) options.getInt("alignment") else 1
      val textPosition = if (options.hasKey("textPosition")) options.getInt("textPosition") else 0

      val result = printerService?.printBarcode(data, width, height, barcodeType, alignment, textPosition) ?: -999

      when (result) {
        0 -> promise.resolve("✅ Barcode printed successfully")
        -2 -> promise.reject("NO_PAPER", "❌ Out of paper while printing barcode")
        -3 -> promise.reject("NO_PRINTER", "⚠️ Printer not found for barcode")
        else -> promise.reject("BARCODE_ERROR", "⚠️ Failed to print barcode (code $result)")
      }
    } catch (e: Exception) {
      promise.reject("BARCODE_ERROR", "Error printing barcode: ${e.message}")
    }
  }

  // ✅ Send ESC/POS Command
  @ReactMethod
  fun sendEscPosCommand(bytesArray: ReadableArray, promise: Promise) {
    try {
      if (printerService == null) {
        promise.reject("NO_SERVICE", "❌ Printer service not connected")
        return
      }

      // Convert JS array to ByteArray
      val bytes = ByteArray(bytesArray.size()) { i -> bytesArray.getInt(i).toByte() }

      printerService?.printEscposData(bytes)
      promise.resolve("✅ ESC/POS command sent successfully")

    } catch (e: RemoteException) {
      promise.reject("ESC_ERROR", "RemoteException while sending ESC/POS: ${e.message}")
    } catch (e: Exception) {
      promise.reject("ESC_ERROR", "Unexpected ESC/POS error: ${e.message}")
    }
  }

  // ✅ Feed and auto cut paper
  @ReactMethod
  fun autoCutPaper(promise: Promise) {
    try {
      if (printerService == null) {
        promise.reject("NO_SERVICE", "❌ Printer service not connected")
        return
      }

      val format = PrintTextFormat()
      printerService?.printText("\n\n\n", format)

      val result = printerService?.printEndAutoOut() ?: -999

      when (result) {
        0 -> promise.resolve("✅ Paper cut successfully (auto out)")
        -1 -> promise.reject("CUT_ERROR", "❌ Failed to cut paper")
        else -> promise.reject("UNKNOWN_ERROR", "⚠️ Unknown cut error (code $result)")
      }
    } catch (e: RemoteException) {
      promise.reject("CUT_ERROR", "RemoteException during cut: ${e.message}")
    } catch (e: Exception) {
      promise.reject("CUT_ERROR", "Unexpected error: ${e.message}")
    }
  }
}
