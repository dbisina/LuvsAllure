// frontend/src/services/paymentService.js - Fixed transaction reference generation
import api from './api';
import { 
  initializeInlinePayment, 
  verifyPayment as verifyPaymentConfig, 
  createPaymentUrl 
} from '../config/paystackConfig';

const paymentService = {
  // Initialize payment with Paystack
  initializePayment: async (paymentData) => {
    try {
      const response = await api.post('/payment/initialize', paymentData);
      return response.data;
    } catch (error) {
      console.error('Error initializing payment:', error);
      throw error.response?.data || { message: 'Payment initialization failed' };
    }
  },

  // Verify payment status
  verifyPayment: async (reference) => {
    try {
      return await verifyPaymentConfig(reference);
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error.response?.data || { message: 'Payment verification failed' };
    }
  },

  // Get list of banks (for bank transfers)
  getBanks: async () => {
    try {
      const response = await api.get('/payment/banks');
      return response.data;
    } catch (error) {
      console.error('Error fetching banks:', error);
      throw error.response?.data || { message: 'Failed to fetch banks' };
    }
  },

  // Process payment using Paystack Popup
  processPaymentWithPopup: async (orderData) => {
    try {
      // Create the payment URL for redirect
      const paymentUrl = await createPaymentUrl({
        email: orderData.email,
        amount: orderData.amount,
        reference: orderData.reference,
        orderId: orderData.orderId,
        customerName: `${orderData.firstName} ${orderData.lastName}`,
        items: orderData.items
      });
      
      // Open Paystack checkout in new window
      window.open(paymentUrl, '_blank');
      
      return {
        success: true,
        message: 'Payment initialized',
        reference: orderData.reference
      };
    } catch (error) {
      console.error('Error processing payment with popup:', error);
      throw error;
    }
  },

  // Inline implementation of Paystack checkout
  initializeInlinePayment: (paymentData, onSuccess, onClose) => {
    return initializeInlinePayment(paymentData, onSuccess, onClose);
  },

  // Generate unique transaction reference
  generateTransactionReference: () => {
  // Use timestamp plus random values to ensure uniqueness
  const timestamp = Date.now();
  
  // Create a random string to ensure uniqueness
  // We'll use a mix of characters to create a random component
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomStr = '';
  for (let i = 0; i < 8; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Add a random number component too
  const randomNum = Math.floor(Math.random() * 1000000);
  
  // Return a formatted reference string
  return `LA-${timestamp}-${randomStr}-${randomNum}`;
},

  // Calculate payment fee (if any)
  calculatePaymentFee: (amount, paymentMethod = 'card') => {
    // Paystack charges 1.5% + ₦100 for transactions above ₦2500
    if (paymentMethod === 'card' && amount > 2500) {
      const fee = amount * 0.015 + 100;
      return Math.min(fee, 2000); // Cap at ₦2000
    }
    return 0;
  }
};

export default paymentService;