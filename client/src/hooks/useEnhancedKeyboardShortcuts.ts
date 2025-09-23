/**
 * Enhanced Keyboard Shortcuts Hook
 * Medical-specific workflows with quick templates and field navigation
 */

import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface MedicalKeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  category: 'navigation' | 'templates' | 'fields' | 'workflow' | 'viewer' | 'voice';
  medicalContext?: string;
}

interface UseEnhancedKeyboardShortcutsProps {
  onQuickTemplate?: (templateType: string) => void;
  onFieldNavigation?: (direction: 'next' | 'previous') => void;
  onVoiceToggle?: (field?: string) => void;
  onAutoSave?: () => void;
  onCriticalFinding?: () => void;
  onMeasurementTool?: () => void;
  onAnnotationTool?: () => void;
  onComparisonView?: () => void;
  onReportPreview?: () => void;
  onSignReport?: () => void;
  onSendReport?: () => void;
  disabled?: boolean;
  currentField?: string;
}

export const useEnhancedKeyboardShortcuts = ({
  onQuickTemplate,
  onFieldNavigation,
  onVoiceToggle,
  onAutoSave,
  onCriticalFinding,
  onMeasurementTool,
  onAnnotationTool,
  onComparisonView,
  onReportPreview,
  onSignReport,
  onSendReport,
  disabled = false,
  currentField
}: UseEnhancedKeyboardShortcutsProps = {}) => {
  const navigate = useNavigate();
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
  const [helpVisible, setHelpVisible] = useState(false);

  // Medical-specific keyboard shortcuts
  const medicalShortcuts: MedicalKeyboardShortcut[] = [
    // Quick Templates
    {
      key: '1',
      ctrlKey: true,
      altKey: true,
      action: () => onQuickTemplate?.('chest-xray'),
      description: 'Quick Chest X-Ray Template',
      category: 'templates',
      medicalContext: 'Chest X-Ray reporting template'
    },
    {
      key: '2',
      ctrlKey: true,
      altKey: true,
      action: () => onQuickTemplate?.('ct-head'),
      description: 'Quick CT Head Template',
      category: 'templates',
      medicalContext: 'CT Head reporting template'
    },
    {
      key: '3',
      ctrlKey: true,
      altKey: true,
      action: () => onQuickTemplate?.('mri-brain'),
      description: 'Quick MRI Brain Template',
      category: 'templates',
      medicalContext: 'MRI Brain reporting template'
    },
    {
      key: '4',
      ctrlKey: true,
      altKey: true,
      action: () => onQuickTemplate?.('ct-abdomen'),
      description: 'Quick CT Abdomen Template',
      category: 'templates',
      medicalContext: 'CT Abdomen reporting template'
    },
    {
      key: '5',
      ctrlKey: true,
      altKey: true,
      action: () => onQuickTemplate?.('ultrasound'),
      description: 'Quick Ultrasound Template',
      category: 'templates',
      medicalContext: 'Ultrasound reporting template'
    },

    // Field Navigation
    {
      key: 'Tab',
      ctrlKey: true,
      action: () => onFieldNavigation?.('next'),
      description: 'Navigate to Next Field',
      category: 'fields',
      medicalContext: 'Move to next report section'
    },
    {
      key: 'Tab',
      ctrlKey: true,
      shiftKey: true,
      action: () => onFieldNavigation?.('previous'),
      description: 'Navigate to Previous Field',
      category: 'fields',
      medicalContext: 'Move to previous report section'
    },

    // Voice Recognition
    {
      key: 'v',
      ctrlKey: true,
      shiftKey: true,
      action: () => onVoiceToggle?.(currentField),
      description: 'Toggle Voice Recognition',
      category: 'voice',
      medicalContext: 'Start/stop voice dictation for current field'
    },
    {
      key: 'F1',
      action: () => onVoiceToggle?.('clinical_history'),
      description: 'Voice: Clinical History',
      category: 'voice',
      medicalContext: 'Voice dictation for clinical history'
    },
    {
      key: 'F2',
      action: () => onVoiceToggle?.('findings'),
      description: 'Voice: Findings',
      category: 'voice',
      medicalContext: 'Voice dictation for findings'
    },
    {
      key: 'F3',
      action: () => onVoiceToggle?.('impression'),
      description: 'Voice: Impression',
      category: 'voice',
      medicalContext: 'Voice dictation for impression'
    },
    {
      key: 'F4',
      action: () => onVoiceToggle?.('recommendations'),
      description: 'Voice: Recommendations',
      category: 'voice',
      medicalContext: 'Voice dictation for recommendations'
    },

    // Workflow Shortcuts
    {
      key: 's',
      ctrlKey: true,
      action: () => onAutoSave?.(),
      description: 'Save Report',
      category: 'workflow',
      medicalContext: 'Save current report'
    },
    {
      key: 'e',
      ctrlKey: true,
      shiftKey: true,
      action: () => onCriticalFinding?.(),
      description: 'Mark Critical Finding',
      category: 'workflow',
      medicalContext: 'Add critical finding alert'
    },
    {
      key: 'm',
      ctrlKey: true,
      action: () => onMeasurementTool?.(),
      description: 'Measurement Tool',
      category: 'workflow',
      medicalContext: 'Activate measurement tools'
    },
    {
      key: 'a',
      ctrlKey: true,
      action: () => onAnnotationTool?.(),
      description: 'Annotation Tool',
      category: 'workflow',
      medicalContext: 'Activate annotation tools'
    },
    {
      key: 'c',
      ctrlKey: true,
      shiftKey: true,
      action: () => onComparisonView?.(),
      description: 'Comparison View',
      category: 'workflow',
      medicalContext: 'Show comparison with prior studies'
    },
    {
      key: 'p',
      ctrlKey: true,
      action: () => onReportPreview?.(),
      description: 'Preview Report',
      category: 'workflow',
      medicalContext: 'Preview formatted report'
    },
    {
      key: 'g',
      ctrlKey: true,
      shiftKey: true,
      action: () => onSignReport?.(),
      description: 'Sign Report',
      category: 'workflow',
      medicalContext: 'Digitally sign report'
    },
    {
      key: 'Enter',
      ctrlKey: true,
      action: () => onSendReport?.(),
      description: 'Send Report',
      category: 'workflow',
      medicalContext: 'Send completed report'
    },

    // Navigation
    {
      key: 'h',
      ctrlKey: true,
      action: () => navigate('/dashboard'),
      description: 'Go to Dashboard',
      category: 'navigation',
      medicalContext: 'Return to main dashboard'
    },
    {
      key: 'w',
      ctrlKey: true,
      action: () => navigate('/worklist'),
      description: 'Go to Worklist',
      category: 'navigation',
      medicalContext: 'View pending studies worklist'
    },
    {
      key: 'r',
      ctrlKey: true,
      action: () => navigate('/reports'),
      description: 'Go to Reports',
      category: 'navigation',
      medicalContext: 'View all reports'
    },

    // Help
    {
      key: 'F1',
      shiftKey: true,
      action: () => setHelpVisible(!helpVisible),
      description: 'Toggle Keyboard Shortcuts Help',
      category: 'navigation',
      medicalContext: 'Show/hide keyboard shortcuts reference'
    }
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled || !shortcutsEnabled) return;

    // Don't trigger shortcuts when typing in input fields (except for specific navigation shortcuts)
    const target = event.target as HTMLElement;
    const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    
    // Allow certain shortcuts even in input fields
    const allowedInInputFields = ['Tab', 'F1', 'F2', 'F3', 'F4'];
    if (isInputField && !allowedInInputFields.includes(event.key)) {
      // Only allow Ctrl+S for saving and voice shortcuts
      if (!(event.ctrlKey && event.key === 's') && 
          !(event.ctrlKey && event.shiftKey && event.key === 'v')) {
        return;
      }
    }

    const matchingShortcut = medicalShortcuts.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrlKey === event.ctrlKey;
      const metaMatch = !!shortcut.metaKey === event.metaKey;
      const shiftMatch = !!shortcut.shiftKey === event.shiftKey;
      const altMatch = !!shortcut.altKey === event.altKey;

      return keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch;
    });

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      matchingShortcut.action();
    }
  }, [medicalShortcuts, disabled, shortcutsEnabled, helpVisible, currentField]);

  useEffect(() => {
    if (disabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, disabled]);

  // Helper functions
  const getShortcutsByCategory = (category: string) => {
    return medicalShortcuts.filter(shortcut => shortcut.category === category);
  };

  const formatShortcut = (shortcut: MedicalKeyboardShortcut) => {
    const parts = [];
    if (shortcut.ctrlKey || shortcut.metaKey) parts.push('Ctrl');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push('Alt');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  };

  const toggleShortcuts = () => {
    setShortcutsEnabled(!shortcutsEnabled);
  };

  const getQuickTemplateShortcuts = () => {
    return medicalShortcuts.filter(s => s.category === 'templates');
  };

  const getVoiceShortcuts = () => {
    return medicalShortcuts.filter(s => s.category === 'voice');
  };

  const getWorkflowShortcuts = () => {
    return medicalShortcuts.filter(s => s.category === 'workflow');
  };

  return {
    shortcuts: medicalShortcuts,
    shortcutsEnabled,
    helpVisible,
    getShortcutsByCategory,
    formatShortcut,
    toggleShortcuts,
    setHelpVisible,
    getQuickTemplateShortcuts,
    getVoiceShortcuts,
    getWorkflowShortcuts
  };
};

export default useEnhancedKeyboardShortcuts;