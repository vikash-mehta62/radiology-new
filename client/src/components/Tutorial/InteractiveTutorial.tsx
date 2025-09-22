/**
 * Interactive Tutorial System
 * Provides contextual guidance and step-by-step tutorials
 */

import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import IconButton from '@mui/material/IconButton';
import Fade from '@mui/material/Fade';
import Backdrop from '@mui/material/Backdrop';
import { Close as CloseIcon, NavigateNext, NavigateBefore, PlayArrow, Pause } from '@mui/icons-material';

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'hover' | 'input' | 'wait';
  duration?: number; // Auto-advance after duration (ms)
  validation?: () => boolean; // Check if step is completed
  onEnter?: () => void; // Execute when step starts
  onExit?: () => void; // Execute when step ends
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: 'basic' | 'advanced' | 'ai' | 'collaboration' | 'measurement';
  estimatedTime: number; // minutes
  prerequisites?: string[];
  steps: TutorialStep[];
}

interface InteractiveTutorialProps {
  tutorial: Tutorial;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (tutorialId: string) => void;
}

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  tutorial,
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Auto-advance timer
  useEffect(() => {
    if (!isPlaying || !tutorial.steps[currentStep]?.duration) return;

    const timer = setTimeout(() => {
      handleNext();
    }, tutorial.steps[currentStep].duration);

    return () => clearTimeout(timer);
  }, [currentStep, isPlaying, tutorial.steps]);

  // Highlight target element
  useEffect(() => {
    const step = tutorial.steps[currentStep];
    if (!step?.target) {
      setHighlightedElement(null);
      return;
    }

    const element = document.querySelector(step.target) as HTMLElement;
    if (element) {
      setHighlightedElement(element);
      
      // Calculate tooltip position
      const rect = element.getBoundingClientRect();
      const position = step.position || 'bottom';
      
      let x = rect.left + rect.width / 2;
      let y = rect.bottom + 10;
      
      switch (position) {
        case 'top':
          y = rect.top - 10;
          break;
        case 'left':
          x = rect.left - 10;
          y = rect.top + rect.height / 2;
          break;
        case 'right':
          x = rect.right + 10;
          y = rect.top + rect.height / 2;
          break;
      }
      
      setTooltipPosition({ x, y });
      
      // Add highlight class
      element.classList.add('tutorial-highlight');
      
      // Execute step enter callback
      step.onEnter?.();
    }

    return () => {
      if (element) {
        element.classList.remove('tutorial-highlight');
        step.onExit?.();
      }
    };
  }, [currentStep, tutorial.steps]);

  const handleNext = useCallback(() => {
    const step = tutorial.steps[currentStep];
    
    // Check validation if provided
    if (step.validation && !step.validation()) {
      return; // Don't advance if validation fails
    }

    if (currentStep < tutorial.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Tutorial completed
      onComplete(tutorial.id);
      onClose();
    }
  }, [currentStep, tutorial.steps, tutorial.id, onComplete, onClose]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  const currentStepData = tutorial.steps[currentStep];
  const progress = ((currentStep + 1) / tutorial.steps.length) * 100;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <Backdrop
        open={isOpen}
        sx={{
          zIndex: 9998,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        }}
      />

      {/* Tutorial Panel */}
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          width: 400,
          maxHeight: 'calc(100vh - 40px)',
          zIndex: 9999,
          overflow: 'auto',
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" component="h2">
              {tutorial.title}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {tutorial.description}
          </Typography>
          
          {/* Progress Bar */}
          <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 4 }}>
            <Box
              sx={{
                width: `${progress}%`,
                bgcolor: 'primary.main',
                height: '100%',
                borderRadius: 1,
                transition: 'width 0.3s ease',
              }}
            />
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Step {currentStep + 1} of {tutorial.steps.length} • {tutorial.estimatedTime} min
          </Typography>
        </Box>

        {/* Content */}
        <Box sx={{ p: 2 }}>
          <Stepper activeStep={currentStep} orientation="vertical">
            {tutorial.steps.map((step, index) => (
              <Step key={step.id}>
                <StepLabel>
                  <Typography variant="subtitle2">{step.title}</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {step.content}
                  </Typography>
                  
                  {step.action && (
                    <Box sx={{ mb: 2, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="caption" color="info.contrastText">
                        Action required: {step.action}
                      </Typography>
                    </Box>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Controls */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                startIcon={<NavigateBefore />}
                size="small"
              >
                Previous
              </Button>
              
              <IconButton
                onClick={handlePlayPause}
                color={isPlaying ? 'secondary' : 'primary'}
                size="small"
                sx={{ mx: 1 }}
              >
                {isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
            </Box>
            
            <Box>
              <Button onClick={handleSkip} size="small" sx={{ mr: 1 }}>
                Skip
              </Button>
              
              <Button
                onClick={handleNext}
                variant="contained"
                endIcon={<NavigateNext />}
                size="small"
              >
                {currentStep === tutorial.steps.length - 1 ? 'Complete' : 'Next'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Tooltip for highlighted element */}
      {highlightedElement && currentStepData && (
        <Fade in={true}>
          <Paper
            elevation={4}
            sx={{
              position: 'fixed',
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              zIndex: 10000,
              p: 2,
              maxWidth: 300,
              transform: 'translate(-50%, -100%)',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid white',
              },
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {currentStepData.title}
            </Typography>
            <Typography variant="body2">
              {currentStepData.content}
            </Typography>
          </Paper>
        </Fade>
      )}

      {/* CSS for highlighting */}
      <style>
        {`
          .tutorial-highlight {
            position: relative;
            z-index: 9999 !important;
            box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.5) !important;
            border-radius: 4px !important;
            animation: tutorial-pulse 2s infinite;
          }
          
          @keyframes tutorial-pulse {
            0% { box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.5); }
            50% { box-shadow: 0 0 0 8px rgba(25, 118, 210, 0.3); }
            100% { box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.5); }
          }
        `}
      </style>
    </>
  );
};

export default InteractiveTutorial;