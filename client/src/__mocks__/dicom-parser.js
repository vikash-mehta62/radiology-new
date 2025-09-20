/**
 * Mock for dicom-parser library
 */

const mockDicomParser = {
  // Parse DICOM data
  parseDicom: jest.fn().mockImplementation((byteArray) => {
    return {
      elements: {
        // Patient information
        x00100010: { // Patient Name
          tag: 'x00100010',
          vr: 'PN',
          length: 16,
          dataOffset: 100,
          value: 'Mock^Patient'
        },
        x00100020: { // Patient ID
          tag: 'x00100020',
          vr: 'LO',
          length: 8,
          dataOffset: 120,
          value: 'MOCK001'
        },
        
        // Study information
        x0020000d: { // Study Instance UID
          tag: 'x0020000d',
          vr: 'UI',
          length: 32,
          dataOffset: 140,
          value: '1.2.3.4.5.6.7.8.9.0.1.2.3.4.5'
        },
        x00080020: { // Study Date
          tag: 'x00080020',
          vr: 'DA',
          length: 8,
          dataOffset: 180,
          value: '20231201'
        },
        
        // Image information
        x00280010: { // Rows
          tag: 'x00280010',
          vr: 'US',
          length: 2,
          dataOffset: 200,
          value: 512
        },
        x00280011: { // Columns
          tag: 'x00280011',
          vr: 'US',
          length: 2,
          dataOffset: 202,
          value: 512
        },
        x00280100: { // Bits Allocated
          tag: 'x00280100',
          vr: 'US',
          length: 2,
          dataOffset: 204,
          value: 16
        },
        x00280101: { // Bits Stored
          tag: 'x00280101',
          vr: 'US',
          length: 2,
          dataOffset: 206,
          value: 16
        },
        x00280102: { // High Bit
          tag: 'x00280102',
          vr: 'US',
          length: 2,
          dataOffset: 208,
          value: 15
        },
        x00280103: { // Pixel Representation
          tag: 'x00280103',
          vr: 'US',
          length: 2,
          dataOffset: 210,
          value: 0
        },
        
        // Window/Level
        x00281050: { // Window Center
          tag: 'x00281050',
          vr: 'DS',
          length: 4,
          dataOffset: 220,
          value: '128'
        },
        x00281051: { // Window Width
          tag: 'x00281051',
          vr: 'DS',
          length: 4,
          dataOffset: 224,
          value: '256'
        },
        
        // Pixel Data
        x7fe00010: { // Pixel Data
          tag: 'x7fe00010',
          vr: 'OW',
          length: 512 * 512 * 2,
          dataOffset: 1000,
          fragments: null
        }
      },
      
      // Utility methods
      string: jest.fn((tag) => {
        const element = mockDicomParser.elements[tag];
        return element ? element.value : undefined;
      }),
      
      uint16: jest.fn((tag) => {
        const element = mockDicomParser.elements[tag];
        return element ? element.value : undefined;
      }),
      
      int16: jest.fn((tag) => {
        const element = mockDicomParser.elements[tag];
        return element ? element.value : undefined;
      }),
      
      floatString: jest.fn((tag) => {
        const element = mockDicomParser.elements[tag];
        return element ? parseFloat(element.value) : undefined;
      })
    };
  }),
  
  // Read DICOM file
  readFile: jest.fn().mockImplementation((file) => {
    return Promise.resolve(new ArrayBuffer(1024));
  }),
  
  // Utility functions
  readTag: jest.fn(),
  readSequenceItem: jest.fn(),
  readSequenceItemsExplicit: jest.fn(),
  readSequenceItemsImplicit: jest.fn(),
  
  // Constants
  bigEndianByteArrayParser: {
    uint16: jest.fn(),
    int16: jest.fn(),
    uint32: jest.fn(),
    int32: jest.fn()
  },
  
  littleEndianByteArrayParser: {
    uint16: jest.fn(),
    int16: jest.fn(),
    uint32: jest.fn(),
    int32: jest.fn()
  },
  
  // VR (Value Representation) utilities
  explicitElementToString: jest.fn(),
  implicitElementToString: jest.fn(),
  
  // Transfer syntax
  isJPEGBaseline8BitLossy: jest.fn().mockReturnValue(false),
  isJPEGLossless: jest.fn().mockReturnValue(false),
  isJPEG2000: jest.fn().mockReturnValue(false),
  isRLE: jest.fn().mockReturnValue(false)
};

module.exports = mockDicomParser;