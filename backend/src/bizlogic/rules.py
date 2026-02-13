from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class CustomerTier(str, Enum):
    standard = "standard"
    gold = "gold"
    platinum = "platinum"


@dataclass(frozen=True)
class DiscountResult:
    subtotal: float
    discount: float
    total: float
    reason: str


def calculate_discount(order_total: float, tier: CustomerTier) -> DiscountResult:
    """Calculate a discount given an order total and customer tier.

    - standard: no base discount
    - gold: 5% base
    - platinum: 10% base
    - extra 5% if order_total >= 500
    - discounts are capped at 25% of subtotal
    """

    if order_total < 0:
        raise ValueError("order_total must be non-negative")

    base_rate = 0.0
    if tier == CustomerTier.gold:
        base_rate = 0.05
    elif tier == CustomerTier.platinum:
        base_rate = 0.10

    extra_rate = 0.05 if order_total >= 500 else 0.0
    rate = min(base_rate + extra_rate, 0.25)

    discount = round(order_total * rate, 2)
    total = round(order_total - discount, 2)
    reason = f"{int(rate*100)}% discount for {tier} tier"
    if extra_rate:
        reason += " + high-value bonus"

    return DiscountResult(subtotal=order_total, discount=discount, total=total, reason=reason)

