/**
 * Tests for CinePlayer Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CinePlayer } from '../CinePlayer';

// Mock hooks
jest.mock('../../../hooks/useSliceNavigation', () => ({
  useSliceNavigation: () => ({
    goToSlice: jest.fn(),
    nextSlice: jest.fn(),
    previousSlice: jest.fn(),
    currentSlice: 0,
    totalSlices: 10,
    isTransitioning: false
  })
}));

jest.mock('../../../hooks/useIntelligentCache', () => ({
  useIntelligentCache: () => ({
    set: jest.fn(),
    get: jest.fn(),
    has: jest.fn(() => false),
    statistics: {
      totalSize: 0,
      itemCount: 0,
      hitRate: 0
    }
  })
}));

// Mock performance monitor
jest.mock('../../../services/performanceMonitor', () => ({
  performanceMonitor: {
    recordRenderingMetrics: jest.fn()
  }
}));

describe('CinePlayer', () => {
  const defaultProps = {
    totalFrames: 10,
    initialFrame: 0
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render with default configuration', () => {
    render(<CinePlayer {...defaultProps} />);
    
    expect(screen.getByTitle(/play/i)).toBeInTheDocument();
    expect(screen.getByTitle(/step backward/i)).toBeInTheDocument();
    expect(screen.getByTitle(/step forward/i)).toBeInTheDocument();
  });

  test('should render frame counter', () => {
    render(<CinePlayer {...defaultProps} />);
    
    expect(screen.getByText('1 / 10')).toBeInTheDocument();
  });

  test('should hide controls when showControls is false', () => {
    render(
      <CinePlayer 
        {...defaultProps} 
        config={{ showControls: false }} 
      />
    );
    
    expect(screen.queryByTitle(/play/i)).not.toBeInTheDocument();
  });

  test('should disable step backward at first frame', () => {
    render(<CinePlayer {...defaultProps} initialFrame={0} />);
    
    const stepBackwardButton = screen.getByTitle(/step backward/i);
    expect(stepBackwardButton).toBeDisabled();
  });

  test('should disable step forward at last frame', () => {
    render(<CinePlayer {...defaultProps} initialFrame={9} />);
    
    const stepForwardButton = screen.getByTitle(/step forward/i);
    expect(stepForwardButton).toBeDisabled();
  });

  test('should toggle play/pause with spacebar', () => {
    const onPlayStateChange = jest.fn();
    render(
      <CinePlayer 
        {...defaultProps} 
        onPlayStateChange={onPlayStateChange}
      />
    );
    
    fireEvent.keyDown(document, { key: ' ' });
    
    expect(onPlayStateChange).toHaveBeenCalledWith(true);
  });
});