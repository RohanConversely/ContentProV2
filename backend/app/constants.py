INDUSTRY_OPTIONS = [
    {"id": "fashion", "label": "Fashion & Apparel"},
    {"id": "electronics", "label": "Electronics & Tech"},
    {"id": "beauty", "label": "Beauty & Skincare"},
    {"id": "food", "label": "Food & Beverage"},
    {"id": "home", "label": "Home & Living"},
    {"id": "sports", "label": "Sports & Fitness"},
    {"id": "jewelry", "label": "Jewelry & Accessories"},
    {"id": "health", "label": "Health & Wellness"},
]

INDUSTRY_IDS = tuple(option["id"] for option in INDUSTRY_OPTIONS)
DEFAULT_INDUSTRY = "jewelry"
USER_ROLE = "user"
SUPERADMIN_ROLE = "superadmin"
