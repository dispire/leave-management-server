"""
Review Analyzer Module
Calculates portal breakdown, average ratings, rating distributions, and keyword/sentiment analytics.
"""
import re
from collections import Counter
from typing import List, Dict, Any


class ReviewAnalyzer:
    STOPWORDS = {
        "그리고", "하지만", "너무", "진짜", "정말", "매우", "아주", "조금", "약간", "그냥",
        "방문", "이용", "있는", "있어서", "같아요", "좋아요", "있습니다", "했습니다",
        "스타벅스", "카페", "곳", "때", "거", "것", "등", "더", "잘", "다", "또", "개",
        "점", "전", "사진", "리뷰", "더보기", "입니다", "합니다", "에서", "으로", "로"
    }

    POSITIVE_WORDS = [
        "맛있", "친절", "쾌적", "추천", "최고", "만족", "깔끔", "편안", "조용", "넓",
        "정갈", "신선", "가성비", "재방문", "훌륭", "착하", "따뜻", "아늑", "예쁘", "신속"
    ]

    NEGATIVE_WORDS = [
        "불친절", "별로", "실망", "느리", "비싸", "좁", "시끄럽", "소음", "비위생", "최악",
        "아쉽", "냄새", "차갑", "웨이팅", "복잡", "지저분", "기다림", "환불", "불쾌"
    ]

    @classmethod
    def analyze(cls, reviews: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyzes a collection of review dicts."""
        total_count = len(reviews)
        if total_count == 0:
            return {
                "total_count": 0,
                "portal_breakdown": {},
                "average_ratings": {},
                "overall_average": 0.0,
                "rating_distribution": {5: 0, 4: 0, 3: 0, 2: 0, 1: 0, "none": 0},
                "top_keywords": [],
                "sentiment": {"positive_count": 0, "negative_count": 0, "sentiment_ratio": 50.0}
            }

        portal_counts: Dict[str, int] = {}
        portal_ratings: Dict[str, List[float]] = {}
        all_ratings: List[float] = []
        rating_dist = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0, "none": 0}

        all_text = []

        for r in reviews:
            portal = r.get("portal", "Unknown")
            portal_counts[portal] = portal_counts.get(portal, 0) + 1

            rating = r.get("rating")
            if rating is not None and isinstance(rating, (int, float)):
                all_ratings.append(float(rating))
                portal_ratings.setdefault(portal, []).append(float(rating))
                rounded = round(float(rating))
                if rounded in rating_dist:
                    rating_dist[rounded] += 1
                elif rounded > 5:
                    rating_dist[5] += 1
                elif rounded < 1:
                    rating_dist[1] += 1
            else:
                rating_dist["none"] += 1

            content = r.get("content", "")
            tags = r.get("tags", "")
            if content:
                all_text.append(content)
            if tags:
                all_text.append(tags)

        # Averages
        avg_by_portal = {}
        for p, ratings in portal_ratings.items():
            avg_by_portal[p] = round(sum(ratings) / len(ratings), 2) if ratings else 0.0

        overall_avg = round(sum(all_ratings) / len(all_ratings), 2) if all_ratings else 0.0

        # Keyword frequency
        combined_text = " ".join(all_text)
        words = re.findall(r"[가-힣a-zA-Z]{2,}", combined_text)
        filtered_words = [w for w in words if w not in cls.STOPWORDS and len(w) >= 2]
        word_counts = Counter(filtered_words)
        top_keywords = [{"word": word, "count": count} for word, count in word_counts.most_common(15)]

        # Sentiment counting
        pos_count = sum(1 for w in words if any(pos in w for pos in cls.POSITIVE_WORDS))
        neg_count = sum(1 for w in words if any(neg in w for neg in cls.NEGATIVE_WORDS))
        total_sentiment = pos_count + neg_count
        ratio = round((pos_count / total_sentiment * 100), 1) if total_sentiment > 0 else 50.0

        return {
            "total_count": total_count,
            "portal_breakdown": portal_counts,
            "average_ratings": avg_by_portal,
            "overall_average": overall_avg,
            "rating_distribution": rating_dist,
            "top_keywords": top_keywords,
            "sentiment": {
                "positive_count": pos_count,
                "negative_count": neg_count,
                "sentiment_ratio": ratio
            }
        }
