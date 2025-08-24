"""
Multivariate Time Series Anomaly Detection System

This module provides a comprehensive solution for detecting anomalies in multivariate
time series data using Isolation Forest and feature attribution analysis.

Author: Anomaly Detection System
Date: 2024
"""

import pandas as pd
import numpy as np
from typing import List, Tuple, Dict, Optional, Union
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.metrics import pairwise_distances
import warnings
import logging
from datetime import datetime, timedelta
import joblib

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Suppress warnings
warnings.filterwarnings('ignore')


class DataProcessor:
    """
    Handles data preprocessing, validation, and splitting for anomaly detection.
    """
    
    def __init__(self, min_training_hours: int = 72):
        """
        Initialize the data processor.
        
        Args:
            min_training_hours: Minimum hours of training data required
        """
        self.min_training_hours = min_training_hours
        self.scaler = StandardScaler()
        self.feature_names: List[str] = []
        
    def load_and_validate_data(self, csv_path: str) -> pd.DataFrame:
        """
        Load and validate the CSV data.
        
        Args:
            csv_path: Path to the CSV file
            
        Returns:
            Processed DataFrame with validated data
        """
        logger.info(f"Loading data from {csv_path}")
        
        try:
            # Load data
            df = pd.read_csv(csv_path)
            
            # Validate required columns
            if 'Time' not in df.columns:
                raise ValueError("CSV must contain a 'Time' column")
            
            # Convert Time column to datetime
            df['Time'] = pd.to_datetime(df['Time'])
            
            # Sort by time
            df = df.sort_values('Time').reset_index(drop=True)
            
            # Validate time intervals (should be regular)
            time_diffs = df['Time'].diff().dropna()
            if len(time_diffs.unique()) > 2:  # Allow for slight variations
                logger.warning("Time intervals are not perfectly regular")
            
            # Handle missing values
            numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()
            for col in numeric_columns:
                if df[col].isnull().sum() > 0:
                    logger.info(f"Filling missing values in {col}")
                    df[col] = df[col].fillna(method='ffill').fillna(method='bfill')
            
            # Remove constant features
            constant_features = []
            for col in numeric_columns:
                if df[col].std() == 0:
                    constant_features.append(col)
                    logger.warning(f"Removing constant feature: {col}")
            
            if constant_features:
                df = df.drop(columns=constant_features)
            
            # Store feature names (excluding Time)
            self.feature_names = [col for col in df.columns if col != 'Time']
            
            logger.info(f"Data loaded successfully: {len(df)} rows, {len(self.feature_names)} features")
            return df
            
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}")
            raise
    
    def split_data(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Split data into training (normal) and analysis periods.
        
        Args:
            df: Input DataFrame with Time column
            
        Returns:
            Tuple of (training_data, analysis_data)
        """
        logger.info("Splitting data into training and analysis periods")
        
        # Define training period: 1/1/2004 0:00 to 1/5/2004 23:59 (120 hours)
        train_start = pd.Timestamp('2004-01-01 00:00:00')
        train_end = pd.Timestamp('2004-01-05 23:59:59')
        
        # Define analysis period: 1/1/2004 0:00 to 1/19/2004 7:59 (439 hours)
        analysis_start = pd.Timestamp('2004-01-01 00:00:00')
        analysis_end = pd.Timestamp('2004-01-19 07:59:59')
        
        # Split data
        training_data = df[(df['Time'] >= train_start) & (df['Time'] <= train_end)].copy()
        analysis_data = df[(df['Time'] >= analysis_start) & (df['Time'] <= analysis_end)].copy()
        
        # Validate minimum training data
        training_hours = len(training_data)
        if training_hours < self.min_training_hours:
            raise ValueError(f"Insufficient training data: {training_hours} hours, minimum required: {self.min_training_hours}")
        
        logger.info(f"Training data: {len(training_data)} rows ({training_hours} hours)")
        logger.info(f"Analysis data: {len(analysis_data)} rows")
        
        return training_data, analysis_data
    
    def preprocess_features(self, df: pd.DataFrame, fit_scaler: bool = True) -> np.ndarray:
        """
        Preprocess features for model training/prediction.
        
        Args:
            df: Input DataFrame
            fit_scaler: Whether to fit the scaler (True for training, False for prediction)
            
        Returns:
            Preprocessed feature array
        """
        # Select numeric features
        features = df[self.feature_names].values
        
        # Handle infinite values
        features = np.nan_to_num(features, nan=0.0, posinf=0.0, neginf=0.0)
        
        # Scale features
        if fit_scaler:
            features = self.scaler.fit_transform(features)
        else:
            features = self.scaler.transform(features)
        
        return features


class AnomalyDetector:
    """
    Main anomaly detection model using Isolation Forest with feature attribution.
    """
    
    def __init__(self, contamination: float = 0.1, random_state: int = 42):
        """
        Initialize the anomaly detector.
        
        Args:
            contamination: Expected proportion of anomalies
            random_state: Random seed for reproducibility
        """
        self.contamination = contamination
        self.random_state = random_state
        self.model = IsolationForest(
            contamination=contamination,
            random_state=random_state,
            n_estimators=100,
            max_samples='auto'
        )
        self.is_fitted = False
        
    def train(self, training_features: np.ndarray) -> None:
        """
        Train the anomaly detection model on normal data.
        
        Args:
            training_features: Preprocessed training features
        """
        logger.info("Training anomaly detection model")
        
        # Check for anomalies in training data
        temp_model = IsolationForest(contamination=0.05, random_state=self.random_state)
        temp_scores = temp_model.fit_predict(training_features)
        anomaly_count = np.sum(temp_scores == -1)
        
        if anomaly_count > 0:
            logger.warning(f"Found {anomaly_count} potential anomalies in training data. Proceeding with training.")
        
        # Train the main model
        self.model.fit(training_features)
        self.is_fitted = True
        
        logger.info("Model training completed")
    
    def predict_anomaly_scores(self, features: np.ndarray) -> np.ndarray:
        """
        Predict anomaly scores for given features.
        
        Args:
            features: Preprocessed features
            
        Returns:
            Anomaly scores (lower values indicate more anomalous)
        """
        if not self.is_fitted:
            raise ValueError("Model must be trained before prediction")
        
        # Get decision function scores (lower = more anomalous)
        scores = self.model.decision_function(features)
        
        return scores
    
    def calculate_feature_contributions(self, features: np.ndarray, feature_names: List[str]) -> np.ndarray:
        """
        Calculate feature contributions to anomaly scores using perturbation analysis.
        
        Args:
            features: Preprocessed features
            feature_names: List of feature names
            
        Returns:
            Feature contribution matrix (n_samples x n_features)
        """
        if not self.is_fitted:
            raise ValueError("Model must be trained before feature attribution")
        
        n_samples, n_features = features.shape
        contributions = np.zeros((n_samples, n_features))
        
        # Calculate baseline scores
        baseline_scores = self.model.decision_function(features)
        
        # For each feature, calculate contribution by perturbation
        for i in range(n_features):
            # Create perturbed features (set feature to mean value)
            perturbed_features = features.copy()
            perturbed_features[:, i] = np.mean(features[:, i])
            
            # Calculate new scores
            perturbed_scores = self.model.decision_function(perturbed_features)
            
            # Contribution is the difference in scores
            contributions[:, i] = baseline_scores - perturbed_scores
        
        return contributions


class ScoreTransformer:
    """
    Transforms raw anomaly scores to 0-100 scale and calculates top contributing features.
    """
    
    def __init__(self):
        """Initialize the score transformer."""
        pass
    
    def transform_scores(self, scores: np.ndarray, analysis_period_only: bool = True) -> np.ndarray:
        """
        Transform raw scores to 0-100 scale using percentile ranking.
        
        Args:
            scores: Raw anomaly scores
            analysis_period_only: Whether to use only analysis period for percentile calculation
            
        Returns:
            Transformed scores (0-100 scale)
        """
        # For percentile calculation, use only analysis period if specified
        if analysis_period_only:
            # Use the full range for percentile calculation
            score_range = scores
        else:
            score_range = scores
        
        # Transform to 0-100 scale using percentile ranking
        # Lower raw scores (more anomalous) should become higher transformed scores
        transformed_scores = np.zeros_like(scores)
        
        # Calculate percentiles for each score
        for i, score in enumerate(scores):
            # Calculate what percentile this score represents
            # Lower raw scores should get higher transformed scores
            percentile_rank = np.sum(score_range <= score) / len(score_range) * 100
            transformed_scores[i] = 100 - percentile_rank
        
        # Ensure scores are within 0-100 range
        transformed_scores = np.clip(transformed_scores, 0, 100)
        
        return transformed_scores
    
    def get_top_features(self, contributions: np.ndarray, feature_names: List[str], 
                        min_contribution: float = 0.01) -> List[List[str]]:
        """
        Get top contributing features for each sample.
        
        Args:
            contributions: Feature contribution matrix
            feature_names: List of feature names
            min_contribution: Minimum contribution threshold (1% = 0.01)
            
        Returns:
            List of top feature lists for each sample
        """
        n_samples = contributions.shape[0]
        top_features_list = []
        
        for i in range(n_samples):
            # Get absolute contributions for this sample
            sample_contributions = np.abs(contributions[i, :])
            
            # Filter by minimum contribution
            significant_features = sample_contributions >= min_contribution
            
            if np.sum(significant_features) == 0:
                # If no features meet threshold, use top 7 by magnitude
                significant_features = np.ones_like(significant_features, dtype=bool)
            
            # Get feature indices and contributions
            feature_indices = np.where(significant_features)[0]
            feature_contributions = sample_contributions[significant_features]
            
            # Sort by contribution magnitude (descending)
            sorted_indices = np.argsort(feature_contributions)[::-1]
            sorted_feature_indices = feature_indices[sorted_indices]
            
            # Get top 7 features
            top_7_indices = sorted_feature_indices[:7]
            top_7_features = [feature_names[idx] for idx in top_7_indices]
            
            # Pad with empty strings if fewer than 7 features
            while len(top_7_features) < 7:
                top_7_features.append("")
            
            top_features_list.append(top_7_features)
        
        return top_features_list


class AnomalyDetectionSystem:
    """
    Complete anomaly detection system that orchestrates all components.
    """
    
    def __init__(self, contamination: float = 0.1, random_state: int = 42):
        """
        Initialize the anomaly detection system.
        
        Args:
            contamination: Expected proportion of anomalies
            random_state: Random seed for reproducibility
        """
        self.data_processor = DataProcessor()
        self.anomaly_detector = AnomalyDetector(contamination, random_state)
        self.score_transformer = ScoreTransformer()
        
    def process_data(self, input_csv_path: str, output_csv_path: str) -> None:
        """
        Main function to process data and generate anomaly detection results.
        
        Args:
            input_csv_path: Path to input CSV file
            output_csv_path: Path to output CSV file with results
        """
        logger.info("Starting anomaly detection process")
        
        try:
            # Step 1: Load and validate data
            df = self.data_processor.load_and_validate_data(input_csv_path)
            
            # Step 2: Split data into training and analysis periods
            training_data, analysis_data = self.data_processor.split_data(df)
            
            # Step 3: Preprocess features
            training_features = self.data_processor.preprocess_features(training_data, fit_scaler=True)
            analysis_features = self.data_processor.preprocess_features(analysis_data, fit_scaler=False)
            
            # Step 4: Train anomaly detection model
            self.anomaly_detector.train(training_features)
            
            # Step 5: Predict anomaly scores
            raw_scores = self.anomaly_detector.predict_anomaly_scores(analysis_features)
            
            # Step 6: Transform scores to 0-100 scale
            transformed_scores = self.score_transformer.transform_scores(raw_scores)
            
            # Step 7: Calculate feature contributions
            contributions = self.anomaly_detector.calculate_feature_contributions(
                analysis_features, self.data_processor.feature_names
            )
            
            # Step 8: Get top contributing features
            top_features = self.score_transformer.get_top_features(
                contributions, self.data_processor.feature_names
            )
            
            # Step 9: Create output DataFrame
            output_df = analysis_data.copy()
            output_df['Abnormality_score'] = transformed_scores
            
            # Add top feature columns
            for i in range(7):
                output_df[f'top_feature_{i+1}'] = [features[i] for features in top_features]
            
            # Step 10: Save results
            output_df.to_csv(output_csv_path, index=False)
            
            # Step 11: Validation and logging
            self._validate_results(output_df, training_data)
            
            logger.info(f"Anomaly detection completed. Results saved to {output_csv_path}")
            
        except Exception as e:
            logger.error(f"Error in anomaly detection process: {str(e)}")
            raise
    
    def _validate_results(self, output_df: pd.DataFrame, training_data: pd.DataFrame) -> None:
        """
        Validate the results according to success criteria.
        
        Args:
            output_df: Output DataFrame with results
            training_data: Training data for validation
        """
        logger.info("Validating results")
        
        # Check training period scores (should be low)
        training_mask = (output_df['Time'] >= pd.Timestamp('2004-01-01 00:00:00')) & \
                       (output_df['Time'] <= pd.Timestamp('2004-01-05 23:59:59'))
        
        training_scores = output_df.loc[training_mask, 'Abnormality_score']
        
        if len(training_scores) > 0:
            mean_training_score = training_scores.mean()
            max_training_score = training_scores.max()
            
            logger.info(f"Training period - Mean score: {mean_training_score:.2f}, Max score: {max_training_score:.2f}")
            
            if mean_training_score > 10:
                logger.warning(f"Training period mean score ({mean_training_score:.2f}) is above recommended threshold (10)")
            
            if max_training_score > 25:
                logger.warning(f"Training period max score ({max_training_score:.2f}) is above recommended threshold (25)")
        
        # Check score distribution
        all_scores = output_df['Abnormality_score']
        logger.info(f"Score distribution - Min: {all_scores.min():.2f}, Max: {all_scores.max():.2f}, Mean: {all_scores.mean():.2f}")
        
        # Check for required columns
        required_columns = ['Abnormality_score'] + [f'top_feature_{i+1}' for i in range(7)]
        missing_columns = [col for col in required_columns if col not in output_df.columns]
        
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")
        
        logger.info("Results validation completed")


def main(input_csv_path: str, output_csv_path: str) -> None:
    """
    Main function to run the anomaly detection system.
    
    Args:
        input_csv_path: Path to input CSV file
        output_csv_path: Path to output CSV file
    """
    try:
        # Initialize and run the system
        system = AnomalyDetectionSystem(contamination=0.1, random_state=42)
        system.process_data(input_csv_path, output_csv_path)
        
        print(f"Anomaly detection completed successfully!")
        print(f"Input: {input_csv_path}")
        print(f"Output: {output_csv_path}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        raise


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 3:
        print("Usage: python anomaly_detector.py <input_csv_path> <output_csv_path>")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    main(input_path, output_path)
