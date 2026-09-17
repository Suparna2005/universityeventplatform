def analyze_sentiment(text: str) -> str:
    """
    A lightweight, heuristic-based sentiment analyzer for V1.
    Analyzes feedback text and returns 'Positive', 'Negative', or 'Neutral'.
    """
    if not text:
        return "Neutral"
        
    text = text.lower()
    
    positive_words = ["great", "awesome", "excellent", "good", "amazing", "loved", "fun", "informative", "best", "perfect", "enjoyed"]
    negative_words = ["bad", "terrible", "awful", "boring", "waste", "poor", "disappointing", "worst", "unorganized", "hate"]
    
    pos_score = sum(1 for word in positive_words if word in text)
    neg_score = sum(1 for word in negative_words if word in text)
    
    if pos_score > neg_score:
        return "Positive"
    elif neg_score > pos_score:
        return "Negative"
    else:
        return "Neutral"
