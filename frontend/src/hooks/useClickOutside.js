import { useEffect } from 'react';

/**
 * Custom hook to detect clicks outside of a referenced element
 * @param {React.RefObject} ref - The ref of the element to monitor
 * @param {Function} handler - Callback function to execute when click outside is detected
 * @param {boolean} enabled - Optional flag to enable/disable the listener (default: true)
 */
export function useClickOutside(ref, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };

    // Add event listeners for both mouse and touch events
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, enabled]);
}

export default useClickOutside;
