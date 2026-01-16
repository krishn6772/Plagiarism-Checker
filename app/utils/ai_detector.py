import re
from typing import Dict, List, Tuple
from difflib import SequenceMatcher

def calculate_perplexity_score(text: str) -> float:
    """
    Calculate a simple perplexity-like score
    AI text tends to have lower perplexity (more predictable)
    Human text tends to have higher perplexity (more varied)
    """
    words = text.lower().split()
    if len(words) < 10:
        return 50.0  # Not enough data
    
    # Calculate word diversity
    unique_words = len(set(words))
    total_words = len(words)
    diversity_ratio = unique_words / total_words
    
    # Calculate average word length
    avg_word_length = sum(len(word) for word in words) / len(words)
    
    # Calculate sentence complexity
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    avg_sentence_length = len(words) / max(len(sentences), 1)
    
    # Score calculation (0-100, higher = more likely human)
    score = 0
    
    # Diversity factor (30 points)
    score += min(diversity_ratio * 60, 30)
    
    # Word length factor (20 points)
    if 4 <= avg_word_length <= 6:
        score += 20
    elif 3 <= avg_word_length <= 7:
        score += 15
    else:
        score += 10
    
    # Sentence complexity (30 points)
    if 15 <= avg_sentence_length <= 25:
        score += 30
    elif 10 <= avg_sentence_length <= 30:
        score += 20
    else:
        score += 10
    
    # Burstiness (20 points) - variation in sentence lengths
    if len(sentences) > 1:
        sentence_lengths = [len(s.split()) for s in sentences]
        variance = sum((l - avg_sentence_length) ** 2 for l in sentence_lengths) / len(sentence_lengths)
        if variance > 20:
            score += 20
        elif variance > 10:
            score += 15
        else:
            score += 10
    
    return min(100, max(0, score))

def detect_ai_patterns(text: str) -> Dict[str, any]:
    """
    Detect common AI writing patterns
    """
    patterns_found = []
    
    # Common AI phrases
    ai_phrases = [
        "it's important to note",
        "it is important to note",
        "it's worth noting",
        "furthermore",
        "moreover",
        "in conclusion",
        "to summarize",
        "in summary",
        "delve into",
        "dive into",
        "realm of",
        "navigating the",
        "landscape of",
        "tapestry of",
        "intricate",
        "multifaceted",
        "holistic approach",
        "at the end of the day",
        "game changer",
        "revolutionize"
    ]
    
    text_lower = text.lower()
    
    for phrase in ai_phrases:
        if phrase in text_lower:
            # Find the sentence containing this phrase
            sentences = re.split(r'[.!?]+', text)
            for sentence in sentences:
                if phrase in sentence.lower():
                    patterns_found.append({
                        "phrase": phrase,
                        "context": sentence.strip()[:100] + "..." if len(sentence) > 100 else sentence.strip()
                    })
                    break
    
    return {
        "patterns_found": patterns_found,
        "pattern_count": len(patterns_found)
    }

def analyze_sentence_structure(text: str) -> Dict[str, float]:
    """
    Analyze sentence structure patterns
    AI tends to have more uniform sentence structures
    """
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if len(sentences) < 3:
        return {
            "uniformity_score": 50.0,
            "avg_length": 0,
            "variance": 0
        }
    
    # Calculate sentence lengths
    lengths = [len(s.split()) for s in sentences]
    avg_length = sum(lengths) / len(lengths)
    variance = sum((l - avg_length) ** 2 for l in lengths) / len(lengths)
    
    # Lower variance = more uniform = more likely AI
    uniformity_score = 100 - min(variance * 2, 100)
    
    return {
        "uniformity_score": uniformity_score,
        "avg_length": avg_length,
        "variance": variance
    }

def detect_ai_content(text: str) -> Dict[str, any]:
    """
    Main AI detection function
    Returns comprehensive AI detection results
    """
    if not text or len(text.strip()) < 50:
        return {
            "ai_probability": 0.0,
            "human_probability": 100.0,
            "confidence": "low",
            "analysis": {
                "perplexity_score": 0,
                "patterns_detected": 0,
                "uniformity_score": 0
            },
            "message": "Text too short for accurate analysis",
            "ai_indicators": [],
            "highlighted_text": text
        }
    
    # Run all detection methods
    perplexity_score = calculate_perplexity_score(text)
    patterns = detect_ai_patterns(text)
    structure = analyze_sentence_structure(text)
    
    # Calculate AI probability
    # Lower perplexity = more AI-like
    perplexity_factor = 100 - perplexity_score
    
    # More patterns = more AI-like
    pattern_factor = min(patterns["pattern_count"] * 10, 40)
    
    # Higher uniformity = more AI-like
    uniformity_factor = structure["uniformity_score"] * 0.4
    
    # Weighted average
    ai_probability = (
        perplexity_factor * 0.5 +
        pattern_factor * 0.3 +
        uniformity_factor * 0.2
    )
    
    ai_probability = min(100, max(0, ai_probability))
    human_probability = 100 - ai_probability
    
    # Determine confidence level
    if ai_probability > 75 or ai_probability < 25:
        confidence = "high"
    elif ai_probability > 60 or ai_probability < 40:
        confidence = "medium"
    else:
        confidence = "low"
    
    # Generate message
    if ai_probability >= 70:
        message = "High likelihood of AI-generated content"
    elif ai_probability >= 50:
        message = "Moderate indicators of AI-generated content"
    elif ai_probability >= 30:
        message = "Some AI patterns detected, likely human-written"
    else:
        message = "Appears to be human-written content"
    
    # Highlight AI patterns in text
    highlighted_text = text
    for pattern in patterns["patterns_found"]:
        phrase = pattern["phrase"]
        # Case-insensitive replacement with highlight
        pattern_regex = re.compile(re.escape(phrase), re.IGNORECASE)
        highlighted_text = pattern_regex.sub(
            f'<mark class="ai-pattern">{phrase}</mark>',
            highlighted_text,
            count=1
        )
    
    return {
        "ai_probability": round(ai_probability, 2),
        "human_probability": round(human_probability, 2),
        "confidence": confidence,
        "analysis": {
            "perplexity_score": round(perplexity_score, 2),
            "patterns_detected": patterns["pattern_count"],
            "uniformity_score": round(structure["uniformity_score"], 2),
            "avg_sentence_length": round(structure["avg_length"], 2)
        },
        "message": message,
        "ai_indicators": patterns["patterns_found"],
        "highlighted_text": highlighted_text
    }