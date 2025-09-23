import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    custom?: {
      radiology?: {
        background: {
          primary: string;
          secondary: string;
          tertiary: string;
          overlay: string;
        };
        text: {
          primary: string;
          secondary: string;
          tertiary: string;
          inverse: string;
        };
        surface: {
          level0: string;
          level1: string;
          level2: string;
          level3: string;
        };
        accent: {
          primary: string;
          secondary: string;
          success: string;
          warning: string;
          error: string;
          info: string;
        };
        border: {
          primary: string;
          secondary: string;
          focus: string;
          error: string;
        };
        imaging?: any;
      };
      eyeStrain?: any;
      accessibility?: any;
    };
  }

  interface ThemeOptions {
    custom?: {
      radiology?: {
        background: {
          primary: string;
          secondary: string;
          tertiary: string;
          overlay: string;
        };
        text: {
          primary: string;
          secondary: string;
          tertiary: string;
          inverse: string;
        };
        surface: {
          level0: string;
          level1: string;
          level2: string;
          level3: string;
        };
        accent: {
          primary: string;
          secondary: string;
          success: string;
          warning: string;
          error: string;
          info: string;
        };
        border: {
          primary: string;
          secondary: string;
          focus: string;
          error: string;
        };
        imaging?: any;
      };
      eyeStrain?: any;
      accessibility?: any;
    };
  }
}