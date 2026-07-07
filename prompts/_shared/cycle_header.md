{# Cycle context block — block 2 of the prompt cache.

   Injected when an agent runs inside a live cycle. Provides this-cycle context
   (objective, dossier excerpts, narrative lock excerpts, prior outputs) so
   downstream agents don't have to re-derive it.
#}
# Cycle Context

- **Cycle ID:** {{ cycle.cycle_id | default("(unset)") }}
- **Cycle objective:** {{ cycle.objective | default("(not yet defined)") }}
- **Cycle length:** {{ profile.operating_calendar.cycle_length }}

{% if cycle.dossier_summary %}## Research Dossier (compressed)

{{ cycle.dossier_summary }}
{% endif %}

{% if cycle.narrative_lock_summary %}## Narrative Lock (current cycle)

{{ cycle.narrative_lock_summary }}
{% endif %}

{% if cycle.prior_outputs %}## Prior Cycle Outputs Available

{% for k, v in cycle.prior_outputs.items() %}- `{{ k }}`: {{ v }}
{% endfor %}{% endif %}
