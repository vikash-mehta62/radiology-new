import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  IconButton,
  Tooltip,
  InputAdornment,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  AutoAwesome as AIIcon,
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingIcon,
  Security as ComplianceIcon,
} from '@mui/icons-material';

import { CodeSuggestion } from '../../types';
import { apiService } from '../../services/api';

interface CodeSuggestionPanelProps {
  examType: string;
  findings: string;
  currentCodes: string[];
  onCodesUpdate: (codes: string[]) => void;
}

interface SuggestionCategory {
  name: string;
  suggestions: CodeSuggestion[];
  priority: number;
}

const CodeSuggestionPanel: React.FC<CodeSuggestionPanelProps> = ({
  examType,
  findings,
  currentCodes,
  onCodesUpdate,
}) => {
  const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CodeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['ai-suggested']));

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (term.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        setLoading(true);
        const results = await apiService.get(`/billing/codes/search?query=${encodeURIComponent(term)}&code_type=icd10&limit=10`);
        setSearchResults(results.icd10_codes || []);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // Get AI suggestions when findings change
  useEffect(() => {
    const getSuggestions = async () => {
      if (!findings || findings.length < 10) {
        setSuggestions([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await apiService.suggestCodesRealtime(findings, examType);
        setSuggestions(response.suggestions || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get suggestions';
        setError(errorMessage);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    getSuggestions();
  }, [findings, examType]);

  // Handle search input
  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const addCode = (code: string) => {
    if (!currentCodes.includes(code)) {
      onCodesUpdate([...currentCodes, code]);
    }
  };

  const removeCode = (code: string) => {
    onCodesUpdate(currentCodes.filter(c => c !== code));
  };

  const getConfidenceColor = (confidence: number): 'success' | 'warning' | 'error' => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const categorizesSuggestions = (): SuggestionCategory[] => {
    const categories: SuggestionCategory[] = [
      {
        name: 'AI Suggested',
        suggestions: suggestions.filter(s => s.confidence >= 0.7),
        priority: 1,
      },
      {
        name: 'High Revenue',
        suggestions: suggestions.filter(s => s.category === 'high-value'),
        priority: 2,
      },
      {
        name: 'Compliance Required',
        suggestions: suggestions.filter(s => s.category === 'compliance'),
        priority: 3,
      },
      {
        name: 'Additional Considerations',
        suggestions: suggestions.filter(s => s.confidence < 0.7 && s.category !== 'high-value' && s.category !== 'compliance'),
        priority: 4,
      },
    ];

    return categories.filter(cat => cat.suggestions.length > 0);
  };

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const categories = categorizesSuggestions();

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          ICD-10 Code Suggestions
        </Typography>

        {/* Search Box */}
        <TextField
          fullWidth
          placeholder="Search ICD-10 codes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {loading ? <CircularProgress size={20} /> : <SearchIcon />}
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
          size="small"
        />

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Current Codes */}
        {currentCodes.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Selected Codes
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {currentCodes.map((code) => (
                <Chip
                  key={code}
                  label={code}
                  onDelete={() => removeCode(code)}
                  color="primary"
                  size="small"
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Suggestions */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {/* Search Results */}
          {searchTerm && searchResults.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Search Results
              </Typography>
              <List dense>
                {searchResults.map((result, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemButton
                      onClick={() => addCode(result.icd10_code || result.cpt_code || '')}
                      disabled={currentCodes.includes(result.icd10_code || result.cpt_code || '')}
                    >
                      <ListItemText
                        primary={result.icd10_code || result.cpt_code}
                        secondary={result.description}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          size="small"
                          onClick={() => addCode(result.icd10_code || result.cpt_code || '')}
                          disabled={currentCodes.includes(result.icd10_code || result.cpt_code || '')}
                        >
                          <AddIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* AI Suggestions by Category */}
          {categories.map((category) => (
            <Accordion
              key={category.name}
              expanded={expandedCategories.has(category.name.toLowerCase().replace(' ', '-'))}
              onChange={() => toggleCategory(category.name.toLowerCase().replace(' ', '-'))}
              sx={{ mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {category.name === 'AI Suggested' && <AIIcon color="primary" />}
                  {category.name === 'High Revenue' && <TrendingIcon color="success" />}
                  {category.name === 'Compliance Required' && <ComplianceIcon color="warning" />}
                  
                  <Typography variant="subtitle2">
                    {category.name} ({category.suggestions.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {category.suggestions.map((suggestion, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemButton
                        onClick={() => addCode(suggestion.icd10_code || suggestion.cpt_code || '')}
                        disabled={currentCodes.includes(suggestion.icd10_code || suggestion.cpt_code || '')}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {suggestion.icd10_code || suggestion.cpt_code}
                              </Typography>
                              <Chip
                                label={getConfidenceLabel(suggestion.confidence)}
                                size="small"
                                color={getConfidenceColor(suggestion.confidence)}
                                variant="outlined"
                              />
                              {suggestion.primary_suitable && (
                                <Chip
                                  label="Primary"
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {suggestion.description}
                              </Typography>
                              {suggestion.reason && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                  Reason: {suggestion.reason}
                                </Typography>
                              )}
                              {suggestion.clinical_indicators && suggestion.clinical_indicators.length > 0 && (
                                <Box sx={{ mt: 0.5 }}>
                                  {suggestion.clinical_indicators.map((indicator, idx) => (
                                    <Chip
                                      key={idx}
                                      label={indicator}
                                      size="small"
                                      variant="outlined"
                                      sx={{ mr: 0.5, mb: 0.5 }}
                                    />
                                  ))}
                                </Box>
                              )}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            size="small"
                            onClick={() => addCode(suggestion.icd10_code || suggestion.cpt_code || '')}
                            disabled={currentCodes.includes(suggestion.icd10_code || suggestion.cpt_code || '')}
                          >
                            <AddIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}

          {/* No Suggestions */}
          {!loading && suggestions.length === 0 && !searchTerm && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <AIIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                {findings ? 'No AI suggestions available' : 'Enter clinical findings to get AI suggestions'}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default CodeSuggestionPanel;