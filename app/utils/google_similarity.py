import requests
from typing import Optional, List, Dict, Tuple
import re
from difflib import SequenceMatcher

def clean_text(text: str) -> str:
    """Remove extra whitespace and normalize text"""
    text = re.sub(r'\s+', ' ', text)
    return text.strip().lower()

def calculate_text_similarity(text1: str, text2: str) -> float:
    """Calculate similarity between two texts using SequenceMatcher"""
    text1_clean = clean_text(text1)
    text2_clean = clean_text(text2)
    
    similarity = SequenceMatcher(None, text1_clean, text2_clean).ratio()
    return round(similarity * 100, 2)

def find_matching_segments(original_text: str, source_text: str, min_words: int = 3) -> List[str]:
    """
    Find matching text segments between original and source
    Returns list of matching phrases
    """
    # Split into words
    original_words = original_text.lower().split()
    source_words = source_text.lower().split()
    
    matches = []
    
    # Find consecutive matching word sequences
    for i in range(len(original_words)):
        for j in range(len(source_words)):
            match_length = 0
            
            # Count consecutive matches
            while (i + match_length < len(original_words) and 
                   j + match_length < len(source_words) and
                   original_words[i + match_length] == source_words[j + match_length]):
                match_length += 1
            
            # If we found a match of minimum length
            if match_length >= min_words:
                # Extract the matching phrase from original text (preserve case)
                start_pos = sum(len(w) + 1 for w in original_words[:i])
                end_pos = sum(len(w) + 1 for w in original_words[:i + match_length])
                matched_phrase = original_text[start_pos:end_pos].strip()
                
                # Avoid duplicates
                if matched_phrase.lower() not in [m.lower() for m in matches]:
                    matches.append(matched_phrase)
    
    return matches

def highlight_matching_text(text: str, matches: List[str]) -> str:
    """
    Highlight matching segments in the text
    Returns HTML with highlighted portions
    """
    if not matches:
        return text
    
    highlighted = text
    
    # Sort matches by length (longest first) to avoid partial replacements
    sorted_matches = sorted(set(matches), key=len, reverse=True)
    
    # Track replaced positions to avoid double-highlighting
    replaced_positions = []
    
    for match in sorted_matches:
        if not match or len(match.strip()) < 3:
            continue
            
        # Find all occurrences of this match (case-insensitive)
        pattern = re.compile(re.escape(match), re.IGNORECASE)
        
        # Find first occurrence that hasn't been replaced
        for m in pattern.finditer(text):
            start, end = m.span()
            
            # Check if this position overlaps with already replaced text
            overlap = any(start < r_end and end > r_start for r_start, r_end in replaced_positions)
            
            if not overlap:
                # Get the actual text (preserving case)
                actual_text = text[start:end]
                
                # Replace in highlighted version
                highlighted = highlighted.replace(
                    actual_text,
                    f'<mark class="google-match">{actual_text}</mark>',
                    1  # Only replace first occurrence
                )
                
                replaced_positions.append((start, end))
                break  # Only highlight first occurrence of each match
    
    return highlighted

def check_google_similarity(text: str, api_key: Optional[str] = None, 
                           search_engine_id: Optional[str] = None) -> Optional[Dict]:
    """
    Check if text appears on Google search results
    Returns dictionary with similarity data, sources, and matching segments
    """
    if not api_key or not search_engine_id:
        print("Google API not configured")
        return None
    
    try:
        # Take first 100 characters for search query
        query = clean_text(text)[:100]
        
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": api_key,
            "cx": search_engine_id,
            "q": query,
            "num": 10  # Get top 10 results
        }
        
        print(f"Searching Google with query: {query[:50]}...")
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code != 200:
            print(f"Google API error: {response.status_code}")
            return None
        
        data = response.json()
        items = data.get("items", [])
        
        print(f"Google returned {len(items)} results")
        
        if not items:
            return {
                "similarity_percentage": 0.0,
                "sources": [],
                "total_sources": 0,
                "all_matches": [],
                "highlighted_text": text
            }
        
        # Calculate similarity with search result snippets and collect sources
        sources = []
        all_matching_segments = []
        max_similarity = 0.0
        
        for item in items:
            snippet = item.get("snippet", "")
            title = item.get("title", "Unknown")
            link = item.get("link", "")
            
            # Calculate similarity
            similarity = calculate_text_similarity(text, snippet)
            
            # Find matching text segments
            matching_segments = find_matching_segments(text, snippet, min_words=3)
            
            print(f"Source: {title[:50]}... - Similarity: {similarity}%, Matches: {len(matching_segments)}")
            
            if similarity > 0 or matching_segments:
                sources.append({
                    "title": title,
                    "url": link,
                    "snippet": snippet,
                    "similarity": round(similarity, 2),
                    "matching_segments": matching_segments
                })
                
                # Collect all unique matching segments
                for segment in matching_segments:
                    if segment.lower() not in [m.lower() for m in all_matching_segments]:
                        all_matching_segments.append(segment)
                
                max_similarity = max(max_similarity, similarity)
        
        # Sort sources by similarity (highest first)
        sources.sort(key=lambda x: x["similarity"], reverse=True)
        
        # Take top 5 sources
        top_sources = sources[:5]
        
        # Create highlighted version of original text
        print(f"Highlighting {len(all_matching_segments)} matching segments in text")
        highlighted_text = highlight_matching_text(text, all_matching_segments)
        
        return {
            "similarity_percentage": round(max_similarity, 2),
            "sources": top_sources,
            "total_sources": len(sources),
            "all_matches": all_matching_segments,
            "highlighted_text": highlighted_text
        }
    
    except Exception as e:
        print(f"Google similarity check error: {e}")
        return None