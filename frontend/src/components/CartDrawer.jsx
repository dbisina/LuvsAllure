import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useState, useEffect } from 'react';

// Helper function to get color code from color name
const getColorCode = (colorName) => {
  if (!colorName) return "#CCCCCC"; // Default gray

  const colorMap = {
    "Black": "#000000",
    "White": "#FFFFFF",
    "Red": "#FF0000",
    "Green": "#008000",
    "Blue": "#0000FF",
    "Yellow": "#FFFF00",
    "Pink": "#FFC0CB",
    "Purple": "#800080",
    "Orange": "#FFA500",
    "Gray": "#808080",
    "Brown": "#A52A2A",
    "Beige": "#F5F5DC",
    "Maroon": "#800000",
    "Violet": "#8A2BE2",
    "Teal": "#008080",
    "Navy": "#000080",
    "Coral": "#FF7F50",
    "Burgundy": "#800020",
    "Olive": "#808000",
    "Turquoise": "#40E0D0"
  };

  // Try to match case-insensitive
  const normalizedColorName = colorName.trim().toLowerCase();
  
  for (const [key, value] of Object.entries(colorMap)) {
    if (key.toLowerCase() === normalizedColorName) {
      return value;
    }
  }
  
  return "#CCCCCC"; // Default gray if color not found
};

const CartDrawer = () => {
  const navigate = useNavigate();
  const { 
    isCartDrawerOpen, 
    setIsCartDrawerOpen, 
    cartItems,
    selectedProduct, 
    getCartTotals,
    removeFromCart,
    updateCartItemQuantity
  } = useCart();
  
  // Local state for item quantities
  const [quantities, setQuantities] = useState({});

  // If drawer is closed, don't render anything
  if (!isCartDrawerOpen) return null;

  const { subtotal, itemCount } = getCartTotals();
  const formattedSubtotal = formatCurrency(subtotal);
  
  // Show all cart items or just the selected product
  const displayItems = selectedProduct ? [selectedProduct] : cartItems;

  // Update quantity for a specific item
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) return; // Prevent negative quantities
    
    // Update local state first (for UI responsiveness)
    setQuantities(prev => ({
      ...prev,
      [itemId]: newQuantity
    }));
    
    // Update the cart context
    updateCartItemQuantity(itemId, newQuantity);
  };

  // Format currency
  function formatCurrency(amount) {
    // Make sure amount is a number and properly formatted
    const numericAmount = typeof amount === 'string' 
      ? parseFloat(amount.replace(/,/g, '')) 
      : parseFloat(amount);
    
    if (isNaN(numericAmount)) return '₦0.00';
    
    // Format with commas for thousands
    return `₦${numericAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  // Calculate item total
  const calculateItemTotal = (item) => {
    const quantity = quantities[item.id] || item.quantity || 1;
    const price = typeof item.price === 'string' 
      ? parseFloat(item.price.replace(/,/g, '')) 
      : parseFloat(item.price) || 0;
    return price * quantity;
  };

  return (
    <AnimatePresence>
      {isCartDrawerOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black z-30"
            onClick={() => setIsCartDrawerOpen(false)}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-full  md:w-96 z-60 bg-white shadow-lg flex flex-col"
          >
            <div className="flex-1 overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white z-10 p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium  md:tracking-wide lg:tracking-wide xl:tracking-wider 2xl:tracking-wider uppercase">
                    {selectedProduct ? 'Added to Bag' : 'Shopping Bag'}
                  </h2>
                  <button
                    onClick={() => setIsCartDrawerOpen(false)}
                    className="p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <img src="/icons/close-menu.svg" alt="Close" className="w-5 h-5" />
                  </button>
                </div>
                {selectedProduct && (
                  <p className="text-sm text-gray-500 mt-1">Item successfully added to your bag</p>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                {displayItems.length > 0 ? (
                  <>
                    {/* Products */}
                    <div className="space-y-6">
                      {displayItems.map((item) => {
                        const itemId = item.id;
                        const currentQuantity = quantities[itemId] || item.quantity || 1;
                        const itemTotal = calculateItemTotal(item);
                        
                        // Get color info for the swatch
                        const itemColor = item.selectedColor || item.color;
                        const colorCode = getColorCode(itemColor);
                        
                        return (
                          <motion.div 
                            key={itemId} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="flex space-x-4 pb-6 border-b border-gray-100"
                          >
                            {/* Product Image */}
                            <div className="w-24 h-32 bg-gray-50 flex-shrink-0">
                              <img 
                                src={item.images?.[0] || item.image || "/images/placeholder.jpg"} 
                                alt={item.name} 
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 flex flex-col">
                              <div className="flex justify-between">
                                <div>
                                  <h3 className="text-sm font-medium uppercase mb-1">{item.name}</h3>
                                  <p className="text-sm text-gray-500 mb-1">{formatCurrency(item.price)}</p>
                                </div>
                                <button 
                                  onClick={() => removeFromCart(itemId)}
                                  className="text-gray-400 hover:text-gray-700 h-6 w-6 flex items-center justify-center cursor-pointer"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 my-2">
                                {item.selectedSize && (
                                  <div>
                                    <span className="uppercase">Size: </span>
                                    <span>{item.selectedSize}</span>
                                  </div>
                                )}
                                {itemColor && (
                                  <div className="flex items-center">
                                    <span className="uppercase mr-1">Color: </span>
                                    <div className="flex items-center">
                                      <div 
                                        className="w-3 h-3 rounded-full mr-1 border border-gray-300 flex-shrink-0" 
                                        style={{ 
                                          backgroundColor: colorCode,
                                          boxShadow: colorCode.toLowerCase() === '#ffffff' ? 'inset 0 0 0 1px #e5e5e5' : 'none'
                                        }}
                                        aria-hidden="true"
                                      ></div>
                                      <span>{itemColor}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Quantity Controls */}
                              <div className="mt-auto flex justify-between items-center">
                                <div className="flex items-center border border-gray-300">
                                  <button 
                                    onClick={() => {
                                      if (currentQuantity > 1) {
                                        updateQuantity(itemId, currentQuantity - 1);
                                      }
                                    }}
                                    className="px-2 py-1 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                                    disabled={currentQuantity <= 1}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                  </button>
                                  <span className="px-3 py-1 text-sm min-w-[2rem] text-center">
                                    {currentQuantity}
                                  </span>
                                  <button 
                                    onClick={() => updateQuantity(itemId, currentQuantity + 1)}
                                    className="px-2 py-1 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                  </button>
                                </div>
                                <div className="text-sm font-medium">
                                  {formatCurrency(itemTotal)}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-gray-500">Your shopping bag is empty</p>
                  </div>
                )}
              </div>
            </div>

            {displayItems.length > 0 && (
              <div className="border-t border-gray-200 p-6 bg-white">
                {/* Summary */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
                    <span>{formattedSubtotal}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                </div>
                
                {/* Total */}
                <div className="flex justify-between items-center py-3 border-t border-gray-200 mb-4">
                  <span className="text-base font-medium uppercase">Total</span>
                  <span className="text-base font-medium">{formattedSubtotal}</span>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                  <button 
                    className="w-full bg-black text-white py-3 hover:bg-gray-900 transition-colors text-sm uppercase md:tracking-wide lg:tracking-wide xl:tracking-wider 2xl:tracking-widerr :tracking-wide lg:tracking-wide xl:tracking-wider 2xl:tracking-widerr  lg:tracking-wide xl:tracking-wider 2xl:tracking-widerr 2 lg:tracking-wide xl:tracking-wider 2xl:tracking-widerst cursor-pointer"
                    onClick={() => {
                      setIsCartDrawerOpen(false);
                      navigate('/checkout');
                    }}
                  >
                    Checkout
                  </button>
                  <button 
                    className="w-full bg-white text-black border border-black py-3 hover:bg-gray-50 transition-colors text-sm uppercase md:tracking-wide lg:tracking-wide xl:tracking-wider 2xl:tracking-widerr :tracking-wide lg:tracking-wide xl:tracking-wider 2xl:tracking-widerr  lg:tracking-wide xl:tracking-wider 2xl:tracking-widerr 2 lg:tracking-wide xl:tracking-wider 2xl:tracking-widerst cursor-pointer"
                    onClick={() => {
                      setIsCartDrawerOpen(false);
                      navigate('/shopping-bag');
                    }}
                  >
                    View Shopping Bag
                  </button>
                </div>
                
                {/* Additional options */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-600 flex items-center justify-center">
                    <span>We accept:</span>
                    <div className="flex items-center ml-2 space-x-2">
                      <img src="/icons/visa.svg" alt="Visa" className="h-6" />
                      <img src="/icons/mastercard.svg" alt="Mastercard" className="h-6" />
                      <img src="/icons/paypal.svg" alt="PayPal" className="h-6" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;