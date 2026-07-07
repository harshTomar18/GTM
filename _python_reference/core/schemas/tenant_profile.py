"""TenantProfile — root configuration object for a single GTM tenant.

Loaded from `tenants/<id>/tenant_profile.yaml`. Extends a vertical pack via the `extends`
field. Injected into every agent's prompt via PromptRenderer (block 1 of the cache).
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

CycleLength = Literal["weekly", "biweekly", "monthly", "quarterly", "custom"]
MotionType = Literal[
    "plg",
    "enterprise_abm",
    "outbound",
    "channel_led",
    "community_led",
    "partner_led",
    "hybrid",
]
SizeBand = Literal["micro", "smb", "mid", "large", "enterprise", "global"]


class CompanyIdentity(BaseModel):
    legal_name: str
    brand_name: str
    url: str | None = None
    founded: int | None = None
    size_band: SizeBand = "mid"
    hq_country: str = "US"
    description_short: str = ""
    description_long: str = ""


class IndustryClassification(BaseModel):
    primary: str
    secondary: list[str] = Field(default_factory=list)
    naics: list[str] = Field(default_factory=list)
    sic: list[str] = Field(default_factory=list)


class BuyingCommittee(BaseModel):
    economic_buyer: str | None = None
    technical_buyer: str | None = None
    user_buyer: str | None = None
    influencers: list[str] = Field(default_factory=list)


class ICPArchetype(BaseModel):
    id: str
    industries: list[str] = Field(default_factory=list)
    company_size: list[str] = Field(default_factory=list)
    geos: list[str] = Field(default_factory=list)
    buying_committee: BuyingCommittee = Field(default_factory=BuyingCommittee)
    committee_complexity: Literal["low", "medium", "high", "extreme"] = "medium"
    deal_size_band: str | None = None
    sales_cycle_days: int | None = None


class LineOfBusiness(BaseModel):
    id: str
    motion: MotionType = "enterprise_abm"
    weight: float = Field(default=1.0, ge=0.0, le=1.0)


class RegulatoryConstraint(BaseModel):
    jurisdiction: str
    regimes: list[str] = Field(default_factory=list)
    content_review_required: bool = False


class RequiredDisclaimer(BaseModel):
    id: str
    trigger: str
    text: str


class BrandVoice(BaseModel):
    archetype: str | None = None
    tone: list[str] = Field(default_factory=list)
    reading_level: str = "grade_10"
    banned_phrases: list[str] = Field(default_factory=list)
    required_disclaimers: list[RequiredDisclaimer] = Field(default_factory=list)


class Geography(BaseModel):
    primary_markets: list[str] = Field(default_factory=lambda: ["US"])
    expansion_markets: list[str] = Field(default_factory=list)


class Languages(BaseModel):
    default: str = "en-US"
    supported: list[str] = Field(default_factory=lambda: ["en-US"])


class Currency(BaseModel):
    default: str = "USD"
    reporting: str = "USD"


class TechStack(BaseModel):
    crm: str | None = None
    marketing_automation: str | None = None
    analytics: str | None = None
    seo: str | None = None
    social: str | None = None
    ad_platforms: list[str] = Field(default_factory=list)
    data_warehouse: str | None = None


class ApprovalRole(BaseModel):
    role: str
    name: str | None = None
    email: str | None = None
    scope: list[str] = Field(default_factory=list)
    notification: list[str] = Field(default_factory=list)


class OperatingCalendar(BaseModel):
    cycle_length: CycleLength = "monthly"
    fiscal_year_start: str = "01-01"
    blackout_dates: list[str] = Field(default_factory=list)


class TenantProfile(BaseModel):
    """Root tenant configuration.

    A single YAML file under `tenants/<id>/tenant_profile.yaml` is parsed into this
    object at startup. Vertical packs are deep-merged underneath via `extends`.
    """

    version: int = 2
    profile_id: str
    extends: str | None = Field(
        default=None,
        description="Vertical pack to inherit defaults from, e.g. 'packs/saas_plg'.",
    )

    company: CompanyIdentity
    industry: IndustryClassification
    lob: list[LineOfBusiness] = Field(default_factory=list)
    icp_archetypes: list[ICPArchetype] = Field(default_factory=list)

    frameworks: list[str] = Field(default_factory=list)
    regulatory_constraints: list[RegulatoryConstraint] = Field(default_factory=list)

    brand_voice: BrandVoice = Field(default_factory=BrandVoice)
    geography: Geography = Field(default_factory=Geography)
    languages: Languages = Field(default_factory=Languages)
    currency: Currency = Field(default_factory=Currency)
    tech_stack: TechStack = Field(default_factory=TechStack)

    approval_roles: list[ApprovalRole] = Field(default_factory=list)
    operating_calendar: OperatingCalendar = Field(default_factory=OperatingCalendar)

    @field_validator("profile_id")
    @classmethod
    def _id_is_kebab(cls, v: str) -> str:
        if not v or not all(c.isalnum() or c in "-_" for c in v):
            raise ValueError(
                "profile_id must be alphanumeric kebab/snake_case (e.g. 'acme-saas-2026')"
            )
        return v

    def primary_motion(self) -> MotionType:
        """Return the highest-weighted motion across LOBs."""
        if not self.lob:
            return "enterprise_abm"
        return max(self.lob, key=lambda x: x.weight).motion

    def primary_icp(self) -> ICPArchetype | None:
        return self.icp_archetypes[0] if self.icp_archetypes else None

    def has_regulatory_review(self) -> bool:
        return any(r.content_review_required for r in self.regulatory_constraints)
