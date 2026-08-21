# Automation next-run override contract

`change_mode: next_run` gives a Scenario setting a durable, one-time value without temporarily changing its regular Helper. The Dashboard owns only the write side of this contract; the Home Assistant Automation owns consumption and clearing.

```yaml
settings:
  - id: target-time
    label: Target time
    entity: input_datetime.target_time
    control: auto
    change_mode: next_run
    override:
      value_entity: input_datetime.target_time_override
      active_entity: input_boolean.target_time_override_active
```

The value Helper must use the same entity domain as the regular Helper. The active Helper must be an `input_boolean`.

The Dashboard performs **Just Once** in this order:

1. Write the requested value to `override.value_entity`.
2. Turn on `override.active_entity`.
3. Leave the regular `entity` unchanged.

The consuming Automation must choose the effective value and clear the flag only after it has consumed the override:

```jinja2
{% set effective_target =
  states('input_datetime.target_time_override')
  if is_state('input_boolean.target_time_override_active', 'on')
  else states('input_datetime.target_time')
%}
```

After using `effective_target`, the Automation performs:

```yaml
- action: input_boolean.turn_off
  target:
    entity_id: input_boolean.target_time_override_active
```

The frontend never clears an override using a timer or `last_triggered`, never rewrites an Automation, and never stores override state in browser storage. Existing settings without `change_mode` remain direct updates.
