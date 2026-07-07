# Example tenant baseline (T1 memory)

Files in this directory are long-lived tenant memory. They're loaded by the ContextBus
as T1 (years) tier. Files written during cycle runs live under `../cycles/<id>/` and are
T2 (months) tier.

## Convention

| File | Purpose | Owned by |
|---|---|---|
| `brand_voice_examples.md` | Real-world examples of approved tone | CMO |
| `messaging_master.md` | Locked messaging architecture across cycles | CMO |
| `icp_personas.md` | Validated persona set (T1 — refreshed yearly or less) | CMO + Sales Leader |
| `competitor_profiles.md` | Long-running competitor watchlist | Sales Enablement |
| `proof_point_library.md` | Approved customer outcomes, stats, case studies | Customer Success + CMO |
| `claim_library.md` | Pre-approved claims with citation sources | SME + Legal |
| `banned_claims.md` | Explicitly disallowed statements | Legal |

For the `_example` tenant, these are intentionally minimal — see real tenants for
production-quality content.
