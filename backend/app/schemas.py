from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Literal, Optional, List

from pydantic import BaseModel, Field, model_validator


class RateType(str, Enum):
    FAT_SNF = "fat_snf"
    FAT_CLR = "fat_clr"
    KG_ONLY = "kg_only"
    LITERS_ONLY = "liters_only"


class RadioSelection(BaseModel):
    snf: bool = True
    clr: bool = False

    @property
    def active(self) -> str:
        if self.snf:
            return "snf"
        if self.clr:
            return "clr"
        return "none"


class ThresholdInput(BaseModel):
    threshold: float
    rate: float


class RateChartPoint(BaseModel):
    step: float
    rate: float


class RateChartSnapshot(BaseModel):
    fat_step_up_rates: List[RateChartPoint] = Field(default_factory=list)
    snf_step_down_rates: List[RateChartPoint] = Field(default_factory=list)


class CollectionCalculationRequest(BaseModel):
    customer_id: int = Field(..., description="Internal customer identifier")
    milk_type: str = Field(..., description="Accepts cow, buffalo or cow_buffalo")
    collection_time: Literal["morning", "evening"]
    collection_date: date
    rate_type: RateType
    milk_rate: float
    weight_kg: Optional[float] = Field(None, description="Measured weight in KG")
    liters: Optional[float] = Field(None, description="Measured liters when already known")
    fat_percentage: Optional[float] = None
    snf_percentage: Optional[float] = None
    clr: Optional[float] = None
    radio_selection: RadioSelection = Field(default_factory=RadioSelection)
    base_snf_percentage: float = 9.0
    fat_snf_ratio: Literal["60_40", "52_48"] = "60_40"
    clr_conversion_factor: float = 0.14
    density_factor: float = Field(1.02, description="Used to translate kg to liters")
    is_pro_rata: bool = False
    fat_step_up_thresholds: List[ThresholdInput] = Field(default_factory=list)
    snf_step_down_thresholds: List[ThresholdInput] = Field(default_factory=list)
    include_rate_chart_snapshot: bool = True

    @model_validator(mode="after")
    def validate_measurements(self):
        if self.weight_kg is None and self.liters is None:
            raise ValueError("Either weight_kg or liters must be provided")

        if self.rate_type in {RateType.FAT_SNF, RateType.FAT_CLR}:
            if self.fat_percentage is None:
                raise ValueError("fat_percentage is required for fat-based calculations")

            if self.radio_selection.snf and self.snf_percentage is None:
                raise ValueError("snf_percentage is required when SNF radio is active")

            if self.radio_selection.clr and self.clr is None:
                raise ValueError("clr value is required when CLR radio is active")

        if self.is_pro_rata and not self.fat_step_up_thresholds:
            raise ValueError("Provide at least one fat step-up threshold for pro-rata calculations")

        return self


class CollectionPayload(BaseModel):
    collection_time: str
    milk_type: str
    customer: int
    collection_date: str
    measured: Literal["kg", "liters"]
    liters: str
    kg: str
    fat_percentage: str
    fat_kg: str
    clr: str | None = None
    snf_percentage: str
    snf_kg: str
    fat_rate: str
    snf_rate: str
    milk_rate: str
    amount: str
    solid_weight: str
    base_snf_percentage: str
    fat_step_up_rate: Optional[str] = None
    snf_step_down_rate: Optional[str] = None
    is_pro_rata: Optional[bool] = None
    fat_snf_ratio: Optional[str] = None
    clr_conversion_factor: Optional[str] = None
    pro_rata_collection_rate_chart: Optional[RateChartSnapshot] = None


class CalculationSummary(BaseModel):
    measured: Literal["kg", "liters"]
    milk_rate: str
    average_rate: str
    is_pro_rata_applied: bool
    notes: List[str] = Field(default_factory=list)


class CollectionCalculationResponse(BaseModel):
    payload: CollectionPayload
    summary: CalculationSummary
