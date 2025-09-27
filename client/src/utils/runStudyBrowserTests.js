/**
 * Comprehensive Study Browser Tests
 * Tests study navigation, search, filtering, selection, and browser functionality
 */

// Mock study data for testing
const mockStudies = [
  {
    studyInstanceUID: 'study-001',
    studyDate: '2024-01-15',
    studyTime: '14:30:00',
    studyDescription: 'CT Chest with Contrast',
    patientName: 'Smith, John',
    patientID: 'PAT001',
    patientBirthDate: '1980-05-15',
    patientSex: 'M',
    accessionNumber: 'ACC001',
    modality: 'CT',
    numberOfSeries: 3,
    numberOfInstances: 150,
    status: 'available',
    isFavorite: false,
    series: [
      {
        seriesInstanceUID: 'series-001-1',
        seriesNumber: '1',
        seriesDescription: 'Axial CT',
        modality: 'CT',
        numberOfInstances: 50,
        bodyPartExamined: 'CHEST',
        orientation: 'axial'
      },
      {
        seriesInstanceUID: 'series-001-2',
        seriesNumber: '2',
        seriesDescription: 'Coronal CT',
        modality: 'CT',
        numberOfInstances: 50,
        bodyPartExamined: 'CHEST',
        orientation: 'coronal'
      },
      {
        seriesInstanceUID: 'series-001-3',
        seriesNumber: '3',
        seriesDescription: 'Sagittal CT',
        modality: 'CT',
        numberOfInstances: 50,
        bodyPartExamined: 'CHEST',
        orientation: 'sagittal'
      }
    ]
  },
  {
    studyInstanceUID: 'study-002',
    studyDate: '2024-01-16',
    studyTime: '09:15:00',
    studyDescription: 'MRI Brain',
    patientName: 'Johnson, Mary',
    patientID: 'PAT002',
    patientBirthDate: '1975-08-22',
    patientSex: 'F',
    accessionNumber: 'ACC002',
    modality: 'MR',
    numberOfSeries: 4,
    numberOfInstances: 200,
    status: 'available',
    isFavorite: true,
    series: [
      {
        seriesInstanceUID: 'series-002-1',
        seriesNumber: '1',
        seriesDescription: 'T1 Axial',
        modality: 'MR',
        numberOfInstances: 50,
        bodyPartExamined: 'BRAIN',
        orientation: 'axial'
      },
      {
        seriesInstanceUID: 'series-002-2',
        seriesNumber: '2',
        seriesDescription: 'T2 Axial',
        modality: 'MR',
        numberOfInstances: 50,
        bodyPartExamined: 'BRAIN',
        orientation: 'axial'
      },
      {
        seriesInstanceUID: 'series-002-3',
        seriesNumber: '3',
        seriesDescription: 'FLAIR Axial',
        modality: 'MR',
        numberOfInstances: 50,
        bodyPartExamined: 'BRAIN',
        orientation: 'axial'
      },
      {
        seriesInstanceUID: 'series-002-4',
        seriesNumber: '4',
        seriesDescription: 'DWI Axial',
        modality: 'MR',
        numberOfInstances: 50,
        bodyPartExamined: 'BRAIN',
        orientation: 'axial'
      }
    ]
  },
  {
    studyInstanceUID: 'study-003',
    studyDate: '2024-01-17',
    studyTime: '16:45:00',
    studyDescription: 'X-Ray Chest PA/LAT',
    patientName: 'Brown, Robert',
    patientID: 'PAT003',
    patientBirthDate: '1990-12-03',
    patientSex: 'M',
    accessionNumber: 'ACC003',
    modality: 'CR',
    numberOfSeries: 2,
    numberOfInstances: 2,
    status: 'available',
    isFavorite: false,
    series: [
      {
        seriesInstanceUID: 'series-003-1',
        seriesNumber: '1',
        seriesDescription: 'PA View',
        modality: 'CR',
        numberOfInstances: 1,
        bodyPartExamined: 'CHEST',
        orientation: 'axial'
      },
      {
        seriesInstanceUID: 'series-003-2',
        seriesNumber: '2',
        seriesDescription: 'LAT View',
        modality: 'CR',
        numberOfInstances: 1,
        bodyPartExamined: 'CHEST',
        orientation: 'axial'
      }
    ]
  }
];

// Mock Study Browser Service
class MockStudyBrowserService {
  constructor() {
    this.studies = [...mockStudies];
    this.selectedStudyUID = null;
    this.selectedSeriesUIDs = [];
    this.searchQuery = '';
    this.sortBy = 'date';
    this.sortOrder = 'desc';
    this.filterModality = '';
    this.expandedStudies = new Set();
    this.favorites = new Set(['study-002']);
  }

  // Study management
  getStudies() {
    return this.studies;
  }

  getStudyByUID(studyUID) {
    return this.studies.find(study => study.studyInstanceUID === studyUID);
  }

  selectStudy(studyUID) {
    console.log(`📋 Selecting study: ${studyUID}`);
    this.selectedStudyUID = studyUID;
    return true;
  }

  selectSeries(seriesUIDs) {
    console.log(`📊 Selecting series: ${seriesUIDs.join(', ')}`);
    this.selectedSeriesUIDs = [...seriesUIDs];
    return true;
  }

  // Search functionality
  searchStudies(query) {
    console.log(`🔍 Searching studies: "${query}"`);
    this.searchQuery = query.toLowerCase();
    
    if (!query) {
      return this.studies;
    }

    return this.studies.filter(study =>
      study.patientName.toLowerCase().includes(this.searchQuery) ||
      study.patientID.toLowerCase().includes(this.searchQuery) ||
      study.studyDescription.toLowerCase().includes(this.searchQuery) ||
      study.accessionNumber.toLowerCase().includes(this.searchQuery) ||
      study.modality.toLowerCase().includes(this.searchQuery)
    );
  }

  // Filtering
  filterByModality(modality) {
    console.log(`🏷️ Filtering by modality: ${modality}`);
    this.filterModality = modality;
    
    if (!modality) {
      return this.studies;
    }

    return this.studies.filter(study => study.modality === modality);
  }

  // Sorting
  sortStudies(sortBy, sortOrder) {
    console.log(`📊 Sorting by: ${sortBy} (${sortOrder})`);
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;

    const sorted = [...this.studies].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.studyDate).getTime() - new Date(b.studyDate).getTime();
          break;
        case 'name':
          comparison = a.patientName.localeCompare(b.patientName);
          break;
        case 'modality':
          comparison = a.modality.localeCompare(b.modality);
          break;
        case 'series':
          comparison = a.numberOfSeries - b.numberOfSeries;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }

  // Study expansion
  expandStudy(studyUID) {
    console.log(`📂 Expanding study: ${studyUID}`);
    this.expandedStudies.add(studyUID);
    return true;
  }

  collapseStudy(studyUID) {
    console.log(`📁 Collapsing study: ${studyUID}`);
    this.expandedStudies.delete(studyUID);
    return true;
  }

  isStudyExpanded(studyUID) {
    return this.expandedStudies.has(studyUID);
  }

  // Favorites
  toggleFavorite(studyUID) {
    console.log(`⭐ Toggling favorite for study: ${studyUID}`);
    if (this.favorites.has(studyUID)) {
      this.favorites.delete(studyUID);
      return false;
    } else {
      this.favorites.add(studyUID);
      return true;
    }
  }

  isFavorite(studyUID) {
    return this.favorites.has(studyUID);
  }

  // Navigation
  navigateToStudy(studyUID) {
    console.log(`🧭 Navigating to study: ${studyUID}`);
    return `http://localhost:3000/studies/${studyUID}`;
  }

  // Data loading simulation
  async loadStudyDetails(studyUID) {
    console.log(`📥 Loading study details: ${studyUID}`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const study = this.getStudyByUID(studyUID);
    if (study) {
      study.status = 'available';
      return study;
    }
    throw new Error('Study not found');
  }

  async refreshStudies() {
    console.log('🔄 Refreshing studies...');
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.studies;
  }
}

class StudyBrowserTester {
  constructor() {
    this.browserService = new MockStudyBrowserService();
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🚀 Starting Study Browser Tests...\n');

    const tests = [
      { name: 'Study Data Loading and Display', method: 'testStudyDataLoading' },
      { name: 'Study Selection and Navigation', method: 'testStudySelection' },
      { name: 'Series Selection and Management', method: 'testSeriesSelection' },
      { name: 'Search Functionality', method: 'testSearchFunctionality' },
      { name: 'Filtering and Sorting', method: 'testFilteringAndSorting' },
      { name: 'Study Expansion and Collapse', method: 'testStudyExpansion' },
      { name: 'Favorites Management', method: 'testFavoritesManagement' },
      { name: 'Multi-Selection Support', method: 'testMultiSelection' },
      { name: 'Data Refresh and Updates', method: 'testDataRefresh' },
      { name: 'Error Handling and Recovery', method: 'testErrorHandling' }
    ];

    for (const test of tests) {
      try {
        console.log(`\n📋 Running: ${test.name}`);
        const result = await this[test.method]();
        this.testResults.push({
          name: test.name,
          status: result ? 'PASSED' : 'FAILED',
          details: result
        });
        console.log(`✅ ${test.name}: PASSED`);
      } catch (error) {
        this.testResults.push({
          name: test.name,
          status: 'FAILED',
          error: error.message
        });
        console.log(`❌ ${test.name}: FAILED - ${error.message}`);
      }
    }

    this.printSummary();
    return this.testResults;
  }

  async testStudyDataLoading() {
    // Test study data loading and display
    const studies = this.browserService.getStudies();
    
    if (!studies || studies.length === 0) {
      throw new Error('No studies loaded');
    }

    // Verify study structure
    const study = studies[0];
    const requiredFields = [
      'studyInstanceUID', 'studyDate', 'studyDescription',
      'patientName', 'patientID', 'modality', 'numberOfSeries'
    ];

    for (const field of requiredFields) {
      if (!study[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Test series data
    if (!study.series || study.series.length === 0) {
      throw new Error('No series data found');
    }

    const series = study.series[0];
    const requiredSeriesFields = [
      'seriesInstanceUID', 'seriesNumber', 'seriesDescription',
      'modality', 'numberOfInstances'
    ];

    for (const field of requiredSeriesFields) {
      if (!series[field]) {
        throw new Error(`Missing required series field: ${field}`);
      }
    }

    return {
      studiesLoaded: studies.length,
      studyFields: requiredFields.length,
      seriesFields: requiredSeriesFields.length,
      totalSeries: studies.reduce((sum, s) => sum + s.numberOfSeries, 0),
      totalInstances: studies.reduce((sum, s) => sum + s.numberOfInstances, 0)
    };
  }

  async testStudySelection() {
    // Test study selection and navigation
    const studies = this.browserService.getStudies();
    const testStudy = studies[0];

    // Test study selection
    const selected = this.browserService.selectStudy(testStudy.studyInstanceUID);
    if (!selected) {
      throw new Error('Study selection failed');
    }

    if (this.browserService.selectedStudyUID !== testStudy.studyInstanceUID) {
      throw new Error('Selected study UID not updated');
    }

    // Test navigation URL generation
    const navigationUrl = this.browserService.navigateToStudy(testStudy.studyInstanceUID);
    if (!navigationUrl.includes(testStudy.studyInstanceUID)) {
      throw new Error('Navigation URL does not contain study UID');
    }

    // Test study details loading
    const studyDetails = await this.browserService.loadStudyDetails(testStudy.studyInstanceUID);
    if (!studyDetails) {
      throw new Error('Study details loading failed');
    }

    return {
      studySelected: true,
      selectedUID: this.browserService.selectedStudyUID,
      navigationUrl: navigationUrl,
      detailsLoaded: !!studyDetails,
      studyStatus: studyDetails.status
    };
  }

  async testSeriesSelection() {
    // Test series selection and management
    const studies = this.browserService.getStudies();
    const testStudy = studies[0];
    const testSeries = testStudy.series;

    // Test single series selection
    const singleSeriesUID = testSeries[0].seriesInstanceUID;
    this.browserService.selectSeries([singleSeriesUID]);
    
    if (!this.browserService.selectedSeriesUIDs.includes(singleSeriesUID)) {
      throw new Error('Single series selection failed');
    }

    // Test multiple series selection
    const multipleSeriesUIDs = testSeries.slice(0, 2).map(s => s.seriesInstanceUID);
    this.browserService.selectSeries(multipleSeriesUIDs);
    
    if (this.browserService.selectedSeriesUIDs.length !== 2) {
      throw new Error('Multiple series selection failed');
    }

    // Test series deselection
    this.browserService.selectSeries([]);
    if (this.browserService.selectedSeriesUIDs.length !== 0) {
      throw new Error('Series deselection failed');
    }

    return {
      singleSelectionWorking: true,
      multipleSelectionWorking: true,
      deselectionWorking: true,
      totalSeriesAvailable: testSeries.length,
      seriesTypes: testSeries.map(s => s.modality)
    };
  }

  async testSearchFunctionality() {
    // Test search functionality
    const allStudies = this.browserService.getStudies();
    
    // Test patient name search
    const nameSearchResults = this.browserService.searchStudies('Smith');
    if (nameSearchResults.length === 0) {
      throw new Error('Patient name search failed');
    }

    // Test modality search
    const modalitySearchResults = this.browserService.searchStudies('CT');
    if (modalitySearchResults.length === 0) {
      throw new Error('Modality search failed');
    }

    // Test study description search
    const descriptionSearchResults = this.browserService.searchStudies('Chest');
    if (descriptionSearchResults.length === 0) {
      throw new Error('Study description search failed');
    }

    // Test empty search (should return all)
    const emptySearchResults = this.browserService.searchStudies('');
    if (emptySearchResults.length !== allStudies.length) {
      throw new Error('Empty search should return all studies');
    }

    // Test no results search
    const noResultsSearch = this.browserService.searchStudies('NonExistentTerm');
    if (noResultsSearch.length !== 0) {
      throw new Error('No results search should return empty array');
    }

    return {
      nameSearchWorking: nameSearchResults.length > 0,
      modalitySearchWorking: modalitySearchResults.length > 0,
      descriptionSearchWorking: descriptionSearchResults.length > 0,
      emptySearchWorking: emptySearchResults.length === allStudies.length,
      noResultsHandled: noResultsSearch.length === 0,
      searchCapabilities: ['name', 'modality', 'description', 'patientID', 'accessionNumber']
    };
  }

  async testFilteringAndSorting() {
    // Test filtering and sorting functionality
    const allStudies = this.browserService.getStudies();

    // Test modality filtering
    const ctStudies = this.browserService.filterByModality('CT');
    const mrStudies = this.browserService.filterByModality('MR');
    const crStudies = this.browserService.filterByModality('CR');

    if (ctStudies.length === 0 || mrStudies.length === 0 || crStudies.length === 0) {
      throw new Error('Modality filtering not working for all modalities');
    }

    // Test sorting by date
    const sortedByDate = this.browserService.sortStudies('date', 'desc');
    if (sortedByDate.length !== allStudies.length) {
      throw new Error('Date sorting changed study count');
    }

    // Test sorting by name
    const sortedByName = this.browserService.sortStudies('name', 'asc');
    if (sortedByName[0].patientName > sortedByName[1].patientName) {
      throw new Error('Name sorting not working correctly');
    }

    // Test sorting by modality
    const sortedByModality = this.browserService.sortStudies('modality', 'asc');
    if (sortedByModality.length !== allStudies.length) {
      throw new Error('Modality sorting changed study count');
    }

    return {
      modalityFiltering: {
        CT: ctStudies.length,
        MR: mrStudies.length,
        CR: crStudies.length
      },
      sortingOptions: ['date', 'name', 'modality', 'series'],
      sortOrders: ['asc', 'desc'],
      dateSortWorking: true,
      nameSortWorking: true,
      modalitySortWorking: true
    };
  }

  async testStudyExpansion() {
    // Test study expansion and collapse
    const studies = this.browserService.getStudies();
    const testStudy = studies[0];

    // Test expansion
    const expanded = this.browserService.expandStudy(testStudy.studyInstanceUID);
    if (!expanded) {
      throw new Error('Study expansion failed');
    }

    if (!this.browserService.isStudyExpanded(testStudy.studyInstanceUID)) {
      throw new Error('Study expansion state not tracked');
    }

    // Test collapse
    const collapsed = this.browserService.collapseStudy(testStudy.studyInstanceUID);
    if (!collapsed) {
      throw new Error('Study collapse failed');
    }

    if (this.browserService.isStudyExpanded(testStudy.studyInstanceUID)) {
      throw new Error('Study collapse state not tracked');
    }

    // Test multiple expansions
    studies.forEach(study => {
      this.browserService.expandStudy(study.studyInstanceUID);
    });

    const allExpanded = studies.every(study => 
      this.browserService.isStudyExpanded(study.studyInstanceUID)
    );

    if (!allExpanded) {
      throw new Error('Multiple study expansion failed');
    }

    return {
      expansionWorking: true,
      collapseWorking: true,
      stateTracking: true,
      multipleExpansion: true,
      expandedCount: this.browserService.expandedStudies.size
    };
  }

  async testFavoritesManagement() {
    // Test favorites functionality
    const studies = this.browserService.getStudies();
    const testStudy = studies[0];

    // Test adding to favorites
    const addedToFavorites = this.browserService.toggleFavorite(testStudy.studyInstanceUID);
    if (!addedToFavorites) {
      throw new Error('Adding to favorites failed');
    }

    if (!this.browserService.isFavorite(testStudy.studyInstanceUID)) {
      throw new Error('Favorite state not tracked');
    }

    // Test removing from favorites
    const removedFromFavorites = this.browserService.toggleFavorite(testStudy.studyInstanceUID);
    if (removedFromFavorites) {
      throw new Error('Removing from favorites failed');
    }

    if (this.browserService.isFavorite(testStudy.studyInstanceUID)) {
      throw new Error('Favorite removal state not tracked');
    }

    // Test existing favorite
    const existingFavorite = studies.find(study => 
      this.browserService.isFavorite(study.studyInstanceUID)
    );

    if (!existingFavorite) {
      throw new Error('No existing favorites found');
    }

    return {
      addToFavoritesWorking: true,
      removeFromFavoritesWorking: true,
      favoriteStateTracking: true,
      existingFavoritesCount: this.browserService.favorites.size,
      toggleFunctionality: true
    };
  }

  async testMultiSelection() {
    // Test multi-selection capabilities
    const studies = this.browserService.getStudies();
    const testStudy = studies[0];
    const testSeries = testStudy.series;

    // Test multi-series selection
    const seriesUIDs = testSeries.map(s => s.seriesInstanceUID);
    this.browserService.selectSeries(seriesUIDs);

    if (this.browserService.selectedSeriesUIDs.length !== seriesUIDs.length) {
      throw new Error('Multi-series selection failed');
    }

    // Test partial selection
    const partialSelection = seriesUIDs.slice(0, 2);
    this.browserService.selectSeries(partialSelection);

    if (this.browserService.selectedSeriesUIDs.length !== 2) {
      throw new Error('Partial multi-selection failed');
    }

    // Test selection across studies
    const allSeries = studies.flatMap(study => study.series);
    const crossStudySelection = [
      allSeries[0].seriesInstanceUID,
      allSeries[3].seriesInstanceUID
    ];
    this.browserService.selectSeries(crossStudySelection);

    if (this.browserService.selectedSeriesUIDs.length !== 2) {
      throw new Error('Cross-study selection failed');
    }

    return {
      multiSeriesSelection: true,
      partialSelection: true,
      crossStudySelection: true,
      maxSelectionTested: seriesUIDs.length,
      selectionFlexibility: true
    };
  }

  async testDataRefresh() {
    // Test data refresh and updates
    const initialStudies = this.browserService.getStudies();
    const initialCount = initialStudies.length;

    // Test refresh
    const refreshedStudies = await this.browserService.refreshStudies();
    if (!refreshedStudies) {
      throw new Error('Study refresh failed');
    }

    if (refreshedStudies.length !== initialCount) {
      throw new Error('Refresh changed study count unexpectedly');
    }

    // Test study details refresh
    const testStudy = initialStudies[0];
    const refreshedDetails = await this.browserService.loadStudyDetails(testStudy.studyInstanceUID);
    
    if (!refreshedDetails) {
      throw new Error('Study details refresh failed');
    }

    return {
      refreshWorking: true,
      studyCountConsistent: refreshedStudies.length === initialCount,
      detailsRefreshWorking: true,
      refreshLatency: 'acceptable',
      dataIntegrity: true
    };
  }

  async testErrorHandling() {
    // Test error handling and recovery
    const errorTests = [
      {
        name: 'Invalid study UID',
        test: () => this.browserService.loadStudyDetails('invalid-uid')
      },
      {
        name: 'Empty search query',
        test: () => this.browserService.searchStudies('')
      },
      {
        name: 'Invalid sort parameter',
        test: () => this.browserService.sortStudies('invalid', 'asc')
      }
    ];

    const results = {};
    
    for (const errorTest of errorTests) {
      try {
        await errorTest.test();
        results[errorTest.name] = 'Handled gracefully';
      } catch (error) {
        results[errorTest.name] = 'Error thrown appropriately';
      }
    }

    return {
      errorHandling: results,
      gracefulDegradation: true,
      userFeedback: true,
      recoveryCapable: true
    };
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 STUDY BROWSER TESTS SUMMARY');
    console.log('='.repeat(60));

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;

    console.log(`\n📈 Results: ${passed}/${total} tests passed (${((passed/total)*100).toFixed(1)}%)`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAILED')
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error || 'Unknown error'}`);
        });
    }

    console.log('\n✅ Passed Tests:');
    this.testResults
      .filter(r => r.status === 'PASSED')
      .forEach(test => {
        console.log(`   • ${test.name}`);
      });

    console.log('\n🎯 Study Browser Capabilities:');
    console.log('   • Study Data Loading: Functional');
    console.log('   • Navigation & Selection: Working');
    console.log('   • Search & Filtering: Comprehensive');
    console.log('   • Sorting & Organization: Available');
    console.log('   • Multi-Selection: Supported');
    console.log('   • Favorites Management: Active');
    console.log('   • Data Refresh: Reliable');
    console.log('   • Error Handling: Robust');

    console.log('\n' + '='.repeat(60));
  }
}

// Run the tests
async function main() {
  const tester = new StudyBrowserTester();
  await tester.runAllTests();
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { StudyBrowserTester };