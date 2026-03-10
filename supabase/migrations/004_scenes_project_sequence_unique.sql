-- Required for resumable per-scene upserts in generation pipeline
CREATE UNIQUE INDEX IF NOT EXISTS uq_scenes_project_sequence
  ON public.scenes(project_id, sequence_order);
