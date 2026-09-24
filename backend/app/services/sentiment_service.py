sentiment_pipeline = None
sentiment_pipeline_attempted = False

def get_sentiment_pipeline():
    global sentiment_pipeline, sentiment_pipeline_attempted
    if sentiment_pipeline_attempted:
        return sentiment_pipeline

    sentiment_pipeline_attempted = True
    try:
        from transformers import pipeline
        sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english",
            local_files_only=True,
        )
    except Exception as exc:
        print(f"Sentiment model unavailable; using Neutral fallback: {exc}")
    return sentiment_pipeline

def analyze_sentiment(text: str) -> str:
    """
    A Deep Learning Neural Network sentiment analyzer.
    Uses Hugging Face Transformers (DistilBERT) to analyze complex sentence structures.
    """
    if not text:
        return "Neutral"
        
    try:
        analyzer = get_sentiment_pipeline()
        if analyzer is None:
            return "Neutral"
        # The neural network returns a list with a dict, e.g., [{'label': 'POSITIVE', 'score': 0.99}]
        result = analyzer(text)
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
