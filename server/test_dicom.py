#!/usr/bin/env python3
"""
Test script to debug DICOM processing
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
        
        print(f"Processing file: {file_path}", file=sys.stderr)
        
        # Read DICOM file
        ds = pydicom.dcmread(str(file_path), force=True)
        print(f"DICOM file loaded successfully", file=sys.stderr)
        
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
            print(f"Pixel array shape: {pixel_array.shape}", file=sys.stderr)
            
            # Handle different array dimensions
            if len(pixel_array.shape) == 3:
                # Multi-slice DICOM
                num_slices = min(pixel_array.shape[0], max_slices)
                metadata['total_slices'] = pixel_array.shape[0]
                metadata['is_multi_slice'] = True
                
                print(f"Processing {num_slices} slices out of {pixel_array.shape[0]}", file=sys.stderr)
                
                for i in range(num_slices):
                    slice_data = pixel_array[i]
                    image_b64 = convert_to_image(slice_data, output_format)
                    if image_b64:
                        slices.append({
                            'slice_number': i,
                            'image_data': image_b64,
                            'format': output_format
                        })
                        print(f"Processed slice {i+1}/{num_slices}", file=sys.stderr)
                        
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
        
        result = {
            'success': True,
            'metadata': metadata,
            'slices': slices,
            'total_slices_extracted': len(slices)
        }
        
        print(f"Extraction complete. Generated {len(slices)} slices", file=sys.stderr)
        return result
        
    except ImportError as e:
        return {
            'success': False,
            'error': f'Missing required libraries: {str(e)}',
        }
    except Exception as e:
        print(f"Error in extract_dicom_slices: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {
            'success': False,
            'error': str(e)
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

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python test_dicom.py <dicom_file_path> <output_format> <max_slices>")
        sys.exit(1)
    
    dicom_file = sys.argv[1]
    output_format = sys.argv[2] if len(sys.argv) > 2 else "PNG"
    max_slices = int(sys.argv[3]) if len(sys.argv) > 3 else 10
    
    result = extract_dicom_slices(dicom_file, output_format, max_slices)
    print(json.dumps(result))