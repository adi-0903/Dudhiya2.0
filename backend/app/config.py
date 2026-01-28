from pydantic import BaseModel
from typing import Literal


class AppConfig(BaseModel):
    app_name: str = "dudhiya-collection-api"
    debug: bool = True
    default_density_factor: float = 1.02
    default_fat_reference: float = 6.5
    default_base_snf: float = 9.0
    default_fat_ratio_pct: Literal[60, 52] = 60
    default_snf_ratio_pct: Literal[40, 48] = 40


CONFIG = AppConfig()
