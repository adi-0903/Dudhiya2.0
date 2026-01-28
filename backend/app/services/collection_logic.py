from __future__ import annotations

import math
from typing import Tuple

from ..schemas import (
    CalculationSummary,
    CollectionCalculationRequest,
    CollectionCalculationResponse,
    CollectionPayload,
    RateChartPoint,
    RateChartSnapshot,
)
from .collection_math import (
    calc_fat_kg,
    calc_snf_from_clr,
    calc_snf_kg,
    kg_to_liters,
    resolve_fat_rate,
    resolve_snf_rate,
    resolve_threshold_rate,
    round_str,
)

FAT_SNF_RATIO_MAP: dict[str, Tuple[int, int]] = {
    "60_40": (60, 40),
    "52_48": (52, 48),
}

INTERNAL_TO_API_RATIO = {
    "60_40": "60/40",
    "52_48": "52/48",
}


def _floor_two(value: float) -> float:
    return math.floor(value * 100) / 100


def _format_milk_type(milk_type: str) -> str:
    normalized = milk_type.strip().lower().replace(" ", "_")
    if normalized in {"cow+buffalo", "cow_buffalo"}:
        return "cow_buffalo"
    return normalized


def _calculate_average_rate(amount: float, measured: str, kg: float, liters: float, fat_percentage: float) -> float:
    if measured == "kg":
        return amount / kg if kg else 0.0

    if measured == "liters":
        if fat_percentage > 0:
            return amount / kg if kg else 0.0
        return amount / liters if liters else 0.0

    return amount / kg if kg else 0.0


def _build_rate_chart_snapshot(request: CollectionCalculationRequest) -> RateChartSnapshot | None:
    if not request.include_rate_chart_snapshot:
        return None

    fat_points = [
        RateChartPoint(step=float(item.threshold), rate=float(item.rate))
        for item in request.fat_step_up_thresholds
    ]
    snf_points = [
        RateChartPoint(step=float(item.threshold), rate=float(item.rate))
        for item in request.snf_step_down_thresholds
    ]

    if not fat_points and not snf_points:
        return None

    return RateChartSnapshot(
        fat_step_up_rates=fat_points,
        snf_step_down_rates=snf_points,
    )


def calculate_collection(request: CollectionCalculationRequest) -> CollectionCalculationResponse:
    milk_type = _format_milk_type(request.milk_type)
    milk_rate = float(request.milk_rate)

    weight_kg = request.weight_kg
    liters = request.liters

    if weight_kg is None and liters is not None:
        weight_kg = liters * request.density_factor

    if liters is None and weight_kg is not None:
        liters = kg_to_liters(weight_kg, request.density_factor)

    if weight_kg is None or liters is None:
        raise ValueError("Unable to resolve weight and liters from provided measurements")

    measured = "liters"
    base_snf_percentage = float(request.base_snf_percentage)
    fat_ratio_pct, snf_ratio_pct = FAT_SNF_RATIO_MAP.get(request.fat_snf_ratio, (60, 40))
    fat_percentage = float(request.fat_percentage or 0)
    snf_percentage = request.snf_percentage
    clr_value = request.clr

    if request.rate_type == request.rate_type.KG_ONLY:
        measured = "kg"
    elif request.rate_type == request.rate_type.LITERS_ONLY:
        measured = "liters"

    if request.rate_type in {request.rate_type.FAT_SNF, request.rate_type.FAT_CLR}:
        if request.radio_selection.clr and clr_value is not None:
            snf_percentage = calc_snf_from_clr(
                float(clr_value),
                fat_percentage,
                float(request.clr_conversion_factor),
            )
        elif snf_percentage is None:
            snf_percentage = base_snf_percentage
    else:
        fat_percentage = 0.0
        snf_percentage = 0.0
        clr_value = None

    snf_percentage = float(snf_percentage)

    fat_kg = _floor_two(calc_fat_kg(weight_kg, fat_percentage))
    snf_kg = _floor_two(calc_snf_kg(weight_kg, snf_percentage))

    fat_rate = _floor_two(resolve_fat_rate(milk_rate, fat_ratio_pct, 6.5)) if fat_percentage else 0.0
    snf_rate = _floor_two(resolve_snf_rate(milk_rate, snf_ratio_pct, base_snf_percentage)) if snf_percentage else 0.0

    amount = 0.0
    final_rate = milk_rate
    fat_step_up_rate_value = 0.0
    snf_step_down_rate_value = 0.0
    fat_snapshot_rate = None
    snf_snapshot_rate = None

    notes: list[str] = []

    if request.rate_type in {request.rate_type.KG_ONLY, request.rate_type.LITERS_ONLY}:
        amount = weight_kg * milk_rate
    else:
        if request.is_pro_rata:
            applied_fat_rate = resolve_threshold_rate(
                fat_percentage,
                (item.model_dump() for item in request.fat_step_up_thresholds),
                direction="up",
            )
            applied_snf_rate = resolve_threshold_rate(
                snf_percentage,
                (item.model_dump() for item in request.snf_step_down_thresholds),
                direction="down",
            )

            fat_step_up_rate_value = float(applied_fat_rate) * 10 if applied_fat_rate else 0.0
            snf_step_down_rate_value = float(applied_snf_rate) * 10 if applied_snf_rate else 0.0

            fat_snapshot_rate = applied_fat_rate or 0.0
            snf_snapshot_rate = applied_snf_rate or 0.0

            fat_adjustment = (fat_percentage - 6.5) * fat_step_up_rate_value
            snf_adjustment = (snf_percentage - base_snf_percentage) * snf_step_down_rate_value
            final_rate = milk_rate + fat_adjustment + snf_adjustment
            amount = final_rate * weight_kg
            notes.append("Pro-rata adjustments applied")
        else:
            fat_component = _floor_two(fat_kg * fat_rate)
            snf_component = _floor_two(snf_kg * snf_rate)
            amount = fat_component + snf_component

    solid_weight = amount / milk_rate if milk_rate else 0.0

    payload = CollectionPayload(
        collection_time=request.collection_time,
        milk_type=milk_type,
        customer=request.customer_id,
        collection_date=request.collection_date.isoformat(),
        measured=measured,
        liters=round_str(liters, 3),
        kg=round_str(weight_kg, 3),
        fat_percentage=round_str(fat_percentage, 3),
        fat_kg=round_str(fat_kg, 3),
        clr=round_str(clr_value, 3) if clr_value is not None else "",
        snf_percentage=round_str(snf_percentage, 3),
        snf_kg=round_str(snf_kg, 3),
        fat_rate=round_str(fat_rate, 3),
        snf_rate=round_str(snf_rate, 3),
        milk_rate=round_str(milk_rate, 3),
        amount=round_str(amount, 3 if not request.is_pro_rata else 2),
        solid_weight=round_str(solid_weight, 3),
        base_snf_percentage=round_str(base_snf_percentage, 3),
        fat_step_up_rate=round_str(fat_snapshot_rate, 3) if request.is_pro_rata else None,
        snf_step_down_rate=round_str(snf_snapshot_rate, 3) if request.is_pro_rata else None,
        is_pro_rata=request.is_pro_rata or None,
        fat_snf_ratio=INTERNAL_TO_API_RATIO.get(request.fat_snf_ratio) if request.is_pro_rata else None,
        clr_conversion_factor=round_str(request.clr_conversion_factor, 2) if request.is_pro_rata else None,
        pro_rata_collection_rate_chart=_build_rate_chart_snapshot(request) if request.is_pro_rata else None,
    )

    summary = CalculationSummary(
        measured=measured,
        milk_rate=payload.milk_rate,
        average_rate=round_str(
            _calculate_average_rate(
                amount,
                measured,
                weight_kg,
                liters,
                fat_percentage,
            ),
            3,
        ),
        is_pro_rata_applied=request.is_pro_rata,
        notes=notes,
    )

    return CollectionCalculationResponse(payload=payload, summary=summary)
