import React from 'react';
import Lottie from 'lottie-react';
import animationData from '../assets/LoadingAnim2.json';
import './LoadingAnimation.css';

const LoadingAnimation = ({ size = 'default', message = '', fullScreen = true }) => {
  const sizeStyles = {
    default: { width: 200, height: 200 },
    small: { width: 120, height: 120 },
    large: { width: 300, height: 300 }
  };

  return (
    <div className={fullScreen ? 'loading-animation-container' : 'loading-animation-inline'}>
      <div style={sizeStyles[size]}>
        <Lottie
          animationData={animationData}
          loop={true}
          autoplay={true}
        />
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

export default LoadingAnimation;
