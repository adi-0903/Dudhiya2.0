from __future__ import annotations

from typing import Iterable


def round_str(value: float, digits: int = 3) -> str:
    return f"{float(value):.{digits}f}"


def clamp_float(value: float | None, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def kg_to_liters(weight_kg: float, density_factor: float) -> float:
    if density_factor <= 0:
        raise ValueError("density_factor must be positive")
    return weight_kg / density_factor


def liters_to_kg(liters: float, density_factor: float) -> float:
    return liters * density_factor


def calc_fat_kg(weight_kg: float, fat_percentage: float) -> float:
    return weight_kg * (fat_percentage / 100.0)


def calc_snf_from_clr(clr: float, fat: float, conversion_factor: float) -> float:
    return (clr / 4.0) + (fat * 0.20) + conversion_factor


def calc_snf_kg(weight_kg: float, snf_percentage: float) -> float:
    return weight_kg * (snf_percentage / 100.0)


def resolve_fat_rate(milk_rate: float, fat_ratio_pct: float, fat_reference: float) -> float:
    return milk_rate * fat_ratio_pct / fat_reference


def resolve_snf_rate(milk_rate: float, snf_ratio_pct: float, base_snf_percentage: float) -> float:
    return milk_rate * snf_ratio_pct / base_snf_percentage


def resolve_threshold_rate(value: float, thresholds: Iterable[dict], *, direction: str) -> float:
    parsed: list[tuple[float, float]] = []
    for item in thresholds:
        try:
            threshold = float(item.get("threshold", item.get("step")))
            rate = float(item.get("rate"))
        except (TypeError, ValueError):
            continue
        parsed.append((threshold, rate))

    if not parsed:
        return 0.0

    if direction == "up":
        parsed.sort(key=lambda entry: entry[0])
        applicable = [rate for threshold, rate in parsed if value >= threshold]
        return applicable[-1] if applicable else 0.0

    if direction == "down":
        parsed.sort(key=lambda entry: entry[0], reverse=True)
        for threshold, rate in parsed:
            if value < threshold:
                return rate
        return 0.0

    raise ValueError("direction must be 'up' or 'down'")
