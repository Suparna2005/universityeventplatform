from transformers import pipeline
import os

# Initialize the pipeline globally so it stays in memory after the first load
# This will download the model to the local machine on the very first run
print("Loading Hugging Face Deep Learning NLP Model... (This may take a moment)")
sentiment_pipeline = pipeline(
    "sentiment-analysis", 
    model="distilbert-base-uncased-finetuned-sst-2-english"
)
print("NLP Model Loaded Successfully!")

def analyze_sentiment(text: str) -> str:
    """
    A Deep Learning Neural Network sentiment analyzer.
    Uses Hugging Face Transformers (DistilBERT) to analyze complex sentence structures.
    """
    if not text:
        return "Neutral"
        
    try:
        # The neural network returns a list with a dict, e.g., [{'label': 'POSITIVE', 'score': 0.99}]
        result = sentiment_pipeline(text)
        label = result[0]['label']
        
        # Convert model's UPPERCASE labels to our system's Title Case labels
        if label == "POSITIVE":
            return "Positive"
        elif label == "NEGATIVE":
            return "Negative"
        else:
            return "Neutral"
    except Exception as e:
        print(f"Deep Learning Error: {e}")
        return "Neutral"
