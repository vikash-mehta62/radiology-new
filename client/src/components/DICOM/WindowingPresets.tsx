import React from 'react';
import {
  Box,
  Button,
  Grid,
  Typography
} from '@mui/material';

interface WindowingPresetsProps {
  onPresetSelect: (preset: { windowWidth: number; windowCenter: number }) => void;
}

const WindowingPresets: React.FC<WindowingPresetsProps> = ({ onPresetSelect }) => {
  const presets = [
    { name: 'Soft Tissue', windowWidth: 400, windowCenter: 40 },
    { name: 'Lung', windowWidth: 1500, windowCenter: -600 },
    { name: 'Bone', windowWidth: 1800, windowCenter: 400 },
    { name: 'Brain', windowWidth: 80, windowCenter: 40 },
    { name: 'Liver', windowWidth: 150, windowCenter: 30 },
    { name: 'Mediastinum', windowWidth: 350, windowCenter: 50 },
    { name: 'Abdomen', windowWidth: 350, windowCenter: 50 },
    { name: 'Angio', windowWidth: 600, windowCenter: 300 }
  ];

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Windowing Presets
      </Typography>
      <Grid container spacing={1}>
        {presets.map((preset) => (
          <Grid item xs={6} key={preset.name}>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={() => onPresetSelect(preset)}
              sx={{ fontSize: '0.7rem', py: 0.5 }}
            >
              {preset.name}
            </Button>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default WindowingPresets;