"""
Flask Backend API for Anomaly Detection System

This module provides REST API endpoints for the frontend to interact with
the anomaly detection system.
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import tempfile
import pandas as pd
import numpy as np
from datetime import datetime
import traceback
import logging
from werkzeug.utils import secure_filename
import math

# Import our anomaly detection system
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from anomaly_detector import AnomalyDetectionSystem

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv', 'xls', 'xlsx'}
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def process_analysis_result(data, processing_time):
    """Process analysis results into the format expected by frontend."""
    # Calculate summary statistics
    scores = data['Abnormality_score']
    
    # Score distribution
    score_distribution = {
        'normal': len(scores[scores <= 10]),
        'slight': len(scores[(scores > 10) & (scores <= 30)]),
        'moderate': len(scores[(scores > 30) & (scores <= 60)]),
        'significant': len(scores[(scores > 60) & (scores <= 90)]),
        'severe': len(scores[scores > 90])
    }
    
    # Training period statistics
    data['Time'] = pd.to_datetime(data['Time'])
    training_mask = (data['Time'] >= pd.Timestamp('2004-01-01 00:00:00')) & \
                   (data['Time'] <= pd.Timestamp('2004-01-05 23:59:59'))
    training_scores = data.loc[training_mask, 'Abnormality_score']
    
    training_period_stats = {
        'mean': training_scores.mean() if len(training_scores) > 0 else 0,
        'max': training_scores.max() if len(training_scores) > 0 else 0
    }
    
    # Top contributing features
    feature_cols = [f'top_feature_{i+1}' for i in range(7)]
    feature_counts = {}
    for col in feature_cols:
        for feature in data[col]:
            if feature and feature != "":
                feature_counts[feature] = feature_counts.get(feature, 0) + 1
    
    top_features = [
        {'feature': feature, 'count': count}
        for feature, count in sorted(feature_counts.items(), key=lambda x: x[1], reverse=True)
    ]
    
    return {
        'data': data.to_dict('records'),
        'summary': {
            'totalRows': len(data),
            'scoreRange': {
                'min': float(scores.min()),
                'max': float(scores.max())
            },
            'scoreDistribution': score_distribution,
            'trainingPeriodStats': training_period_stats,
            'topFeatures': top_features
        },
        'processingTime': processing_time
    }

def sanitize_json(data):
    """
    Recursively replace NaN, Infinity, -Infinity with None
    so JSON is valid.
    """
    if isinstance(data, dict):
        return {k: sanitize_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_json(v) for v in data]
    elif isinstance(data, float):
        if math.isnan(data) or math.isinf(data):
            return None
        else:
            return data
    else:
        return data

@app.route('/api/info', methods=['GET'])
def get_system_info():
    """Get system information."""
    return jsonify({
        'version': '1.0.0',
        'status': 'online',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload a CSV file for analysis."""
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No file provided'
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'message': 'Invalid file type. Please upload a CSV, XLS, or XLSX file.'
            }), 400
        
        # Save file
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        logger.info(f"File uploaded: {filename}")
        
        return jsonify({
            'success': True,
            'message': 'File uploaded successfully',
            'filename': filename
        })
        
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Upload failed: {str(e)}'
        }), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_data():
    """Analyze uploaded data for anomalies."""
    try:
        data = request.get_json()
        filename = data.get('filename')
        contamination = data.get('contamination', 0.1)
        random_state = data.get('randomState', 42)
        
        if not filename:
            return jsonify({
                'success': False,
                'message': 'Filename is required'
            }), 400
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(filepath):
            return jsonify({
                'success': False,
                'message': 'File not found'
            }), 404
        
        # Run analysis
        start_time = datetime.now()
        
        system = AnomalyDetectionSystem(
            contamination=contamination,
            random_state=random_state
        )
        
        output_filename = f"results_{filename}"
        output_filepath = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
        
        system.process_data(filepath, output_filepath)
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        # Load results and process for frontend
        results_data = pd.read_csv(output_filepath)
        processed_results = process_analysis_result(results_data, processing_time)
        processed_results = sanitize_json(processed_results)

        
        logger.info(f"Analysis completed: {filename} in {processing_time:.2f}s")
        
        return jsonify(processed_results)
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': f'Analysis failed: {str(e)}'
        }), 500

@app.route('/api/upload-and-analyze', methods=['POST'])
def upload_and_analyze():
    """Upload a CSV file and analyze it for anomalies in a single request."""
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No file provided'
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'message': 'Invalid file type. Please upload a CSV, XLS, or XLSX file.'
            }), 400
        
        # Get analysis parameters from form data
        contamination = float(request.form.get('contamination', 0.1))
        random_state = int(request.form.get('randomState', 42))
        
        # Save file
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        logger.info(f"File uploaded and starting analysis: {filename}")
        
        # Run analysis
        start_time = datetime.now()
        
        system = AnomalyDetectionSystem(
            contamination=contamination,
            random_state=random_state
        )
        
        output_filename = f"results_{filename}"
        output_filepath = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
        
        system.process_data(filepath, output_filepath)
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        # Load results and process for frontend
        results_data = pd.read_csv(output_filepath)
        processed_results = process_analysis_result(results_data, processing_time)
        processed_results = sanitize_json(processed_results)
        
        logger.info(f"Upload and analysis completed: {filename} in {processing_time:.2f}s")
        
        return jsonify(processed_results)
        
    except Exception as e:
        logger.error(f"Upload and analysis error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': f'Upload and analysis failed: {str(e)}'
        }), 500

@app.route('/api/upload-and-analyze-summary', methods=['POST'])
def upload_and_analyze_summary():
    """Upload a CSV file and analyze it for anomalies, returning only summary statistics."""
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No file provided'
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'message': 'Invalid file type. Please upload a CSV, XLS, or XLSX file.'
            }), 400
        
        # Get analysis parameters from form data
        contamination = float(request.form.get('contamination', 0.1))
        random_state = int(request.form.get('randomState', 42))
        
        # Save file
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        logger.info(f"File uploaded and starting analysis (summary): {filename}")
        
        # Run analysis
        start_time = datetime.now()
        
        system = AnomalyDetectionSystem(
            contamination=contamination,
            random_state=random_state
        )
        
        output_filename = f"results_{filename}"
        output_filepath = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
        
        system.process_data(filepath, output_filepath)
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        # Load results and process for frontend (summary only)
        results_data = pd.read_csv(output_filepath)
        processed_results = process_analysis_result(results_data, processing_time)
        processed_results = sanitize_json(processed_results)
        
        # Return only summary data (much smaller response)
        summary_response = {
            'success': True,
            'filename': filename,
            'processingTime': processed_results['processingTime'],
            'summary': processed_results['summary'],
            'message': 'Analysis completed successfully. Use /api/download/{filename} to get full results.'
        }
        
        logger.info(f"Upload and analysis (summary) completed: {filename} in {processing_time:.2f}s")
        
        return jsonify(summary_response)
        
    except Exception as e:
        logger.error(f"Upload and analysis (summary) error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': f'Upload and analysis failed: {str(e)}'
        }), 500

@app.route('/api/download/<filename>', methods=['GET'])
def download_results(filename):
    """Download analysis results."""
    try:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(filepath):
            return jsonify({
                'success': False,
                'message': 'File not found'
            }), 404
        
        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype='text/csv'
        )
        
    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Download failed: {str(e)}'
        }), 500

@app.route('/api/status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get job status (placeholder for future async processing)."""
    return jsonify({
        'status': 'completed',
        'progress': 100
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error."""
    return jsonify({
        'success': False,
        'message': 'File too large. Maximum size is 50MB.'
    }), 413

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors."""
    return jsonify({
        'success': False,
        'message': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(e):
    """Handle internal server errors."""
    return jsonify({
        'success': False,
        'message': 'Internal server error'
    }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
