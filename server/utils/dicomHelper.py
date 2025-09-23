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

def extract_dicom_slices(file_path, output_format='PNG', max_slices=None):
    """
    Extract slices from DICOM file and return as base64 encoded images
    Automatically detects and processes all slices when max_slices is None
    """
    try:
        import pydicom
        from PIL import Image
        import numpy as np
        
        # Read DICOM file
        ds = pydicom.dcmread(str(file_path), force=True)
        
        # Enhanced metadata extraction with slice detection and JSON serialization
        metadata = {
            'patient_name': dicom_value_to_json(getattr(ds, 'PatientName', 'Unknown')),
            'patient_id': dicom_value_to_json(getattr(ds, 'PatientID', 'Unknown')),
            'study_date': dicom_value_to_json(getattr(ds, 'StudyDate', '')),
            'study_time': dicom_value_to_json(getattr(ds, 'StudyTime', '')),
            'modality': dicom_value_to_json(getattr(ds, 'Modality', 'Unknown')),
            'study_description': dicom_value_to_json(getattr(ds, 'StudyDescription', '')),
            'series_description': dicom_value_to_json(getattr(ds, 'SeriesDescription', '')),
            'institution_name': dicom_value_to_json(getattr(ds, 'InstitutionName', '')),
            'manufacturer': dicom_value_to_json(getattr(ds, 'Manufacturer', '')),
            # Enhanced slice detection metadata
            'number_of_frames': dicom_value_to_json(getattr(ds, 'NumberOfFrames', None)),
            'instance_number': dicom_value_to_json(getattr(ds, 'InstanceNumber', None)),
            'slice_thickness': dicom_value_to_json(getattr(ds, 'SliceThickness', None)),
            'slice_location': dicom_value_to_json(getattr(ds, 'SliceLocation', None)),
            'image_position_patient': dicom_value_to_json(getattr(ds, 'ImagePositionPatient', None)),
            'image_orientation_patient': dicom_value_to_json(getattr(ds, 'ImageOrientationPatient', None)),
        }
        
        slices = []
        
        # Check if DICOM has pixel data
        if hasattr(ds, 'pixel_array'):
            pixel_array = ds.pixel_array
            
            # Advanced slice detection algorithm
            detected_slices = detect_slice_count(pixel_array, ds)
            total_slices = detected_slices['total_slices']
            slice_type = detected_slices['slice_type']
            
            # Update metadata with detection results
            metadata.update({
                'total_slices': total_slices,
                'is_multi_slice': total_slices > 1,
                'slice_detection_method': detected_slices['detection_method'],
                'slice_type': slice_type,
                'auto_detected': True
            })
            
            # Determine how many slices to process
            if max_slices is None:
                # Process all slices automatically
                num_slices_to_process = total_slices
                metadata['processing_mode'] = 'auto_all_slices'
            else:
                # Respect max_slices limit for backward compatibility
                num_slices_to_process = min(total_slices, max_slices)
                metadata['processing_mode'] = 'limited_slices'
                metadata['max_slices_requested'] = max_slices
            
            # Process slices based on detected structure
            if slice_type == 'multi_frame_3d':
                # 3D multi-frame DICOM (shape: [slices, height, width])
                for i in range(num_slices_to_process):
                    slice_data = pixel_array[i]
                    image_b64 = convert_to_image(slice_data, output_format)
                    if image_b64:
                        slices.append({
                            'slice_number': i,
                            'image_data': image_b64,
                            'format': output_format,
                            'slice_location': get_slice_location(ds, i),
                            'slice_position': get_slice_position(ds, i)
                        })
                        
            elif slice_type == 'multi_frame_4d':
                # 4D DICOM (shape: [time, slices, height, width] or similar)
                # Process first time frame for now
                time_frame = 0
                for i in range(num_slices_to_process):
                    slice_data = pixel_array[time_frame, i] if len(pixel_array.shape) == 4 else pixel_array[i]
                    image_b64 = convert_to_image(slice_data, output_format)
                    if image_b64:
                        slices.append({
                            'slice_number': i,
                            'image_data': image_b64,
                            'format': output_format,
                            'time_frame': time_frame,
                            'slice_location': get_slice_location(ds, i),
                            'slice_position': get_slice_position(ds, i)
                        })
                        
            elif slice_type == 'single_slice':
                # Single slice DICOM
                image_b64 = convert_to_image(pixel_array, output_format)
                if image_b64:
                    slices.append({
                        'slice_number': 0,
                        'image_data': image_b64,
                        'format': output_format,
                        'slice_location': get_slice_location(ds, 0),
                        'slice_position': get_slice_position(ds, 0)
                    })
            
            # Add image dimensions to metadata
            if len(pixel_array.shape) >= 2:
                metadata['image_width'] = int(pixel_array.shape[-1])
                metadata['image_height'] = int(pixel_array.shape[-2])
        
        return {
            'success': True,
            'metadata': metadata,
            'slices': slices,
            'total_slices_extracted': len(slices),
            'auto_detection_info': detected_slices
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

def detect_slice_count(pixel_array, dicom_dataset):
    """
    Advanced slice detection algorithm that automatically identifies
    the number of slices and their structure in a DICOM file
    """
    try:
        import numpy as np
        
        shape = pixel_array.shape
        detection_method = "unknown"
        slice_type = "unknown"
        total_slices = 1
        
        # Method 1: Check NumberOfFrames tag (most reliable for multi-frame)
        if hasattr(dicom_dataset, 'NumberOfFrames') and dicom_dataset.NumberOfFrames:
            total_slices = int(dicom_dataset.NumberOfFrames)
            detection_method = "number_of_frames_tag"
            slice_type = "multi_frame_3d" if len(shape) == 3 else "multi_frame_sequence"
            
        # Method 2: Analyze pixel array dimensions
        elif len(shape) == 4:
            # 4D array: [time, slices, height, width] or [slices, time, height, width]
            total_slices = shape[1] if shape[0] < shape[1] else shape[0]  # Take larger dimension
            detection_method = "4d_array_analysis"
            slice_type = "multi_frame_4d"
            
        elif len(shape) == 3:
            # 3D array: [slices, height, width]
            total_slices = shape[0]
            detection_method = "3d_array_analysis"
            slice_type = "multi_frame_3d"
            
        elif len(shape) == 2:
            # 2D array: single slice
            total_slices = 1
            detection_method = "2d_array_single_slice"
            slice_type = "single_slice"
            
        # Method 3: Check for sequence-based multi-frame
        elif hasattr(dicom_dataset, 'PerFrameFunctionalGroupsSequence'):
            total_slices = len(dicom_dataset.PerFrameFunctionalGroupsSequence)
            detection_method = "per_frame_functional_groups"
            slice_type = "multi_frame_sequence"
            
        # Method 4: Enhanced heuristics for complex cases
        else:
            # Check various DICOM tags that might indicate slice count
            slice_indicators = []
            
            if hasattr(dicom_dataset, 'ImagesInAcquisition'):
                slice_indicators.append(int(dicom_dataset.ImagesInAcquisition))
                
            if hasattr(dicom_dataset, 'NumberOfSlices'):
                slice_indicators.append(int(dicom_dataset.NumberOfSlices))
                
            if hasattr(dicom_dataset, 'CardiacNumberOfImages'):
                slice_indicators.append(int(dicom_dataset.CardiacNumberOfImages))
            
            if slice_indicators:
                total_slices = max(slice_indicators)  # Take the maximum as most likely
                detection_method = "dicom_tag_heuristics"
                slice_type = "multi_frame_tagged"
            else:
                # Fallback: assume single slice
                total_slices = 1
                detection_method = "fallback_single_slice"
                slice_type = "single_slice"
        
        # Validation: ensure total_slices makes sense
        if len(shape) >= 3 and total_slices > shape[0]:
            # If detected slices exceed first dimension, use first dimension
            total_slices = shape[0]
            detection_method += "_corrected"
            
        return {
            'total_slices': total_slices,
            'slice_type': slice_type,
            'detection_method': detection_method,
            'pixel_array_shape': shape,
            'confidence': calculate_detection_confidence(total_slices, shape, dicom_dataset)
        }
        
    except Exception as e:
        # Fallback detection
        return {
            'total_slices': 1,
            'slice_type': 'single_slice',
            'detection_method': 'error_fallback',
            'error': str(e),
            'confidence': 0.1
        }

def calculate_detection_confidence(total_slices, shape, dicom_dataset):
    """
    Calculate confidence score for slice detection (0.0 to 1.0)
    """
    confidence = 0.5  # Base confidence
    
    # Higher confidence for explicit tags
    if hasattr(dicom_dataset, 'NumberOfFrames'):
        confidence += 0.4
    
    # Higher confidence when array dimensions match detected slices
    if len(shape) >= 3 and total_slices == shape[0]:
        confidence += 0.3
        
    # Lower confidence for fallback methods
    if total_slices == 1 and len(shape) > 2:
        confidence -= 0.3
        
    return min(1.0, max(0.1, confidence))

def get_slice_location(dicom_dataset, slice_index):
    """
    Get slice location for a specific slice index
    """
    try:
        if hasattr(dicom_dataset, 'SliceLocation'):
            if isinstance(dicom_dataset.SliceLocation, (list, tuple)):
                return float(dicom_dataset.SliceLocation[slice_index]) if slice_index < len(dicom_dataset.SliceLocation) else None
            else:
                return float(dicom_dataset.SliceLocation)
        return None
    except:
        return None

def get_slice_position(dicom_dataset, slice_index):
    """
    Get slice position information for a specific slice index
    """
    try:
        position_info = {}
        
        if hasattr(dicom_dataset, 'ImagePositionPatient'):
            position_info['image_position'] = list(dicom_dataset.ImagePositionPatient)
            
        if hasattr(dicom_dataset, 'ImageOrientationPatient'):
            position_info['image_orientation'] = list(dicom_dataset.ImageOrientationPatient)
            
        if hasattr(dicom_dataset, 'SliceThickness'):
            position_info['slice_thickness'] = float(dicom_dataset.SliceThickness)
            
        return position_info if position_info else None
    except:
        return None

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

def convert_dicom_to_png_file(file_path, output_dir, slice_index=0):
    """
    Convert DICOM file to PNG file and return the file path
    Optimized for web serving with caching
    """
    try:
        import pydicom
        from PIL import Image
        import numpy as np
        import hashlib
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate cache filename based on file path and slice index
        file_hash = hashlib.md5(f"{file_path}_{slice_index}".encode()).hexdigest()
        png_filename = f"{file_hash}.png"
        png_path = os.path.join(output_dir, png_filename)
        
        # Check if PNG already exists (caching)
        if os.path.exists(png_path):
            return {
                'success': True,
                'png_path': png_path,
                'png_filename': png_filename,
                'cached': True
            }
        
        # Read DICOM file
        ds = pydicom.dcmread(str(file_path), force=True)
        
        if not hasattr(ds, 'pixel_array'):
            return {
                'success': False,
                'error': 'No pixel data found in DICOM file'
            }
        
        pixel_array = ds.pixel_array
        
        # Handle multi-slice DICOM
        if len(pixel_array.shape) == 3:
            if slice_index >= pixel_array.shape[0]:
                slice_index = 0  # Default to first slice
            pixel_data = pixel_array[slice_index]
        else:
            pixel_data = pixel_array
        
        # Normalize pixel values to 0-255 range
        if pixel_data.dtype != np.uint8:
            if pixel_data.max() > 255:
                pixel_data = ((pixel_data - pixel_data.min()) / 
                             (pixel_data.max() - pixel_data.min()) * 255).astype(np.uint8)
            else:
                pixel_data = pixel_data.astype(np.uint8)
        
        # Create PIL Image and save as PNG
        image = Image.fromarray(pixel_data, mode='L')  # Grayscale
        image.save(png_path, format='PNG', optimize=True)
        
        return {
            'success': True,
            'png_path': png_path,
            'png_filename': png_filename,
            'cached': False,
            'dimensions': image.size
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def dicom_value_to_json(value):
    """
    Convert DICOM values (including MultiValue) to JSON-serializable format
    """
    if value is None:
        return None
    
    # Handle MultiValue objects
    if hasattr(value, '__iter__') and not isinstance(value, (str, bytes)):
        try:
            return [str(item) for item in value]
        except:
            return str(value)
    
    # Handle other DICOM objects
    return str(value)

def get_dicom_info(file_path):
    """
    Get basic DICOM file information without processing pixel data
    """
    try:
        import pydicom
        
        ds = pydicom.dcmread(str(file_path), force=True)
        
        info = {
            'patient_name': dicom_value_to_json(getattr(ds, 'PatientName', 'Unknown')),
            'patient_id': dicom_value_to_json(getattr(ds, 'PatientID', 'Unknown')),
            'study_date': dicom_value_to_json(getattr(ds, 'StudyDate', '')),
            'study_time': dicom_value_to_json(getattr(ds, 'StudyTime', '')),
            'modality': dicom_value_to_json(getattr(ds, 'Modality', 'Unknown')),
            'study_description': dicom_value_to_json(getattr(ds, 'StudyDescription', '')),
            'series_description': dicom_value_to_json(getattr(ds, 'SeriesDescription', '')),
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
    """
    Main function to handle command line arguments
    """
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'No command specified'
        }))
        return
    
    command = sys.argv[1]
    
    if command == 'extract_slices':
        if len(sys.argv) < 3:
            print(json.dumps({
                'success': False,
                'error': 'File path required for extract_slices'
            }))
            return
        
        file_path = sys.argv[2]
        output_format = sys.argv[3] if len(sys.argv) > 3 else 'PNG'
        
        # Fix: Properly parse max_slices argument - '0' or negative means unlimited (None)
        raw_max = sys.argv[4] if len(sys.argv) > 4 else None
        try:
            max_slices = int(raw_max) if raw_max is not None else None
            if max_slices is not None and max_slices <= 0:
                max_slices = None  # '0' or negative means process all slices
        except (ValueError, TypeError):
            max_slices = None  # Invalid input means process all slices
        
        result = extract_dicom_slices(file_path, output_format, max_slices)
        print(json.dumps(result))
    
    elif command == 'convert_to_png':
        if len(sys.argv) < 4:
            print(json.dumps({
                'success': False,
                'error': 'File path and output directory required for convert_to_png'
            }))
            return
        
        file_path = sys.argv[2]
        output_dir = sys.argv[3]
        slice_index = int(sys.argv[4]) if len(sys.argv) > 4 else 0
        
        result = convert_dicom_to_png_file(file_path, output_dir, slice_index)
        print(json.dumps(result))
    
    elif command == 'get_info':
        if len(sys.argv) < 3:
            print(json.dumps({
                'success': False,
                'error': 'File path required for get_info'
            }))
            return
        
        file_path = sys.argv[2]
        result = get_dicom_info(file_path)
        print(json.dumps(result))
    
    else:
        print(json.dumps({
            'success': False,
            'error': f'Unknown command: {command}'
        }))

if __name__ == "__main__":
    main()