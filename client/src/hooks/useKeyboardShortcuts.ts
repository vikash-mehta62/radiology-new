import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  category: 'navigation' | 'actions' | 'viewer' | 'workflow';
}

interface UseKeyboardShortcutsProps {
  shortcuts?: KeyboardShortcutConfig[];
  onNewPatient?: () => void;
  onSearch?: () => void;
  onRefresh?: () => void;
  onUpload?: () => void;
  onToggleFullscreen?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onNextImage?: () => void;
  onPrevImage?: () => void;
  onToggleAnnotations?: () => void;
  onSaveReport?: () => void;
  onPrintReport?: () => void;
  disabled?: boolean;
}

export const useKeyboardShortcuts = ({
  shortcuts = [],
  onNewPatient,
  onSearch,
  onRefresh,
  onUpload,
  onToggleFullscreen,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onNextImage,
  onPrevImage,
  onToggleAnnotations,
  onSaveReport,
  onPrintReport,
  disabled = false
}: UseKeyboardShortcutsProps = {}) => {
  const navigate = useNavigate();

  // Default radiologist-focused shortcuts
  const defaultShortcuts: KeyboardShortcutConfig[] = [
    // Navigation shortcuts
    {
      key: 'h',
      ctrlKey: true,
      action: () => navigate('/'),
      description: 'Go to Dashboard',
      category: 'navigation'
    },
    {
      key: 'p',
      ctrlKey: true,
      action: () => navigate('/patients'),
      description: 'Go to Patient List',
      category: 'navigation'
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => navigate('/studies'),
      description: 'Go to Studies',
      category: 'navigation'
    },
    
    // Action shortcuts
    {
      key: 'n',
      ctrlKey: true,
      action: () => onNewPatient?.(),
      description: 'New Patient',
      category: 'actions'
    },
    {
      key: 'f',
      ctrlKey: true,
      action: () => onSearch?.(),
      description: 'Focus Search',
      category: 'actions'
    },
    {
      key: 'r',
      ctrlKey: true,
      action: () => onRefresh?.(),
      description: 'Refresh Data',
      category: 'actions'
    },
    {
      key: 'u',
      ctrlKey: true,
      shiftKey: true,
      action: () => onUpload?.(),
      description: 'Upload DICOM',
      category: 'actions'
    },
    
    // Viewer shortcuts
    {
      key: 'F11',
      action: () => onToggleFullscreen?.(),
      description: 'Toggle Fullscreen',
      category: 'viewer'
    },
    {
      key: '=',
      ctrlKey: true,
      action: () => onZoomIn?.(),
      description: 'Zoom In',
      category: 'viewer'
    },
    {
      key: '-',
      ctrlKey: true,
      action: () => onZoomOut?.(),
      description: 'Zoom Out',
      category: 'viewer'
    },
    {
      key: '0',
      ctrlKey: true,
      action: () => onResetZoom?.(),
      description: 'Reset Zoom',
      category: 'viewer'
    },
    {
      key: 'ArrowRight',
      action: () => onNextImage?.(),
      description: 'Next Image',
      category: 'viewer'
    },
    {
      key: 'ArrowLeft',
      action: () => onPrevImage?.(),
      description: 'Previous Image',
      category: 'viewer'
    },
    {
      key: 'a',
      ctrlKey: true,
      shiftKey: true,
      action: () => onToggleAnnotations?.(),
      description: 'Toggle Annotations',
      category: 'viewer'
    },
    
    // Workflow shortcuts
    {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
      action: () => onSaveReport?.(),
      description: 'Save Report',
      category: 'workflow'
    },
    {
      key: 'p',
      ctrlKey: true,
      shiftKey: true,
      action: () => onPrintReport?.(),
      description: 'Print Report',
      category: 'workflow'
    }
  ];

  const allShortcuts = [...defaultShortcuts, ...shortcuts];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return;

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const matchingShortcut = allShortcuts.find(shortcut => {
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
  }, [allShortcuts, disabled]);

  useEffect(() => {
    if (disabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, disabled]);

  // Helper function to get shortcuts by category
  const getShortcutsByCategory = (category: string) => {
    return allShortcuts.filter(shortcut => shortcut.category === category);
  };

  // Helper function to format shortcut display
  const formatShortcut = (shortcut: KeyboardShortcutConfig) => {
    const parts = [];
    if (shortcut.ctrlKey || shortcut.metaKey) parts.push('Ctrl');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push('Alt');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  };

  return {
    shortcuts: allShortcuts,
    getShortcutsByCategory,
    formatShortcut
  };
};

export default useKeyboardShortcuts;