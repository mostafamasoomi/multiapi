-- PHASE-0 seed: model_aliases + pricing (realistic, free-tier only until paid keys)
-- [COMPLIANCE-RISK] kr/* and gc/* are free/OAuth upstreams; flagged free_tier_eligible.
INSERT INTO model_aliases
  (alias, upstream_model, provider, tier, upstream_cost_input_usd_per_1m,
   upstream_cost_output_usd_per_1m, max_tokens_cap, context_window, free_tier_eligible, is_active)
VALUES
  ('gpt-5.6-luna','gpt-5.6-luna','bynara2','flagship',0.0,0.0,64000,1050000,FALSE,TRUE),
  ('mistral-large','mistral-large','bynara2','mid',0.0,0.0,32000,128000,FALSE,TRUE),
  ('kimi-k2.7-code-free','kimi-k2.7-code-free','bynara2','mid',0.0,0.0,32000,262144,FALSE,TRUE),
  ('kr/claude-sonnet-4.5','claude-sonnet-4-5','anthropic','flagship',3.0,15.0,64000,200000,TRUE,TRUE),
  ('kr/claude-haiku-4.5','claude-haiku-4-5','anthropic','mini',0.8,4.0,64000,200000,TRUE,TRUE),
  ('kr/claude-sonnet-4.5-thinking','claude-sonnet-4-5-thinking','anthropic','flagship',3.0,15.0,64000,200000,TRUE,TRUE),
  ('kr/deepseek-3.2','deepseek-3.2','deepseek','mid',0.5,1.5,32000,128000,TRUE,TRUE),
  ('kr/qwen3-coder-next','qwen3-coder-next','qwen','mid',0.6,1.8,32000,128000,TRUE,TRUE),
  ('kr/glm-5','glm-5','zhipu','mid',0.7,2.1,32000,128000,TRUE,TRUE),
  ('kr/MiniMax-M2.5','MiniMax-M2.5','minimax','mid',0.9,2.7,32000,128000,TRUE,TRUE),
  ('gc/gemini-3.1-pro-preview','gemini-3.1-pro','google','flagship',2.5,12.5,64000,1000000,TRUE,TRUE),
  ('gc/gemini-3-pro-preview','gemini-3-pro','google','flagship',2.0,10.0,64000,1000000,TRUE,TRUE),
  ('gc/gemini-3-flash-preview','gemini-3-flash','google','mini',0.3,1.2,64000,1000000,TRUE,TRUE),
  ('gc/gemini-2.5-pro','gemini-2.5-pro','google','flagship',1.25,10.0,64000,1000000,TRUE,TRUE),
  ('gc/gemini-2.5-flash','gemini-2.5-flash','google','mini',0.15,0.6,64000,1000000,TRUE,TRUE),
  ('gc/gemini-2.5-flash-lite','gemini-2.5-flash-lite','google','mini',0.075,0.3,64000,1000000,TRUE,TRUE),
  ('qd/qmodel_latest','qmodel-latest','qwen','mid',0.4,1.2,32000,128000,TRUE,TRUE);

INSERT INTO pricing (model_alias_id, input_margin_factor, output_margin_factor, gateway_fee_pct, tax_pct, notes)
VALUES
  (1,1.4,1.6,0.015,0.0,'seeded PHASE-0'),
  (2,2.5,2.8,0.015,0.0,'seeded PHASE-0'),
  (3,1.4,1.6,0.015,0.0,'seeded PHASE-0'),
  (4,1.8,2.0,0.015,0.0,'seeded PHASE-0'),
  (5,1.8,2.0,0.015,0.0,'seeded PHASE-0'),
  (6,1.8,2.0,0.015,0.0,'seeded PHASE-0'),
  (7,1.8,2.0,0.015,0.0,'seeded PHASE-0'),
  (8,1.4,1.6,0.015,0.0,'seeded PHASE-0'),
  (9,1.4,1.6,0.015,0.0,'seeded PHASE-0'),
  (10,2.5,2.8,0.015,0.0,'seeded PHASE-0'),
  (11,1.4,1.6,0.015,0.0,'seeded PHASE-0'),
  (12,2.5,2.8,0.015,0.0,'seeded PHASE-0'),
  (13,2.5,2.8,0.015,0.0,'seeded PHASE-0'),
  (14,1.8,2.0,0.015,0.0,'seeded PHASE-0');

