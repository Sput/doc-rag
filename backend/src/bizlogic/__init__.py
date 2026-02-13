"""Business logic package.

Keep domain logic here with minimal dependencies.
"""

from .rules import calculate_discount, CustomerTier, DiscountResult

__all__ = [
    "calculate_discount",
    "CustomerTier",
    "DiscountResult",
]
