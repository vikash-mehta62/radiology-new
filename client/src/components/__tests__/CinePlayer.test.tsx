/**
 * CinePlayer Component Tests
 * Tests for the enhanced cine player component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CinePlayer, CinePlayerProps } from '../CinePlayer';

// Mock Material-UI components that might have issues in test environment
jest.mock('@mui/material/Slider', () => {
  return function MockSlider({ value, onChange, disabled, 'data-testid': testId, ...props }: any) {
    return (
      <input
        type="range"
        value={value}
        onChange={(e) => onChange?.(e, parseInt(e.target.value))}
        disabled={disabled}
        data-testid={testId || "slider"}
        {...props}
      />
    );
  };
});

// Mock MutationObserver for tests
global.MutationObserver = class MutationObserver {
  constructor(callback: any) { }
  observe() { }
  disconnect() { }
  takeRecords() { return []; }
};

const theme = createTheme();

const defaultProps: CinePlayerProps = {
  currentSlice: 0,
  totalSlices: 10,
  isPlaying: false,
  frameRate: 10,
  onSliceChange: jest.fn(),
  onPlayStateChange: jest.fn(),
  onFrameRateChange: jest.fn(),
  isLoading: false,
  loadingProgress: 0,
  enableKeyboardShortcuts: true
};

const renderCinePlayer = (props: Partial<CinePlayerProps> = {}) => {
  const mergedProps = { ...defaultProps, ...props };
  return render(
    <ThemeProvider theme={theme}>
      <CinePlayer {...mergedProps} />
    </ThemeProvider>
  );
};

describe('CinePlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('should render with default props', () => {
      renderCinePlayer();

      expect(screen.getByText('Slice: 1 / 10')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    });

    test('should show pause button when playing', () => {
      renderCinePlayer({ isPlaying: true });

      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    test('should display loading progress when loading', () => {
      renderCinePlayer({ isLoading: true, loadingProgress: 50 });

      expect(screen.getByText('Loading slices...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('should show correct slice information', () => {
      renderCinePlayer({ currentSlice: 5, totalSlices: 20 });

      expect(screen.getByText('Slice: 6 / 20')).toBeInTheDocument();
      expect(screen.getByText('Progress: 26.3%')).toBeInTheDocument();
    });
  });

  describe('Playback Controls', () => {
    test('should call onPlayStateChange when play button is clicked', async () => {
      const onPlayStateChange = jest.fn();
      renderCinePlayer({ onPlayStateChange });

      const playButton = screen.getByRole('button', { name: /play/i });
      await userEvent.click(playButton);

      expect(onPlayStateChange).toHaveBeenCalledWith(true);
    });

    test('should call onPlayStateChange when pause button is clicked', async () => {
      const onPlayStateChange = jest.fn();
      renderCinePlayer({ isPlaying: true, onPlayStateChange });

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      await userEvent.click(pauseButton);

      expect(onPlayStateChange).toHaveBeenCalledWith(false);
    });

    test('should call onSliceChange and onPlayStateChange when stop button is clicked', async () => {
      const onSliceChange = jest.fn();
      const onPlayStateChange = jest.fn();
      renderCinePlayer({
        currentSlice: 5,
        isPlaying: true,
        onSliceChange,
        onPlayStateChange
      });

      const stopButton = screen.getByRole('button', { name: /stop/i });
      await userEvent.click(stopButton);

      expect(onPlayStateChange).toHaveBeenCalledWith(false);
      expect(onSliceChange).toHaveBeenCalledWith(0);
    });
  });

  describe('Navigation Controls', () => {
    test('should navigate to next slice', async () => {
      const onSliceChange = jest.fn();
      renderCinePlayer({ currentSlice: 3, onSliceChange });

      const nextButton = screen.getByLabelText(/next slice/i);
      await userEvent.click(nextButton);

      expect(onSliceChange).toHaveBeenCalledWith(4);
    });

    test('should navigate to previous slice', async () => {
      const onSliceChange = jest.fn();
      renderCinePlayer({ currentSlice: 3, onSliceChange });

      const prevButton = screen.getByLabelText(/previous slice/i);
      await userEvent.click(prevButton);

      expect(onSliceChange).toHaveBeenCalledWith(2);
    });

    test('should navigate to first slice', async () => {
      const onSliceChange = jest.fn();
      renderCinePlayer({ currentSlice: 5, onSliceChange });

      const firstButton = screen.getByLabelText(/first slice/i);
      await userEvent.click(firstButton);

      expect(onSliceChange).toHaveBeenCalledWith(0);
    });

    test('should navigate to last slice', async () => {
      const onSliceChange = jest.fn();
      renderCinePlayer({ currentSlice: 3, totalSlices: 10, onSliceChange });

      const lastButton = screen.getByLabelText(/last slice/i);
      await userEvent.click(lastButton);

      expect(onSliceChange).toHaveBeenCalledWith(9);
    });

    test('should disable navigation buttons at boundaries', () => {
      renderCinePlayer({ currentSlice: 0, totalSlices: 10 });

      expect(screen.getByLabelText(/first slice/i)).toBeDisabled();
      expect(screen.getByLabelText(/previous slice/i)).toBeDisabled();
    });

    test('should disable navigation buttons at end', () => {
      renderCinePlayer({ currentSlice: 9, totalSlices: 10 });

      expect(screen.getByLabelText(/last slice/i)).toBeDisabled();
      expect(screen.getByLabelText(/next slice/i)).toBeDisabled();
    });
  });

  describe('Slice Slider', () => {
    test('should call onSliceChange when slider value changes', async () => {
      const onSliceChange = jest.fn();
      renderCinePlayer({ onSliceChange });

      const slider = screen.getByTestId('slice-slider');
      fireEvent.change(slider, { target: { value: '5' } });

      expect(onSliceChange).toHaveBeenCalledWith(5);
    });

    test('should disable slider when loading', () => {
      renderCinePlayer({ isLoading: true });

      const slider = screen.getByTestId('slice-slider');
      expect(slider).toBeDisabled();
    });
  });

  describe('Frame Rate Controls', () => {
    test('should call onFrameRateChange when frame rate is changed', async () => {
      const onFrameRateChange = jest.fn();
      renderCinePlayer({ onFrameRateChange });

      const frameRateSelect = screen.getByLabelText(/frame rate/i);
      await userEvent.click(frameRateSelect);

      const option = screen.getByText('20 FPS');
      await userEvent.click(option);

      expect(onFrameRateChange).toHaveBeenCalledWith(20);
    });

    test('should display current frame rate', () => {
      renderCinePlayer({ frameRate: 15 });

      expect(screen.getByDisplayValue('15')).toBeInTheDocument();
    });
  });

  describe('Speed Control', () => {
    test('should display speed value', () => {
      renderCinePlayer();

      expect(screen.getByText('Speed: 1.0x')).toBeInTheDocument();
    });

    test('should update speed when slider changes', async () => {
      renderCinePlayer();

      // Find speed slider by its test id
      const speedSlider = screen.getByTestId('speed-slider');

      fireEvent.change(speedSlider, { target: { value: '2.0' } });

      await waitFor(() => {
        expect(screen.getByText('Speed: 2.0x')).toBeInTheDocument();
      });
    });
  });

  describe('Loop Mode Controls', () => {
    test('should display loop mode controls', () => {
      renderCinePlayer();

      // Check that loop mode controls are rendered
      expect(screen.getByLabelText(/loop/i)).toBeInTheDocument();
      expect(screen.getByText('→ loop')).toBeInTheDocument();

      // Check that loop mode options exist in the DOM
      expect(screen.getByDisplayValue('loop')).toBeInTheDocument();
    });
  });

  describe('Advanced Controls', () => {
    test('should toggle advanced controls', async () => {
      renderCinePlayer();

      const settingsButton = screen.getByLabelText(/advanced controls/i);
      await userEvent.click(settingsButton);

      expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
      expect(screen.getByText('Auto-reverse at boundaries')).toBeInTheDocument();
    });

    test('should show performance statistics in advanced mode', async () => {
      renderCinePlayer({ frameRate: 15, totalSlices: 20 });

      const settingsButton = screen.getByRole('button', { name: /advanced controls/i });
      await userEvent.click(settingsButton);

      expect(screen.getByText('Playback Statistics')).toBeInTheDocument();
      expect(screen.getByText(/Current FPS: 15.0/)).toBeInTheDocument();
      expect(screen.getByText(/Total Duration:/)).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('should handle spacebar for play/pause', () => {
      const onPlayStateChange = jest.fn();
      renderCinePlayer({ onPlayStateChange });

      fireEvent.keyDown(document, { code: 'Space' });

      expect(onPlayStateChange).toHaveBeenCalledWith(true);
    });

    test('should handle arrow keys for navigation', () => {
      const onSliceChange = jest.fn();
      renderCinePlayer({ currentSlice: 5, onSliceChange });

      fireEvent.keyDown(document, { code: 'ArrowRight' });
      expect(onSliceChange).toHaveBeenCalledWith(6);

      fireEvent.keyDown(document, { code: 'ArrowLeft' });
      expect(onSliceChange).toHaveBeenCalledWith(4);
    });

    test('should handle Home and End keys', () => {
      const onSliceChange = jest.fn();
      renderCinePlayer({ currentSlice: 5, totalSlices: 10, onSliceChange });

      fireEvent.keyDown(document, { code: 'Home' });
      expect(onSliceChange).toHaveBeenCalledWith(0);

      fireEvent.keyDown(document, { code: 'End' });
      expect(onSliceChange).toHaveBeenCalledWith(9);
    });

    test('should not handle keyboard shortcuts when disabled', () => {
      const onSliceChange = jest.fn();
      renderCinePlayer({
        currentSlice: 5,
        onSliceChange,
        enableKeyboardShortcuts: false
      });

      fireEvent.keyDown(document, { code: 'ArrowRight' });

      expect(onSliceChange).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    test('should disable controls when loading', () => {
      renderCinePlayer({ isLoading: true });

      expect(screen.getByRole('button', { name: /play/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /stop/i })).toBeDisabled();
      expect(screen.getByTestId('slice-slider')).toBeDisabled();
    });

    test('should show loading progress', () => {
      renderCinePlayer({ isLoading: true, loadingProgress: 75 });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });
  });

  describe('Direction Control', () => {
    test('should toggle play direction', async () => {
      renderCinePlayer();

      const directionButton = screen.getByLabelText(/direction/i);
      await userEvent.click(directionButton);

      expect(screen.getByText('← loop')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      renderCinePlayer();

      expect(screen.getByLabelText(/play \(space\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/first slice \(home\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last slice \(end\)/i)).toBeInTheDocument();
    });

    test('should show keyboard shortcuts help', () => {
      renderCinePlayer();

      expect(screen.getByText(/Shortcuts:/)).toBeInTheDocument();
      expect(screen.getByText(/Space \(play\/pause\)/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('should handle single slice study', () => {
      renderCinePlayer({ totalSlices: 1, currentSlice: 0 });

      expect(screen.getByText('Slice: 1 / 1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next slice/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /previous slice/i })).toBeDisabled();
    });

    test('should handle zero slices gracefully', () => {
      renderCinePlayer({ totalSlices: 0, currentSlice: 0 });

      expect(screen.getByText('Slice: 1 / 0')).toBeInTheDocument();
      expect(screen.getByText('Progress: 0.0%')).toBeInTheDocument();
    });

    test('should calculate progress correctly', () => {
      renderCinePlayer({ currentSlice: 2, totalSlices: 5 });

      expect(screen.getByText('Progress: 50.0%')).toBeInTheDocument();
    });
  });
});