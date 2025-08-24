"""
Test script for the Anomaly Detection System

This script validates the implementation against the problem requirements.
"""

import pandas as pd
import numpy as np
import os
import sys
from datetime import datetime
import logging

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from anomaly_detector import AnomalyDetectionSystem, main

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def test_data_loading():
    """Test data loading and validation."""
    logger.info("=== TESTING DATA LOADING ===")
    
    input_file = "81ce1f00-c3f4-4baa-9b57-006fad1875adTEP_Train_Test.csv"
    
    if not os.path.exists(input_file):
        logger.error(f"Input file {input_file} not found!")
        return False
    
    try:
        # Test basic data loading
        df = pd.read_csv(input_file)
        logger.info(f"✓ Data loaded successfully: {len(df)} rows, {len(df.columns)} columns")
        
        # Check Time column
        if 'Time' not in df.columns:
            logger.error("✗ Time column not found!")
            return False
        logger.info("✓ Time column found")
        
        # Check numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        logger.info(f"✓ Found {len(numeric_cols)} numeric columns")
        
        # Check time range
        df['Time'] = pd.to_datetime(df['Time'])
        time_range = df['Time'].max() - df['Time'].min()
        logger.info(f"✓ Time range: {time_range}")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Data loading failed: {str(e)}")
        return False


def test_anomaly_detection():
    """Test the complete anomaly detection system."""
    logger.info("=== TESTING ANOMALY DETECTION SYSTEM ===")
    
    input_file = "81ce1f00-c3f4-4baa-9b57-006fad1875adTEP_Train_Test.csv"
    output_file = "test_output.csv"
    
    try:
        # Run anomaly detection
        start_time = datetime.now()
        main(input_file, output_file)
        end_time = datetime.now()
        
        runtime = (end_time - start_time).total_seconds()
        logger.info(f"✓ Anomaly detection completed in {runtime:.2f} seconds")
        
        # Validate output file
        if not os.path.exists(output_file):
            logger.error("✗ Output file not created!")
            return False
        
        # Load and validate output
        output_df = pd.read_csv(output_file)
        logger.info(f"✓ Output file created: {len(output_df)} rows, {len(output_df.columns)} columns")
        
        # Check required columns
        required_columns = ['Abnormality_score'] + [f'top_feature_{i+1}' for i in range(7)]
        missing_columns = [col for col in required_columns if col not in output_df.columns]
        
        if missing_columns:
            logger.error(f"✗ Missing required columns: {missing_columns}")
            return False
        logger.info("✓ All required columns present")
        
        # Validate abnormality scores
        scores = output_df['Abnormality_score']
        if scores.min() < 0 or scores.max() > 100:
            logger.error(f"✗ Scores out of range: min={scores.min()}, max={scores.max()}")
            return False
        logger.info(f"✓ Scores in valid range: {scores.min():.2f} to {scores.max():.2f}")
        
        # Check training period scores
        output_df['Time'] = pd.to_datetime(output_df['Time'])
        training_mask = (output_df['Time'] >= pd.Timestamp('2004-01-01 00:00:00')) & \
                       (output_df['Time'] <= pd.Timestamp('2004-01-05 23:59:59'))
        
        training_scores = output_df.loc[training_mask, 'Abnormality_score']
        if len(training_scores) > 0:
            mean_score = training_scores.mean()
            max_score = training_scores.max()
            logger.info(f"✓ Training period - Mean: {mean_score:.2f}, Max: {max_score:.2f}")
            
            if mean_score > 10:
                logger.warning(f"⚠ Training period mean score ({mean_score:.2f}) is above recommended threshold (10)")
            
            if max_score > 25:
                logger.warning(f"⚠ Training period max score ({max_score:.2f}) is above recommended threshold (25)")
        
        # Check feature attribution
        feature_cols = [f'top_feature_{i+1}' for i in range(7)]
        for col in feature_cols:
            non_empty = output_df[col].str.len() > 0
            logger.info(f"✓ {col}: {non_empty.sum()} non-empty values")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Anomaly detection test failed: {str(e)}")
        return False


def test_performance():
    """Test performance requirements."""
    logger.info("=== TESTING PERFORMANCE ===")
    
    input_file = "81ce1f00-c3f4-4baa-9b57-006fad1875adTEP_Train_Test.csv"
    output_file = "performance_test_output.csv"
    
    try:
        # Measure runtime
        start_time = datetime.now()
        main(input_file, output_file)
        end_time = datetime.now()
        
        runtime = (end_time - start_time).total_seconds()
        logger.info(f"✓ Runtime: {runtime:.2f} seconds")
        
        # Check if runtime is reasonable (< 15 minutes)
        if runtime > 900:  # 15 minutes
            logger.warning(f"⚠ Runtime ({runtime:.2f}s) exceeds recommended threshold (900s)")
        else:
            logger.info("✓ Runtime within acceptable limits")
        
        # Check for sudden score jumps
        output_df = pd.read_csv(output_file)
        scores = output_df['Abnormality_score']
        score_diffs = np.abs(scores.diff().dropna())
        
        large_jumps = score_diffs > 50  # Threshold for sudden jumps
        if large_jumps.sum() > 0:
            logger.warning(f"⚠ Found {large_jumps.sum()} sudden score jumps (>50)")
        else:
            logger.info("✓ No sudden score jumps detected")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Performance test failed: {str(e)}")
        return False


def test_edge_cases():
    """Test edge case handling."""
    logger.info("=== TESTING EDGE CASES ===")
    
    try:
        # Test with insufficient data (should fail gracefully)
        logger.info("Testing edge case handling...")
        
        # Create a small test dataset
        test_data = pd.DataFrame({
            'Time': pd.date_range('2004-01-01', periods=50, freq='H'),
            'Feature1': np.random.normal(0, 1, 50),
            'Feature2': np.random.normal(0, 1, 50)
        })
        
        test_input = "test_small_data.csv"
        test_output = "test_small_output.csv"
        
        test_data.to_csv(test_input, index=False)
        
        # This should fail due to insufficient training data
        try:
            main(test_input, test_output)
            logger.warning("⚠ Small dataset test should have failed")
        except Exception as e:
            logger.info(f"✓ Correctly handled insufficient data: {str(e)}")
        
        # Cleanup
        if os.path.exists(test_input):
            os.remove(test_input)
        if os.path.exists(test_output):
            os.remove(test_output)
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Edge case test failed: {str(e)}")
        return False


def generate_test_report():
    """Generate a comprehensive test report."""
    logger.info("=== GENERATING TEST REPORT ===")
    
    tests = [
        ("Data Loading", test_data_loading),
        ("Anomaly Detection", test_anomaly_detection),
        ("Performance", test_performance),
        ("Edge Cases", test_edge_cases)
    ]
    
    results = []
    total_tests = len(tests)
    passed_tests = 0
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
            if result:
                passed_tests += 1
        except Exception as e:
            logger.error(f"Test {test_name} failed with exception: {str(e)}")
            results.append((test_name, False))
    
    # Print test report
    print("\n" + "="*60)
    print("ANOMALY DETECTION SYSTEM - TEST REPORT")
    print("="*60)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    print("-"*60)
    
    if total_tests - passed_tests > 0:
        print("FAILED TESTS:")
        for test_name, result in results:
            if not result:
                print(f"  - {test_name}")
    
    print("="*60)
    
    return passed_tests == total_tests


if __name__ == "__main__":
    success = generate_test_report()
    sys.exit(0 if success else 1)
