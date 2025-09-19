import React from 'react';
import { Box, Typography, Paper, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface DebugPanelProps {
  title: string;
  data: any;
  isVisible?: boolean;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ title, data, isVisible = true }) => {
  if (!isVisible) return null;

  const formatData = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return String(obj);
    }
  };

  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        top: 10, 
        right: 10, 
        width: 400, 
        maxHeight: '80vh', 
        overflow: 'auto', 
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white'
      }}
    >
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
          <Typography variant="h6" sx={{ color: 'lime' }}>
            🐛 {title}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
            {formatData(data)}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default DebugPanel;