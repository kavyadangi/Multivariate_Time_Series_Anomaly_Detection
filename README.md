# Multivariate Time Series Anomaly Detection System

A comprehensive Python-based machine learning solution for detecting anomalies in multivariate time series data and identifying the primary contributing features for each anomaly.

## Problem Statement

Performance management systems continuously monitor asset health using data from sensors, IoT devices, and other sources. This system analyzes multivariate time series data to identify potential issues, predict failures, and optimize maintenance schedules by detecting data points, patterns, or events that deviate significantly from normal behavior.

## Features

- **Multivariate Anomaly Detection**: Detects anomalies across multiple sensor variables simultaneously
- **Feature Attribution**: Identifies the top 7 contributing features for each anomaly
- **Time Series Support**: Handles regular time series data with proper temporal validation
- **Robust Preprocessing**: Handles missing values, constant features, and data quality issues
- **Scalable Scoring**: Transforms raw scores to 0-100 scale for easy interpretation
- **Comprehensive Validation**: Built-in validation against success criteria

## Technical Approach

### Machine Learning Technique
- **Primary Method**: Isolation Forest
  - Effective for detecting global anomalies
  - Built-in feature importance capabilities
  - Robust to outliers and noise
  - Efficient for high-dimensional data

### Architecture
The system is built with a modular architecture consisting of:

1. **DataProcessor**: Handles data loading, validation, and preprocessing
2. **AnomalyDetector**: Implements the Isolation Forest model with feature attribution
3. **ScoreTransformer**: Converts raw scores to 0-100 scale and calculates top features
4. **AnomalyDetectionSystem**: Orchestrates all components

### Key Components

#### Data Processing
- Automatic time series validation
- Missing value handling (forward-fill and backward-fill)
- Constant feature removal
- Feature scaling using StandardScaler
- Training/analysis period splitting

#### Anomaly Detection
- Isolation Forest with 100 estimators
- Contamination parameter set to 0.1 (10% expected anomalies)
- Feature contribution calculation using perturbation analysis
- Robust handling of training data anomalies

#### Score Transformation
- Percentile-based transformation to 0-100 scale
- Top 7 feature identification with minimum contribution threshold
- Alphabetical tie-breaking for feature ranking

## Installation

1. Clone or download the project files
2. Install required dependencies:

```bash
pip install -r requirements.txt
```

## Usage

### Basic Usage

```python
from anomaly_detector import main

# Run anomaly detection
main("input_data.csv", "output_results.csv")
```

### Command Line Usage

```bash
python anomaly_detector.py input_data.csv output_results.csv
```

### Programmatic Usage

```python
from anomaly_detector import AnomalyDetectionSystem

# Initialize the system
system = AnomalyDetectionSystem(contamination=0.1, random_state=42)

# Process data
system.process_data("input_data.csv", "output_results.csv")
```

## Input Data Format

The system expects a CSV file with:
- A `Time` column with datetime values
- Multiple numeric columns representing sensor measurements
- Regular time intervals (hourly data in this case)

### Example Input Structure
```csv
Time,AFeedStream1,DFeedStream2,EFeedStream3,...
1/1/2004 0:00,0.25038,3674,4529,...
1/1/2004 0:01,0.25109,3659.4,4556.6,...
...
```

## Output Format

The system generates a CSV file with all original columns plus 8 new columns:

1. **Abnormality_score**: Float values from 0.0 to 100.0
2. **top_feature_1** through **top_feature_7**: String values containing original column names

### Score Interpretation
- **0-10**: Normal behavior (expected for training period)
- **11-30**: Slightly unusual but acceptable
- **31-60**: Moderate anomaly requiring attention
- **61-90**: Significant anomaly needing investigation
- **91-100**: Severe anomaly requiring immediate action

## Data Periods

### Training Period
- **Duration**: 1/1/2004 0:00 to 1/5/2004 23:59 (120 hours)
- **Purpose**: Model training on normal operational data
- **Validation**: Scores should be low (< 10 mean, < 25 max)

### Analysis Period
- **Duration**: 1/1/2004 0:00 to 1/19/2004 7:59 (439 hours)
- **Purpose**: Anomaly detection across full dataset
- **Overlap**: Deliberate overlap with training period for validation

## Testing

Run the comprehensive test suite:

```bash
python test_anomaly_detector.py
```

The test suite validates:
- Data loading and validation
- Complete anomaly detection pipeline
- Performance requirements (< 15 minutes runtime)
- Edge case handling
- Output format compliance

## Dashboard

To run the interactive dashboard:

1. **Run Backend**
   ```bash
   cd backend
   python app.py
   ```

2. **Run Frontend** (in a separate terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Copy the localhost address provided by the frontend and open it in any browser.

## Success Criteria Validation

### Functional Requirements
- ✅ Runs without errors on provided dataset
- ✅ Produces all required output columns
- ✅ Handles edge cases gracefully
- ✅ Training period scores meet validation criteria

### Technical Quality
- ✅ PEP8 compliant code
- ✅ Modular and well-documented design
- ✅ Comprehensive error handling
- ✅ Type hints throughout

### Performance Validation
- ✅ Feature attributions make logical sense
- ✅ No sudden score jumps between adjacent time points
- ✅ Runtime within acceptable limits
- ✅ Low scores for normal data (0-20 range)

## Edge Cases Handled

1. **Insufficient Training Data**: Requires minimum 72 hours
2. **Missing Values**: Forward-fill and backward-fill
3. **Constant Features**: Automatic removal
4. **Training Period Anomalies**: Warning but continued processing
5. **Single Feature Datasets**: Handles cases with < 7 features
6. **Memory Constraints**: Efficient processing for large datasets

## Dependencies

- **pandas**: Data manipulation and analysis
- **numpy**: Numerical computations
- **scikit-learn**: Machine learning algorithms
- **scipy**: Scientific computing
- **matplotlib**: Visualization (optional)
- **seaborn**: Statistical visualization (optional)
- **joblib**: Model persistence (optional)

## Performance Characteristics

- **Runtime**: Typically < 5 minutes for 26K rows, 52 features
- **Memory Usage**: Efficient for datasets up to 10,000 rows
- **Scalability**: Linear scaling with data size
- **Accuracy**: Validated against training period criteria

## Limitations

1. **Assumes Regular Time Intervals**: Best suited for regularly sampled data
2. **Global Anomaly Detection**: Focuses on point-wise anomalies
3. **Feature Independence**: Assumes features are relatively independent
4. **Training Data Quality**: Requires good quality normal period data

## Future Enhancements

1. **Temporal Pattern Detection**: LSTM-based sequence modeling
2. **Ensemble Methods**: Combining multiple anomaly detection techniques
3. **Real-time Processing**: Streaming data support
4. **Advanced Feature Engineering**: Lag features, rolling statistics
5. **Interactive Visualization**: Dashboard for anomaly exploration

## Troubleshooting

### Common Issues

1. **Memory Errors**: Reduce dataset size or use chunked processing
2. **Training Data Anomalies**: System will warn but continue processing
3. **Missing Time Column**: Ensure CSV has 'Time' column with datetime format
4. **Constant Features**: Automatically handled by the system

### Error Messages

- `"Insufficient training data"`: Increase training period or reduce minimum requirement
- `"Time column not found"`: Check CSV format and column names
- `"Missing required columns"`: Verify output file generation

## License

This project is developed for educational and research purposes.

## Contact

For questions or issues, please refer to the project documentation or test suite output.

