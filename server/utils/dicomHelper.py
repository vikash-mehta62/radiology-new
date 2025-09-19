#!/usr/bin/env python3
"""
DICOM Helper for Node.js Backend
Provides DICOM processing functionality for slice extraction and metadata
"""

import sys
import json
import os
from pathlib import Path
import base64
import io

def extract_dicom_slices(file_path, output_format='PNG', max_slices=10):
    """
    Extract slices from DICOM file and return as base64 encoded images
    """
    try:
        import pydicom
        from PIL import Image
        import numpy as np
        
        # Read DICOM file
        ds = pydicom.dcmread(str(file_path), force=True)
        
        # Extract metadata
        metadata = {
            'patient_name': str(getattr(ds, 'PatientName', 'Unknown')),
            'patient_id': str(getattr(ds, 'PatientID', 'Unknown')),
            'study_date': str(getattr(ds, 'StudyDate', '')),
            'study_time': str(getattr(ds, 'StudyTime', '')),
            'modality': str(getattr(ds, 'Modality', 'Unknown')),
            'study_description': str(getattr(ds, 'StudyDescription', '')),
            'series_description': str(getattr(ds, 'SeriesDescription', '')),
            'institution_name': str(getattr(ds, 'InstitutionName', '')),
            'manufacturer': str(getattr(ds, 'Manufacturer', '')),
        }
        
        slices = []
        
        # Check if DICOM has pixel data
        if hasattr(ds, 'pixel_array'):
            pixel_array = ds.pixel_array
            
            # Handle different array dimensions
            if len(pixel_array.shape) == 3:
                # Multi-slice DICOM
                num_slices = min(pixel_array.shape[0], max_slices)
                metadata['total_slices'] = pixel_array.shape[0]
                metadata['is_multi_slice'] = True
                
                for i in range(num_slices):
                    slice_data = pixel_array[i]
                    image_b64 = convert_to_image(slice_data, output_format)
                    if image_b64:
                        slices.append({
                            'slice_number': i,
                            'image_data': image_b64,
                            'format': output_format
                        })
                        
            elif len(pixel_array.shape) == 2:
                # Single slice DICOM
                metadata['total_slices'] = 1
                metadata['is_multi_slice'] = False
                
                image_b64 = convert_to_image(pixel_array, output_format)
                if image_b64:
                    slices.append({
                        'slice_number': 0,
                        'image_data': image_b64,
                        'format': output_format
                    })
            
            # Add image dimensions to metadata
            if len(pixel_array.shape) >= 2:
                metadata['image_width'] = int(pixel_array.shape[-1])
                metadata['image_height'] = int(pixel_array.shape[-2])
        
        return {
            'success': True,
            'metadata': metadata,
            'slices': slices,
            'total_slices_extracted': len(slices)
        }
        
    except ImportError as e:
        return {
            'success': False,
            'error': f'Missing required libraries: {str(e)}',
            'message': 'Please install pydicom and Pillow: pip install pydicom Pillow'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'message': 'Failed to process DICOM file'
        }

def convert_to_image(pixel_array, output_format='PNG'):
    """
    Convert pixel array to base64 encoded image
    """
    try:
        from PIL import Image
        import numpy as np
        
        # Normalize pixel values to 0-255 range
        if pixel_array.dtype != np.uint8:
            # Handle different bit depths
            if pixel_array.max() > 255:
                # Normalize to 0-255 range
                pixel_array = ((pixel_array - pixel_array.min()) / 
                             (pixel_array.max() - pixel_array.min()) * 255).astype(np.uint8)
            else:
                pixel_array = pixel_array.astype(np.uint8)
        
        # Create PIL Image
        image = Image.fromarray(pixel_array, mode='L')  # Grayscale
        
        # Convert to base64
        buffer = io.BytesIO()
        image.save(buffer, format=output_format)
        image_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return image_b64
        
    except Exception as e:
        print(f"Error converting image: {e}", file=sys.stderr)
        return None

def get_dicom_info(file_path):
    """
    Get basic DICOM file information without processing pixel data
    """
    try:
        import pydicom
        
        ds = pydicom.dcmread(str(file_path), force=True)
        
        info = {
            'patient_name': str(getattr(ds, 'PatientName', 'Unknown')),
            'patient_id': str(getattr(ds, 'PatientID', 'Unknown')),
            'study_date': str(getattr(ds, 'StudyDate', '')),
            'study_time': str(getattr(ds, 'StudyTime', '')),
            'modality': str(getattr(ds, 'Modality', 'Unknown')),
            'study_description': str(getattr(ds, 'StudyDescription', '')),
            'series_description': str(getattr(ds, 'SeriesDescription', '')),
            'has_pixel_data': hasattr(ds, 'pixel_array'),
            'file_size': os.path.getsize(file_path)
        }
        
        if hasattr(ds, 'pixel_array'):
            pixel_array = ds.pixel_array
            info['image_shape'] = list(pixel_array.shape)
            info['is_multi_slice'] = len(pixel_array.shape) == 3
            if len(pixel_array.shape) == 3:
                info['total_slices'] = pixel_array.shape[0]
            else:
                info['total_slices'] = 1
        
        return {
            'success': True,
            'info': info
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def main():
    """Command line usage"""
    if len(sys.argv) < 3:
        print("Usage: python dicomHelper.py <command> <dicom_file_path> [options]")
        print("Commands:")
        print("  extract_slices <file> [format] [max_slices] - Extract DICOM slices")
        print("  get_info <file> - Get DICOM metadata")
        sys.exit(1)
    
    command = sys.argv[1]
    dicom_file = sys.argv[2]
    
    if command == "extract_slices":
        output_format = sys.argv[3] if len(sys.argv) > 3 else "PNG"
        max_slices = int(sys.argv[4]) if len(sys.argv) > 4 else 10
        result = extract_dicom_slices(dicom_file, output_format, max_slices)
        print(json.dumps(result))
    elif command == "get_info":
        result = get_dicom_info(dicom_file)
        print(json.dumps(result))
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()