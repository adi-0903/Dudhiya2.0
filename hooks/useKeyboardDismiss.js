import { Keyboard } from 'react-native';

/**
 * A hook that provides a utility to ensure that buttons still work
 * even when the keyboard is visible and gets dismissed on press.
 */
const useKeyboardDismiss = () => {
  /**
   * This function ensures that the callback is executed immediately,
   * even if the keyboard is dismissed when a button is pressed.
   * 
   * @param {Function} callback - The function to execute when button is pressed
   * @returns {Function} - A wrapper function to use in onPress handlers
   */
  const handleButtonPress = (callback) => {
    return () => {
      // Manually dismiss the keyboard
      Keyboard.dismiss();
      
      // Execute the callback immediately without waiting for animation
      if (callback) {
        callback();
      }
    };
  };

  return { handleButtonPress };
};

export default useKeyboardDismiss; 