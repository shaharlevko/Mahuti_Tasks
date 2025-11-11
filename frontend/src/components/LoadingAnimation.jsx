import React, { useMemo, useRef } from 'react';
import Lottie from 'lottie-react';
import animationData from '../assets/LoadingAnim2.json';
import './LoadingAnimation.css';

const LoadingAnimation = ({ size = 'default', message = '', fullScreen = true }) => {
  const lottieRef = useRef();

  const sizeStyles = useMemo(() => ({
    default: { width: 200, height: 200 },
    small: { width: 120, height: 120 },
    large: { width: 300, height: 300 }
  }), []);

  return (
    <div className={fullScreen ? 'loading-animation-container' : 'loading-animation-inline'}>
      <div style={sizeStyles[size]}>
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={true}
          autoplay={true}
          rendererSettings={{
            preserveAspectRatio: 'xMidYMid slice'
          }}
        />
      </div>
      <p className="loading-message">Loading</p>
    </div>
  );
};

export default React.memo(LoadingAnimation);
